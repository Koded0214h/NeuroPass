use anchor_lang::prelude::*;

/// Global singleton — PDA seeds: [b"registry"]
#[account]
pub struct Registry {
    /// The wallet that can register/revoke verifiers.
    pub admin: Pubkey,
    /// Running counter used as the skill submission nonce.
    pub skill_count: u64,
    /// Number of active verifiers ever registered.
    pub verifier_count: u64,
    /// Bump for the PDA so we can re-derive it in instructions.
    pub bump: u8,
}

impl Registry {
    // discriminator(8) + admin(32) + skill_count(8) + verifier_count(8) + bump(1)
    pub const LEN: usize = 8 + 32 + 8 + 8 + 1;
}
