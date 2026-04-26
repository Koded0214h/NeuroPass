use anchor_lang::prelude::*;

#[error_code]
pub enum NeuroPassError {
    #[msg("Only the program admin can perform this action.")]
    Unauthorized,

    #[msg("Verifier is not active or not registered.")]
    VerifierNotActive,

    #[msg("A user cannot verify their own skill submission.")]
    SelfVerification,

    #[msg("This skill has already been verified or rejected.")]
    AlreadyProcessed,

    #[msg("Skill name exceeds the 64-character limit.")]
    SkillNameTooLong,

    #[msg("IPFS CID exceeds the 64-character limit.")]
    CidTooLong,

    #[msg("Metadata URI exceeds the 128-character limit.")]
    MetadataUriTooLong,

    #[msg("The skill record does not belong to the credential's user.")]
    UserMismatch,

    #[msg("The skill record has not been verified yet.")]
    SkillNotVerified,
}
