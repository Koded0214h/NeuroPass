use anchor_lang::prelude::*;
use crate::state::{Registry, VerifierRecord};
use crate::errors::NeuroPassError;

#[derive(Accounts)]
#[instruction(verifier_key: Pubkey)]
pub struct RegisterVerifier<'info> {
    #[account(
        mut,
        seeds = [b"registry"],
        bump = registry.bump,
    )]
    pub registry: Account<'info, Registry>,

    #[account(
        init,
        payer = admin,
        space = VerifierRecord::LEN,
        seeds = [b"verifier", verifier_key.as_ref()],
        bump,
    )]
    pub verifier_record: Account<'info, VerifierRecord>,

    #[account(mut, constraint = admin.key() == registry.admin @ NeuroPassError::Unauthorized)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RegisterVerifier>, verifier_key: Pubkey) -> Result<()> {
    let record = &mut ctx.accounts.verifier_record;
    record.verifier = verifier_key;
    record.reputation_score = 0;
    record.total_verifications = 0;
    record.is_active = true;
    record.registered_at = Clock::get()?.unix_timestamp;
    record.bump = ctx.bumps.verifier_record;

    ctx.accounts.registry.verifier_count += 1;

    msg!("Verifier registered: {}", verifier_key);
    Ok(())
}
