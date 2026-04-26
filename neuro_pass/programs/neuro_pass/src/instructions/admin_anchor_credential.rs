use anchor_lang::prelude::*;
use crate::state::{Registry, CredentialRecord};
use crate::errors::NeuroPassError;

/// Backend-callable instruction: anchors a minted NFT credential on-chain
/// without requiring a pre-existing SkillRecord PDA.
/// The admin (minter wallet) signs; user pubkey and proof hash are passed as args.
#[derive(Accounts)]
#[instruction(user: Pubkey, proof_hash: [u8; 32], metadata_uri: String)]
pub struct AdminAnchorCredential<'info> {
    #[account(
        seeds = [b"registry"],
        bump = registry.bump,
        constraint = admin.key() == registry.admin @ NeuroPassError::Unauthorized,
    )]
    pub registry: Account<'info, Registry>,

    /// The SPL mint of the already-minted NFT.
    /// CHECK: We only record the address; mint was created by the backend.
    pub mint: UncheckedAccount<'info>,

    #[account(
        init,
        payer = admin,
        space = CredentialRecord::LEN,
        seeds = [b"credential", mint.key().as_ref()],
        bump,
    )]
    pub credential_record: Account<'info, CredentialRecord>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<AdminAnchorCredential>,
    user: Pubkey,
    proof_hash: [u8; 32],
    metadata_uri: String,
) -> Result<()> {
    require!(metadata_uri.len() <= 128, NeuroPassError::MetadataUriTooLong);

    let cr = &mut ctx.accounts.credential_record;
    cr.skill_record = Pubkey::default(); // no on-chain SkillRecord in this path
    cr.mint = ctx.accounts.mint.key();
    cr.verifier = ctx.accounts.admin.key();
    cr.user = user;
    cr.proof_hash = proof_hash;
    cr.metadata_uri = metadata_uri;
    cr.minted_at = Clock::get()?.unix_timestamp;
    cr.bump = ctx.bumps.credential_record;

    msg!(
        "Credential anchored — mint: {}, user: {}",
        cr.mint,
        cr.user
    );
    Ok(())
}
