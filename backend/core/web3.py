import json
import struct
from django.conf import settings
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta
from solders.system_program import ID as SYS_PROGRAM_ID
from solana.rpc.api import Client
from solana.rpc.types import TxOpts
from solders.transaction import Transaction
from spl.token.instructions import (
    InitializeMintParams, initialize_mint,
    MintToParams, mint_to,
    get_associated_token_address,
    create_associated_token_account,
)
from spl.token.constants import TOKEN_PROGRAM_ID
from .services import upload_to_ipfs

METADATA_PROGRAM_ID = Pubkey.from_string("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")


def _pack_str(s: str) -> bytes:
    encoded = s.encode("utf-8")
    return struct.pack("<I", len(encoded)) + encoded


def _build_create_metadata_v3_data(name: str, symbol: str, uri: str) -> bytes:
    # Borsh layout for CreateMetadataAccountV3 (discriminant = 33)
    return (
        struct.pack("<B", 33)
        + _pack_str(name)
        + _pack_str(symbol)
        + _pack_str(uri)
        + struct.pack("<H", 0)  # seller_fee_basis_points
        + b"\x00"               # creators: None
        + b"\x00"               # collection: None
        + b"\x00"               # uses: None
        + b"\x01"               # is_mutable: true
        + b"\x00"               # collection_details: None
    )


def _create_metadata_instruction(
    metadata_account: Pubkey,
    mint: Pubkey,
    mint_authority: Pubkey,
    payer: Pubkey,
    update_authority: Pubkey,
    name: str,
    symbol: str,
    uri: str,
) -> Instruction:
    keys = [
        AccountMeta(pubkey=metadata_account, is_signer=False, is_writable=True),
        AccountMeta(pubkey=mint, is_signer=False, is_writable=False),
        AccountMeta(pubkey=mint_authority, is_signer=True, is_writable=False),
        AccountMeta(pubkey=payer, is_signer=True, is_writable=True),
        AccountMeta(pubkey=update_authority, is_signer=False, is_writable=False),
        AccountMeta(pubkey=SYS_PROGRAM_ID, is_signer=False, is_writable=False),
    ]
    return Instruction(
        accounts=keys,
        data=_build_create_metadata_v3_data(name, symbol, uri),
        program_id=METADATA_PROGRAM_ID,
    )


def _upload_metadata_to_ipfs(metadata_json: str) -> str:
    return upload_to_ipfs(metadata_json.encode("utf-8"), "metadata.json")


def mint_credential_nft(skill):
    client = Client(settings.SOLANA_RPC, timeout=60)
    
    # Ultra-robust key parsing: Supports Base58 string or Byte Array
    try:
        raw_key = settings.WALLET_SECRET_KEY.strip()
        if len(raw_key) > 64 and "[" not in raw_key and "," not in raw_key:
            # Likely Base58 string
            minter = Keypair.from_base58_string(raw_key)
        else:
            # Likely byte array
            import re
            numbers = re.findall(r'\d+', raw_key)
            if len(numbers) < 64:
                raise ValueError(f"Found only {len(numbers)} bytes, need 64.")
            key_bytes = bytes([int(n) for n in numbers])
            minter = Keypair.from_bytes(key_bytes)
    except Exception as e:
        raise ValueError(f"Could not parse WALLET_SECRET_KEY: {e}. Paste your full Phantom Private Key or 64-byte array.")

    metadata = {
        "name": f"NeuroPass: {skill.name}",
        "symbol": "NPASS",
        "description": f"Verified skill: {skill.name}",
        "image": "https://via.placeholder.com/200",
        "attributes": [
            {"trait_type": "Skill", "value": skill.name},
            {"trait_type": "Proof Hash", "value": skill.file_sha256},
            {"trait_type": "Verifier", "value": skill.verification.verifier.username},
        ],
    }
    meta_ipfs_hash = _upload_metadata_to_ipfs(json.dumps(metadata))
    metadata_uri = f"ipfs://{meta_ipfs_hash}"

    from solders.system_program import create_account, CreateAccountParams

    mint_keypair = Keypair()
    mint_pubkey = mint_keypair.pubkey()
    minter_pubkey = minter.pubkey()

    # Get rent-exempt balance for a Mint account (82 bytes)
    rent_resp = client.get_minimum_balance_for_rent_exemption(82)
    lamports = rent_resp.value

    create_mint_account_ix = create_account(
        CreateAccountParams(
            from_pubkey=minter_pubkey,
            to_pubkey=mint_pubkey,
            lamports=lamports,
            space=82,
            owner=TOKEN_PROGRAM_ID,
        )
    )

    create_mint_ix = initialize_mint(
        InitializeMintParams(
            decimals=0,
            program_id=TOKEN_PROGRAM_ID,
            mint=mint_pubkey,
            mint_authority=minter_pubkey,
            freeze_authority=minter_pubkey,
        )
    )
    
    # ... rest of derivation logic ...
    metadata_pda, _ = Pubkey.find_program_address(
        [b"metadata", bytes(METADATA_PROGRAM_ID), bytes(mint_pubkey)],
        METADATA_PROGRAM_ID,
    )
    ata = get_associated_token_address(minter_pubkey, mint_pubkey)

    create_ata_ix = create_associated_token_account(
        payer=minter_pubkey,
        owner=minter_pubkey,
        mint=mint_pubkey,
    )
    mint_to_ix = mint_to(
        MintToParams(
            program_id=TOKEN_PROGRAM_ID,
            mint=mint_pubkey,
            dest=ata,
            mint_authority=minter_pubkey,
            amount=1,
            signers=[],
        )
    )
    create_meta_ix = _create_metadata_instruction(
        metadata_account=metadata_pda,
        mint=mint_pubkey,
        mint_authority=minter_pubkey,
        payer=minter_pubkey,
        update_authority=minter_pubkey,
        name=metadata["name"][:32],
        symbol=metadata["symbol"],
        uri=metadata_uri,
    )

    recent_bh = client.get_latest_blockhash().value.blockhash
    txn = Transaction(recent_blockhash=recent_bh, fee_payer=minter_pubkey)
    txn.add(create_mint_account_ix)
    txn.add(create_mint_ix)
    txn.add(create_ata_ix)
    txn.add(mint_to_ix)
    txn.add(create_meta_ix)

    opts = TxOpts(skip_preflight=True, preflight_commitment='processed', skip_confirmation=False)
    response = client.send_transaction(txn, minter, mint_keypair, opts=opts)
    tx_signature = response.value

    return str(mint_pubkey), str(tx_signature), metadata_uri
