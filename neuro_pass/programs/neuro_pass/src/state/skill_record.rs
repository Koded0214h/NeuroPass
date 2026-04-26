use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum SkillStatus {
    Submitted,
    Verified,
    Rejected,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum VerifyDecision {
    Approve,
    Reject,
}

/// Per-submission record — PDA seeds: [b"skill", user_pubkey, skill_id as le_bytes]
#[account]
pub struct SkillRecord {
    /// Sequential ID from Registry.skill_count at submission time.
    pub id: u64,
    pub user: Pubkey,
    /// UTF-8 skill name, max 64 bytes.
    pub skill_name: String,
    /// SHA-256 of the uploaded proof file — the core integrity anchor.
    pub proof_hash: [u8; 32],
    /// IPFS CID of the raw proof file, max 64 chars.
    pub ipfs_cid: String,
    pub status: SkillStatus,
    pub submitted_at: i64,
    /// Set once verify_skill is called.
    pub verifier: Option<Pubkey>,
    pub verified_at: Option<i64>,
    pub bump: u8,
}

impl SkillRecord {
    // discriminator(8) + id(8) + user(32) + skill_name(4+64) + proof_hash(32)
    // + ipfs_cid(4+64) + status(1) + submitted_at(8) + verifier(1+32) + verified_at(1+8) + bump(1)
    pub const LEN: usize = 8 + 8 + 32 + (4 + 64) + 32 + (4 + 64) + 1 + 8 + (1 + 32) + (1 + 8) + 1;
}
