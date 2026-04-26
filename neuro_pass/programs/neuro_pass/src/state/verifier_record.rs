use anchor_lang::prelude::*;

/// One record per approved verifier — PDA seeds: [b"verifier", verifier_pubkey]
#[account]
pub struct VerifierRecord {
    pub verifier: Pubkey,
    pub reputation_score: u64,
    pub total_verifications: u64,
    pub is_active: bool,
    pub registered_at: i64,
    pub bump: u8,
}

impl VerifierRecord {
    // discriminator(8) + verifier(32) + rep(8) + total(8) + active(1) + ts(8) + bump(1)
    pub const LEN: usize = 8 + 32 + 8 + 8 + 1 + 8 + 1;
}
