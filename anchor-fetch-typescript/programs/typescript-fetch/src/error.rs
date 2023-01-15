use anchor_lang::prelude::*;

#[error_code]
pub enum TypescriptFetchError {
    /// A used error
    #[msg("You get an error")]
    ErrorMeError,
    /// Not used error
    #[msg("Unknown")]
    Unknown,
}