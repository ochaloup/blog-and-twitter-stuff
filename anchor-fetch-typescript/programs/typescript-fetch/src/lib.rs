use anchor_lang::prelude::*;
use crate::error::TypescriptFetchError;

mod error;

#[constant]
pub const PROGRAM_ID: &str = "8tKNmp7w19TCH9cvg7qTXR3etBqnofHgkTMT2ybxJ7Xx";
// PROGRAM_ID equality to declare_id! macro is checked by tests
declare_id!("8tKNmp7w19TCH9cvg7qTXR3etBqnofHgkTMT2ybxJ7Xx");

#[constant]
pub const DEFAULT_INT_VAR: u16 = 30;

#[program]
pub mod typescript_fetch {
    use super::*;

    pub fn initialize_data(ctx: Context<InitializeData>) -> Result<()> {
        ctx.accounts
            .data
            .set_inner(Data {
                enum_var: DataEnum::One,
                int_var: DEFAULT_INT_VAR,
                string_var: "Hello world!".to_string(),
                struct_var: DataStruct { index: 1 }
            });

        emit!(DataEvent{
            int_var: ctx.accounts.data.int_var
        });

        Ok(())
    }

    pub fn error_me(_ctx: Context<ErrorMe>) -> Result<()> {
        return Err(TypescriptFetchError::ErrorMeError.into())
    }
}

#[derive(Accounts)]
pub struct InitializeData<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 2 + 50 + 1 + 1,
    )]
    data: Account<'info, Data>,

    #[account(mut)]
    payer: Signer<'info>,

    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ErrorMe {}

#[account]
pub struct Data {
    int_var: u16,
    string_var: String,
    enum_var: DataEnum,
    struct_var: DataStruct
}

#[derive(AnchorDeserialize, AnchorSerialize, Debug, Clone)]
pub struct DataStruct {
    index: u8
}

#[derive(AnchorDeserialize, AnchorSerialize, Debug, Clone)]
pub enum DataEnum {
    One,
    Two,
    Three
}

#[event]
pub struct DataEvent {
    pub int_var: u16,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    #[test]
    fn program_ids_match() {
        assert_eq!(crate::ID, Pubkey::from_str(PROGRAM_ID).unwrap());
    }
}