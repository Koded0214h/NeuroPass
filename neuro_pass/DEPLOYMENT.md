# NeuroPass — Blockchain Deployment Guide

## How the backend and blockchain connect

```
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND (Django)                      │
│                                                              │
│  PINATA_JWT ──────────────► Pinata IPFS                      │
│                              uploads proof file + metadata   │
│                                        │                     │
│  GOOGLE_API_KEY ──────────► Gemini AI  │                     │
│                              tags & skill level              │
│                                        │                     │
│  YARNGPT_API_KEY ─────────► YarnGPT    │                     │
│                              TTS / STT │                     │
│                                        ▼                     │
│  WALLET_SECRET_KEY ───────► Minter wallet                    │
│  SOLANA_RPC ──────────────► Solana cluster ◄── Anchor program│
│                              mints NFT + calls               │
│                              record_credential               │
└─────────────────────────────────────────────────────────────┘
```

---

## Environment variables — what each key does

| Variable | Where it goes | What it does |
|---|---|---|
| `SECRET_KEY` | Django | Signs session tokens and cookies |
| `DATABASE_URL` | Django | NeonDB (Postgres) connection string |
| `PINATA_JWT` | `core/services.py` | Uploads proof files **and** NFT metadata JSON to IPFS via Pinata |
| `GOOGLE_API_KEY` | `core/ai.py` | Calls Gemini 2.5 Flash to generate skill tags and refine descriptions |
| `YARNGPT_API_URL` | `core/ai.py` | Base URL for the YarnGPT Nigerian-accent TTS/STT service |
| `YARNGPT_API_KEY` | `core/ai.py` | Auth token for YarnGPT requests |
| `SOLANA_RPC` | `core/web3.py` | Which cluster the backend talks to (`devnet` or `http://127.0.0.1:8899` locally) |
| `WALLET_SECRET_KEY` | `core/web3.py` | The minter's private key — pays rent, signs mint + metadata transactions |

### The Anchor program ID
```
F11FFZasp1pEGDaHoguWokQbenh7TLc5SWTz7pbDpVQD
```
This is what the backend will pass when calling `record_credential` to anchor the minted NFT on-chain. It is stored in `neuro_pass/Anchor.toml` and in the compiled IDL at `neuro_pass/target/idl/neuro_pass.json`.

---

## Option A — Run everything locally

### Prerequisites
```bash
# Verify all tools are present
anchor --version      # 0.31.x
solana --version      # 1.18+ or 3.x
rustc --version       # 1.75+
node --version        # 18+
```

### 1. Start the local validator + deploy in one command
```bash
cd neuro_pass
bash scripts/run_local.sh
```

The script will:
1. Kill any existing `solana-test-validator`
2. Start a fresh validator at `http://127.0.0.1:8899`
3. Airdrop SOL to your local wallet
4. Build and deploy the Anchor program
5. Run the full 11-test suite
6. Print the exact `.env` lines you need to patch into the backend

### 2. Point the backend at localnet

Patch `backend/.env`:
```env
SOLANA_RPC=http://127.0.0.1:8899
WALLET_SECRET_KEY=<printed by run_local.sh — your local keypair bytes>
```

Keep every other variable the same (Pinata, Gemini, YarnGPT all work against their real APIs even in local mode).

### 3. Start the backend
```bash
cd backend
source ../.venv/bin/activate
python manage.py runserver
```

---

## Option B — Deploy to Devnet

### 1. Fund your wallet on devnet
```bash
solana config set --url devnet
solana airdrop 2
solana balance
```

### 2. Build
```bash
cd neuro_pass
anchor build
```

### 3. Deploy
```bash
anchor deploy --provider.cluster devnet
```

The CLI will print the program ID. If it matches `F11FFZasp1pEGDaHoguWokQbenh7TLc5SWTz7pbDpVQD` you are done. If Anchor generated a new keypair and the ID differs, update `Anchor.toml` and `declare_id!()` in `programs/neuro_pass/src/lib.rs`, then rebuild and redeploy.

### 4. Point the backend at devnet

`backend/.env` (these are your current live values):
```env
SOLANA_RPC=https://api.devnet.solana.com
WALLET_SECRET_KEY=45DRA57vkR6B7kxC6sgGEKPuUpJM2hcuy8r5tQVVs3oFnRELFzN3LGzFynGfB2Ujz62NqYErtijUJcix6Z1rncQu
```

### 5. Initialize the registry (one-time, per deployment)

After deploying, call `initialize` once to create the on-chain `Registry` PDA. You can do this with the Anchor TS client or a small script:

```ts
// scripts/init_registry.ts  (run with: npx ts-node scripts/init_registry.ts)
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import idl from "../target/idl/neuro_pass.json";

const PROGRAM_ID = new PublicKey("F11FFZasp1pEGDaHoguWokQbenh7TLc5SWTz7pbDpVQD");

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = new anchor.Program(idl as anchor.Idl, provider);

  const [registry] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    PROGRAM_ID
  );

  const tx = await program.methods
    .initialize()
    .accounts({
      registry,
      admin: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Registry initialised:", tx);
  console.log("Registry PDA:", registry.toBase58());
}

main().catch(console.error);
```

Run it:
```bash
cd neuro_pass
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \
ANCHOR_WALLET=~/.config/solana/id.json \
npx ts-node scripts/init_registry.ts
```

---

## Flow: what happens when a user submits a skill

```
1. User POSTs to /api/skill/submit/
   └─► Django hashes file (SHA-256) → uploads to Pinata IPFS
   └─► Gemini tags the skill

2. Verifier PATCHes /api/skill/<id>/verify/
   └─► Django creates Verification record
   └─► If approved:
         a. Django mints SPL NFT via WALLET_SECRET_KEY (core/web3.py)
         b. Django uploads metadata JSON to Pinata
         c. Django stores Credential in DB
         d. (next step) Django calls Anchor `record_credential`
            to anchor mint + proof hash permanently on-chain

3. Anyone GETs /api/credential/<mint_address>/
   └─► Django reads CredentialRecord from chain
   └─► Returns: skill_name, proof_hash, verifier, metadata_uri
```

---

## Wiring `record_credential` into the backend

`backend/core/web3.py` already mints the NFT. After getting the `mint_pubkey` and `tx_signature`, add this call to anchor the mint on-chain:

```python
# At the bottom of mint_credential_nft(), after the NFT send_transaction call:
from solana.rpc.api import Client
# ... existing code ...

# After: tx_signature = response.value
# Add:
_anchor_record_credential(
    client, minter, mint_pubkey, skill_record_pubkey, metadata_uri
)
```

The Anchor IDL is at `neuro_pass/target/idl/neuro_pass.json` — use `anchorpy` or raw instruction building in solders to call it from Python.

---

## Deployed addresses (update after each deploy)

| Network | Program ID | Registry PDA | Status |
|---|---|---|---|
| Localnet | `F11FFZasp1pEGDaHoguWokQbenh7TLc5SWTz7pbDpVQD` | derived | run `run_local.sh` |
| Devnet | `F11FFZasp1pEGDaHoguWokQbenh7TLc5SWTz7pbDpVQD` | TBD after `init_registry.ts` | not yet deployed |

---

## Verify the deployment worked

```bash
# Check the program exists on-chain
solana program show F11FFZasp1pEGDaHoguWokQbenh7TLc5SWTz7pbDpVQD --url devnet

# Check the registry PDA was created (after running init_registry.ts)
solana account <registry-pda-address> --url devnet
```
