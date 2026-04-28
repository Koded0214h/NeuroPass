"""
Anchor program interface for NeuroPass.

Builds and sends the three on-chain instructions that anchor a verified skill
credential to the Solana blockchain:

  submit_skill       → creates SkillRecord PDA (minter acts as proxy user)
  verify_skill       → marks SkillRecord as Verified (backend verifier keypair)
  record_credential  → creates CredentialRecord PDA linking the NFT mint
"""
import struct
import hashlib
import json
import re
from django.conf import settings
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta
from solders.system_program import ID as SYS_PROGRAM_ID
from solana.rpc.api import Client
from solders.transaction import Transaction

PROGRAM_ID = Pubkey.from_string("F11FFZasp1pEGDaHoguWokQbenh7TLc5SWTz7pbDpVQD")

# Instruction discriminators (first 8 bytes of sha256("global:<ix_name>"))
_DISC_SUBMIT_SKILL       = bytes([50, 145, 80, 27, 159, 73, 213, 147])
_DISC_VERIFY_SKILL       = bytes([82, 81, 232, 37, 181, 16, 42, 230])
_DISC_RECORD_CREDENTIAL  = bytes([0, 119, 136, 142, 105, 43, 235, 95])

# Registry account layout offsets
_REGISTRY_SKILL_COUNT_OFFSET = 8 + 32  # discriminator + admin pubkey


# ─── keypair helpers ──────────────────────────────────────────────────────────

def _load_keypair(env_value: str, name: str) -> Keypair:
    """Mirrors the loading logic in web3.py — supports base58 and JSON byte arrays."""
    raw = env_value.strip()
    try:
        if len(raw) > 64 and "[" not in raw and "," not in raw:
            return Keypair.from_base58_string(raw)
        nums = re.findall(r'\d+', raw)
        if len(nums) < 64:
            raise ValueError(f"Found only {len(nums)} bytes, need 64.")
        return Keypair.from_bytes(bytes([int(n) for n in nums]))
    except Exception as e:
        raise ValueError(f"Could not parse {name}: {e}")


def _load_minter() -> Keypair:
    return _load_keypair(settings.WALLET_SECRET_KEY, "WALLET_SECRET_KEY")


def _load_verifier() -> Keypair:
    return _load_keypair(settings.SOLANA_VERIFIER_KEY, "SOLANA_VERIFIER_KEY")


# ─── PDA derivation ───────────────────────────────────────────────────────────

def _registry_pda() -> Pubkey:
    pda, _ = Pubkey.find_program_address([b"registry"], PROGRAM_ID)
    return pda


def _verifier_record_pda(verifier: Pubkey) -> Pubkey:
    pda, _ = Pubkey.find_program_address([b"verifier", bytes(verifier)], PROGRAM_ID)
    return pda


def _skill_record_pda(user: Pubkey, skill_id: int) -> Pubkey:
    pda, _ = Pubkey.find_program_address(
        [b"skill", bytes(user), struct.pack("<Q", skill_id)],
        PROGRAM_ID,
    )
    return pda


def _credential_record_pda(mint: Pubkey) -> Pubkey:
    pda, _ = Pubkey.find_program_address([b"credential", bytes(mint)], PROGRAM_ID)
    return pda


# ─── Borsh serialisation ─────────────────────────────────────────────────────

def _borsh_str(s: str) -> bytes:
    enc = s.encode("utf-8")
    return struct.pack("<I", len(enc)) + enc


# ─── On-chain skill_count fetch ───────────────────────────────────────────────

def _fetch_skill_count(client: Client) -> int:
    registry_key = _registry_pda()
    resp = client.get_account_info(registry_key)
    data = resp.value.data
    skill_count = struct.unpack_from("<Q", data, _REGISTRY_SKILL_COUNT_OFFSET)[0]
    return skill_count


# ─── Instruction builders ─────────────────────────────────────────────────────

def _submit_skill_ix(
    registry: Pubkey,
    skill_record: Pubkey,
    user: Pubkey,
    skill_name: str,
    proof_hash: bytes,
    ipfs_cid: str,
) -> Instruction:
    data = (
        _DISC_SUBMIT_SKILL
        + _borsh_str(skill_name[:64])
        + proof_hash[:32]
        + _borsh_str(ipfs_cid[:64])
    )
    accounts = [
        AccountMeta(pubkey=registry,    is_signer=False, is_writable=True),
        AccountMeta(pubkey=skill_record, is_signer=False, is_writable=True),
        AccountMeta(pubkey=user,         is_signer=True,  is_writable=True),
        AccountMeta(pubkey=SYS_PROGRAM_ID, is_signer=False, is_writable=False),
    ]
    return Instruction(accounts=accounts, data=data, program_id=PROGRAM_ID)


