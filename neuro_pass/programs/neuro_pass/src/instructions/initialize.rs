use anchor_lang::prelude::*;
use crate::state::Registry;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = Registry::LEN,
        seeds = [b"registry"],
        bump,
    )]
    pub registry: Account<'info, Registry>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>) -> Result<()> {
    let registry = &mut ctx.accounts.registry;
    registry.admin = ctx.accounts.admin.key();
    registry.skill_count = 0;
    registry.verifier_count = 0;
    registry.bump = ctx.bumps.registry;
    msg!("NeuroPass registry initialised. Admin: {}", registry.admin);
    Ok(())
}
