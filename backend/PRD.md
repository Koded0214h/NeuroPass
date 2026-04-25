# NEUROPASS — PHASED PRODUCT REQUIREMENTS DOCUMENT

**Product Name:** NeuroPass  
**Tagline:** From Invisible Talent to Verifiable Opportunity  
**Version:** 1.0‑PHASED (Hackathon → Production)

---

## 1. PRODUCT OVERVIEW & PROBLEM STATEMENT *(unchanged)*

**Objective:** Build a verifiable skill identity system on Solana that captures offline skills, anchors proof on‑chain, and connects users to opportunities.

**Core Insight:**  
Africa doesn’t have a talent problem – it has a recognition, trust, and access problem. NeuroPass fixes this.

*(The full problem statement and user definitions remain as in the original PRD.)*

---

## 2. SOLUTION OVERVIEW

NeuroPass provides:

- Capture of real‑world skills through digital submission
- Trusted verification by vetted validators
- Cryptographic proof hashing & decentralized storage (IPFS)
- On‑chain credentials (NFTs) on Solana Devnet
- Public verification of skills
- Exportable verified profiles for opportunity platforms

---

## 3. PHASED IMPLEMENTATION PLAN

The development is split into two distinct phases:

- **Phase 1 – Hackathon MVP** (Deliverable for OnchainED 1.0)  
- **Phase 2 – Production & Expansion** (Post‑hackathon enhancements)

---

## 4. PHASE 1 – HACKATHON MVP

### 4.1 Goal
Demonstrate a fully functional end‑to‑end flow: user registration → skill submission → hash storage → trusted review → NFT minting → public verification.

### 4.2 Core Features & Modules

#### A. Hybrid Authentication & Identity
- Email/password registration & JWT login
- Phantom wallet connection **after** login (link wallet address to profile)
- Backend stores `wallet_address` in user profile
- *Phase 1 scope*: wallets are linked, but NFT minting happens via a single minter wallet (server‑side) – the user’s wallet is only used for identity, not for transaction signing.

#### B. Skill Submission & Proof Hashing
- User uploads a **file** (video / image / document) with a title & description.
- Backend:
  - Validates file type & size
  - Uploads file to **IPFS** (Pinata or web3.storage)
  - Generates **SHA‑256 hash** of the original file
  - Creates a `Skill` record in DB with status `submitted`

#### C. Verifier Review & Approval
- Dedicated *verifier* accounts (users with `is_verifier=True`)
- Verifier endpoint:
  - Lists pending skills
  - Can view the IPFS‑stored proof (link provided)
  - Approves or rejects the skill
- **Strict rule:** verifiers cannot approve their own submissions.
- On approval, status changes to `verified` → triggers NFT minting.

#### D. Blockchain Credential (Solana NFT)
- After approval, server‑side logic:
  - Builds a metadata JSON containing:
    - Skill name
    - Verifier username
    - SHA‑256 proof hash
    - Timestamp
  - Uploads metadata JSON to IPFS
  - Mints an **NFT** on **Solana Devnet** using a pre‑funded minter wallet (server holds the private key securely)
  - Records `mint_address`, `transaction_signature`, and `metadata_uri` in the database
- The NFT is minted to the **minter wallet** but associated with the user’s profile (later phases can transfer to user wallet).

#### E. Public Verification Page
- Public endpoint (`GET /api/core/credential/<mint_address>/`)
- Returns:
  - Validity status
  - Skill name
  - Proof hash stored on‑chain vs. DB
  - Verifier identity
- No login required – any employer can verify a credential.

#### F. Simple User Dashboard
- API endpoint returning user’s:
  - List of submitted skills with status
  - Minted credentials (mint address, tx signature)
  - Basic profile info (email, wallet)

