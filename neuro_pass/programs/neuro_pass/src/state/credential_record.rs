use anchor_lang::prelude::*;

/// On-chain receipt linking a verified skill to its minted NFT.
/// PDA seeds: [b"credential", mint_pubkey]
#[account]
pub struct CredentialRecord {
    /// The SkillRecord account this credential was issued for.
    pub skill_record: Pubkey,
    /// The SPL mint address of the NFT.
    pub mint: Pubkey,
    pub verifier: Pubkey,
    pub user: Pubkey,
    /// SHA-256 of the proof file — duplicated here for fast public verification.
    pub proof_hash: [u8; 32],
    /// IPFS/Arweave URI of the NFT metadata JSON, max 128 chars.
    pub metadata_uri: String,
    pub minted_at: i64,
    pub bump: u8,
}

impl CredentialRecord {
    // discriminator(8) + skill_record(32) + mint(32) + verifier(32) + user(32)
    // + proof_hash(32) + metadata_uri(4+128) + minted_at(8) + bump(1)
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32 + 32 + (4 + 128) + 8 + 1;
}
