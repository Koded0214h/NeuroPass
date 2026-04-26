use anchor_lang::prelude::*;
use crate::state::{Registry, VerifierRecord};
use crate::errors::NeuroPassError;

#[derive(Accounts)]
pub struct RevokeVerifier<'info> {
    #[account(
        seeds = [b"registry"],
        bump = registry.bump,
    )]
    pub registry: Account<'info, Registry>,

    #[account(
        mut,
        seeds = [b"verifier", verifier_record.verifier.as_ref()],
        bump = verifier_record.bump,
    )]
    pub verifier_record: Account<'info, VerifierRecord>,

    #[account(constraint = admin.key() == registry.admin @ NeuroPassError::Unauthorized)]
    pub admin: Signer<'info>,
}

pub fn handler(ctx: Context<RevokeVerifier>) -> Result<()> {
    ctx.accounts.verifier_record.is_active = false;
    msg!("Verifier revoked: {}", ctx.accounts.verifier_record.verifier);
    Ok(())
}
