use anchor_lang::prelude::*;
use crate::state::{Registry, SkillRecord, SkillStatus};
use crate::errors::NeuroPassError;

#[derive(Accounts)]
#[instruction(skill_name: String, proof_hash: [u8; 32], ipfs_cid: String)]
pub struct SubmitSkill<'info> {
    #[account(
        mut,
        seeds = [b"registry"],
        bump = registry.bump,
    )]
    pub registry: Account<'info, Registry>,

    #[account(
        init,
        payer = user,
        space = SkillRecord::LEN,
        seeds = [b"skill", user.key().as_ref(), &registry.skill_count.to_le_bytes()],
        bump,
    )]
    pub skill_record: Account<'info, SkillRecord>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SubmitSkill>,
    skill_name: String,
    proof_hash: [u8; 32],
    ipfs_cid: String,
) -> Result<()> {
    require!(skill_name.len() <= 64, NeuroPassError::SkillNameTooLong);
    require!(ipfs_cid.len() <= 64, NeuroPassError::CidTooLong);

    let registry = &mut ctx.accounts.registry;
    let record = &mut ctx.accounts.skill_record;

    record.id = registry.skill_count;
    record.user = ctx.accounts.user.key();
    record.skill_name = skill_name.clone();
    record.proof_hash = proof_hash;
    record.ipfs_cid = ipfs_cid;
    record.status = SkillStatus::Submitted;
    record.submitted_at = Clock::get()?.unix_timestamp;
    record.verifier = None;
    record.verified_at = None;
    record.bump = ctx.bumps.skill_record;

    registry.skill_count += 1;

    msg!(
        "Skill submitted — id: {}, user: {}, name: {}",
        record.id,
        record.user,
        skill_name
    );
    Ok(())
}
