use anchor_lang::prelude::*;

declare_id!("F11FFZasp1pEGDaHoguWokQbenh7TLc5SWTz7pbDpVQD");

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;
use state::VerifyDecision;

#[program]
pub mod neuro_pass {
    use super::*;

    /// One-time setup: initialise the global registry and set the admin.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    /// Admin registers a trusted verifier on-chain.
    pub fn register_verifier(ctx: Context<RegisterVerifier>, verifier_key: Pubkey) -> Result<()> {
        instructions::register_verifier::handler(ctx, verifier_key)
    }

    /// Admin deactivates a verifier.
    pub fn revoke_verifier(ctx: Context<RevokeVerifier>) -> Result<()> {
        instructions::revoke_verifier::handler(ctx)
    }

    /// User records a skill submission with its SHA-256 proof hash and IPFS CID.
    pub fn submit_skill(
        ctx: Context<SubmitSkill>,
        skill_name: String,
        proof_hash: [u8; 32],
        ipfs_cid: String,
    ) -> Result<()> {
        instructions::submit_skill::handler(ctx, skill_name, proof_hash, ipfs_cid)
    }

    /// Verifier approves or rejects a skill submission on-chain.
    pub fn verify_skill(
        ctx: Context<VerifySkill>,
        decision: VerifyDecision,
        comment_hash: [u8; 32],
    ) -> Result<()> {
        instructions::verify_skill::handler(ctx, decision, comment_hash)
    }

    /// Backend calls this after minting the NFT to anchor the credential on-chain.
    pub fn record_credential(ctx: Context<RecordCredential>, metadata_uri: String) -> Result<()> {
        instructions::record_credential::handler(ctx, metadata_uri)
    }

    /// Admin (minter wallet) anchors a credential directly — no SkillRecord PDA needed.
    /// This is what the Django backend calls after minting an NFT.
    pub fn admin_anchor_credential(
        ctx: Context<AdminAnchorCredential>,
        user: Pubkey,
        proof_hash: [u8; 32],
        metadata_uri: String,
    ) -> Result<()> {
        instructions::admin_anchor_credential::handler(ctx, user, proof_hash, metadata_uri)
    }
}
