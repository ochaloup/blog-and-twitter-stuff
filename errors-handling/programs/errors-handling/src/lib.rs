use anchor_lang::prelude::*;

declare_id!("9Q38TDj4ckXUNqBHhMkDde9DRt8kUCagb8YJPwH8o7jT");

#[program]
pub mod errors_handling {
    use super::*;

    pub fn error_me(_ctx: Context<ErrorMe>) -> Result<()> {
        Err(ErrorCode::ErrorMeError.into())
    }
}

#[derive(Accounts)]
pub struct ErrorMe {}

#[error_code]
pub enum ErrorCode {
    #[msg("ErrorMe error")]
    ErrorMeError,
}