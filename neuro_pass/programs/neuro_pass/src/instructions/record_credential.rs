use anchor_lang::prelude::*;
use crate::state::{SkillRecord, SkillStatus, CredentialRecord};
use crate::errors::NeuroPassError;

#[derive(Accounts)]
#[instruction(metadata_uri: String)]
pub struct RecordCredential<'info> {
    #[account(
        constraint = skill_record.status == SkillStatus::Verified @ NeuroPassError::SkillNotVerified,
        constraint = skill_record.user == user.key() @ NeuroPassError::UserMismatch,
    )]
    pub skill_record: Account<'info, SkillRecord>,

    /// The SPL mint account of the already-minted NFT (passed in, not created here).
    /// CHECK: We only record the address; the mint was created by the backend.
    pub mint: UncheckedAccount<'info>,

    #[account(
        init,
        payer = user,
        space = CredentialRecord::LEN,
        seeds = [b"credential", mint.key().as_ref()],
        bump,
    )]
    pub credential_record: Account<'info, CredentialRecord>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RecordCredential>, metadata_uri: String) -> Result<()> {
    require!(metadata_uri.len() <= 128, NeuroPassError::MetadataUriTooLong);

    let skill = &ctx.accounts.skill_record;
    let cr = &mut ctx.accounts.credential_record;

    cr.skill_record = ctx.accounts.skill_record.key();
    cr.mint = ctx.accounts.mint.key();
    cr.verifier = skill.verifier.unwrap();
    cr.user = skill.user;
    cr.proof_hash = skill.proof_hash;
    cr.metadata_uri = metadata_uri.clone();
    cr.minted_at = Clock::get()?.unix_timestamp;
    cr.bump = ctx.bumps.credential_record;

    msg!(
        "Credential anchored on-chain — mint: {}, skill_id: {}",
        cr.mint,
        skill.id
    );
    Ok(())
}