#### G. Tech Stack (Phase 1)
- **Backend:** Django + DRF + Simple JWT + PostgreSQL (local dev / Supabase)  
- **Storage:** IPFS (Pinata)  
- **Blockchain:** Solana Devnet, `solana‑py` + `solders`  
- **AI:** Not in MVP (Phase 2)  
- **Frontend:** Next.js + Tailwind (out of scope for this PRD, but will consume the APIs)

### 4.3 Success Criteria for Phase 1
- [ ] A new user can register, login, and link a Phantom wallet
- [ ] User can upload a skill proof – file stored on IPFS, hash saved
- [ ] A verifier can approve the skill – NFT is minted on Devnet
- [ ] Public verification endpoint returns the correct on‑chain data
- [ ] Dashboard shows the credential
- [ ] All interactions are protected with role‑based permissions

---

## 5. PHASE 2 – PRODUCTION & ENHANCEMENTS

### 5.1 Goal
Transform the MVP into a robust, scalable verifiable identity layer ready for real‑world deployment and integration with opportunity platforms like Frontier Pass.

### 5.2 New/Enhanced Features

#### A. AI‑Powered Skill Assistance (YarnGPT)
- Integrate OpenAI API on the backend
- Auto‑tag skills based on description (e.g., “welding”, “web design”)
- Suggest skill levels (beginner / intermediate / expert)
- Help users write better descriptions
- Multilingual support (English + at least one local language)

#### B. Enhanced Verifier Reputation System
- Verifiers accumulate a **reputation score** based on:
  - Number of verifications
  - Consistency with other verifiers
  - Rejection rate vs. final outcome
- Score displayed on credentials, affecting trust level
- Reputation used to weight verifications (future: multi‑sig verification)

#### C. Frontier Pass Integration (Exportable Profile)
- Standardized API endpoint that outputs a user’s verified skills in a machine‑readable format (JSON Schema)
- Include trust indicators (verifier reputation, NFT ownership proof)
- Simulate “Send to Frontier Pass” from dashboard
- (Conceptual) Smart contract that Frontier Pass can query directly on‑chain

#### D. On‑Chain Credential Transfer to User Wallet
- Instead of minting to a server wallet, the server mints directly to the **user’s Phantom wallet** (requires a different approach: user signs the mint transaction, or a delegated mint authority).  
- *Alternative:* keep server mint & add a transfer function after minting.

#### E. Advanced Security & Scalability
- Rate limiting on auth endpoints
- Captcha on registration
- Malware scanning for uploads (ClamAV or similar)
- Move from SQLite to PostgreSQL (Supabase / dedicated)
- Use of `django‑cors‑headers` already in place
- Environment variables for all secrets (no hardcoded keys)

#### F. Analytics & Admin Dashboard
- Admin panel to monitor submissions, verifier activity, minting stats
- Charts and real‑time insights

#### G. Mobile Responsive & PWA
- Frontend built as a PWA for offline use (initial skill capture in low‑connectivity areas)

### 5.3 Success Criteria for Phase 2
- [ ] AI suggestions appear on the skill submission form
- [ ] Verifier reputation scores are visible and updated
- [ ] External platform (Frontier Pass) can pull a user’s verified profile via API
- [ ] System handles 100+ concurrent submissions without failure
- [ ] All credentials are transferable to the user’s own wallet

---

## 6. SYSTEM ARCHITECTURE (OVERVIEW)

```
[Next.js Frontend]
       |
       v
[Django Backend] ─── IPFS (Pinata) for file/metadata storage
       |                 PostgreSQL (user/skills/credentials)
       |
       v
[Solana Devnet] ─── Minter wallet (server side) creates NFTs
                     Metadata linked to IPFS
```

---

## 7. FINAL POSITIONING

NeuroPass evolves from a hackathon demo into a **production‑grade verifiable identity layer** for the informal workforce.  
Phase 1 proves the trust model and technical feasibility.  
Phase 2 turns it into a scalable infrastructure that plugs directly into the global opportunity ecosystem.

---

*End of Phased PRD*