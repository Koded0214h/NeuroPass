use anchor_lang::prelude::*;
use crate::state::{VerifierRecord, SkillRecord, SkillStatus, VerifyDecision};
use crate::errors::NeuroPassError;

#[derive(Accounts)]
pub struct VerifySkill<'info> {
    #[account(
        mut,
        seeds = [b"verifier", verifier.key().as_ref()],
        bump = verifier_record.bump,
        constraint = verifier_record.is_active @ NeuroPassError::VerifierNotActive,
    )]
    pub verifier_record: Account<'info, VerifierRecord>,

    #[account(
        mut,
        // Guard: skill must still be pending
        constraint = skill_record.status == SkillStatus::Submitted @ NeuroPassError::AlreadyProcessed,
        // Guard: verifier cannot approve their own submission
        constraint = skill_record.user != verifier.key() @ NeuroPassError::SelfVerification,
    )]
    pub skill_record: Account<'info, SkillRecord>,

    pub verifier: Signer<'info>,
}

pub fn handler(
    ctx: Context<VerifySkill>,
    decision: VerifyDecision,
    _comment_hash: [u8; 32],
) -> Result<()> {
    let record = &mut ctx.accounts.skill_record;
    let vr = &mut ctx.accounts.verifier_record;
    let now = Clock::get()?.unix_timestamp;

    record.verifier = Some(ctx.accounts.verifier.key());
    record.verified_at = Some(now);

    match decision {
        VerifyDecision::Approve => {
            record.status = SkillStatus::Verified;
            vr.reputation_score += 1;
            msg!("Skill {} approved by {}", record.id, ctx.accounts.verifier.key());
        }
        VerifyDecision::Reject => {
            record.status = SkillStatus::Rejected;
            msg!("Skill {} rejected by {}", record.id, ctx.accounts.verifier.key());
        }
    }

    vr.total_verifications += 1;
    Ok(())
}
