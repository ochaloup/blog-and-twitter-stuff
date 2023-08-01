use anchor_lang::prelude::*;

declare_id!("9Q38TDj4ckXUNqBHhMkDde9DRt8kUCagb8YJPwH8o7jT");

#[program]
pub mod errors_handling {
    use super::*;

    pub fn error_me(_ctx: Context<ErrorMe>) -> Result<()> {
        Err(ErrorCode::ErrorMeError.into())
    }   
    
    pub fn ok_me(ctx: Context<OkMe>) -> Result<()> {
        msg!("ok_me: {:?}", ctx.accounts.me);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ErrorMe {}

#[derive(Accounts)]
pub struct OkMe<'info> {
    /// CHECK: any account, only printed
    pub me: UncheckedAccount<'info>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("ErrorMe error")]
    ErrorMeError,
}