def _verify_skill_ix(
    verifier_record: Pubkey,
    skill_record: Pubkey,
    verifier: Pubkey,
    approve: bool,
) -> Instruction:
    decision = b"\x00" if approve else b"\x01"
    comment_hash = b"\x00" * 32  # placeholder — comment stored in Django DB
    data = _DISC_VERIFY_SKILL + decision + comment_hash
    accounts = [
        AccountMeta(pubkey=verifier_record, is_signer=False, is_writable=True),
        AccountMeta(pubkey=skill_record,    is_signer=False, is_writable=True),
        AccountMeta(pubkey=verifier,        is_signer=True,  is_writable=False),
    ]
    return Instruction(accounts=accounts, data=data, program_id=PROGRAM_ID)


def _record_credential_ix(
    skill_record: Pubkey,
    mint: Pubkey,
    credential_record: Pubkey,
    user: Pubkey,
    metadata_uri: str,
) -> Instruction:
    data = _DISC_RECORD_CREDENTIAL + _borsh_str(metadata_uri[:128])
    accounts = [
        AccountMeta(pubkey=skill_record,      is_signer=False, is_writable=False),
        AccountMeta(pubkey=mint,              is_signer=False, is_writable=False),
        AccountMeta(pubkey=credential_record, is_signer=False, is_writable=True),
        AccountMeta(pubkey=user,              is_signer=True,  is_writable=True),
        AccountMeta(pubkey=SYS_PROGRAM_ID,   is_signer=False, is_writable=False),
    ]
    return Instruction(accounts=accounts, data=data, program_id=PROGRAM_ID)


# ─── Public API ───────────────────────────────────────────────────────────────

def anchor_credential_on_chain(
    skill_name: str,
    proof_hash_hex: str,
    ipfs_cid: str,
    mint_pubkey: Pubkey,
    metadata_uri: str,
) -> str:
    """
    Calls the NeuroPass Anchor program to:
      1. submit_skill  — records the skill + proof hash as a SkillRecord PDA
      2. verify_skill  — marks it Verified using the backend verifier keypair
      3. record_credential — creates a CredentialRecord PDA linking the NFT mint

    Returns the transaction signature of the final record_credential tx.
    """
    client = Client(settings.SOLANA_RPC, timeout=60)
    minter = _load_minter()
    verifier = _load_verifier()

    minter_pubkey   = minter.pubkey()
    verifier_pubkey = verifier.pubkey()
    proof_hash_bytes = bytes.fromhex(proof_hash_hex)

    registry_key     = _registry_pda()
    verifier_rec_key = _verifier_record_pda(verifier_pubkey)
    cred_record_key  = _credential_record_pda(mint_pubkey)

    # ── Tx 1: submit_skill ────────────────────────────────────────────────────
    skill_id        = _fetch_skill_count(client)
    skill_record_key = _skill_record_pda(minter_pubkey, skill_id)

    bh = client.get_latest_blockhash().value.blockhash
    tx1 = Transaction(recent_blockhash=bh, fee_payer=minter_pubkey)
    tx1.add(_submit_skill_ix(
        registry=registry_key,
        skill_record=skill_record_key,
        user=minter_pubkey,
        skill_name=skill_name,
        proof_hash=proof_hash_bytes,
        ipfs_cid=ipfs_cid,
    ))
    client.send_transaction(tx1, minter)

    # ── Tx 2: verify_skill ────────────────────────────────────────────────────
    bh = client.get_latest_blockhash().value.blockhash
    tx2 = Transaction(recent_blockhash=bh, fee_payer=minter_pubkey)
    tx2.add(_verify_skill_ix(
        verifier_record=verifier_rec_key,
        skill_record=skill_record_key,
        verifier=verifier_pubkey,
        approve=True,
    ))
    # Minter pays fees; verifier signs as authority — both must sign
    client.send_transaction(tx2, minter, verifier)

    # ── Tx 3: record_credential ───────────────────────────────────────────────
    bh = client.get_latest_blockhash().value.blockhash
    tx3 = Transaction(recent_blockhash=bh, fee_payer=minter_pubkey)
    tx3.add(_record_credential_ix(
        skill_record=skill_record_key,
        mint=mint_pubkey,
        credential_record=cred_record_key,
        user=minter_pubkey,
        metadata_uri=metadata_uri,
    ))
    resp = client.send_transaction(tx3, minter)
    return str(resp.value)
