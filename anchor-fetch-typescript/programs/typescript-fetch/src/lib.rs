use anchor_lang::prelude::*;
use crate::error::TypescriptFetchError;

mod error;

declare_id!("8tKNmp7w19TCH9cvg7qTXR3etBqnofHgkTMT2ybxJ7Xx");

#[program]
pub mod typescript_fetch {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts
            .data
            .set_inner(Data {
                enum_var: DataEnum::One,
                int_var: 30,
                string_var: "Hello world!".to_string(),
                struct_var: DataStruct { index: 1 }
            });


        Ok(())
    }

    pub fn error_me(_ctx: Context<ErrorMe>) -> Result<()> {
        return Err(TypescriptFetchError::ErrorMeError.into())
    }

    pub fn event_me(ctx: Context<EventMe>) -> Result<()> {
        emit!(DataEvent{
            data: ctx.accounts.data.int_var
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        space = 2 + 50 + 1,
    )]
    data: Account<'info, Data>,

    #[account(mut)]
    payer: Signer<'info>,

    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ErrorMe {}

#[derive(Accounts)]
pub struct EventMe<'info> {
    #[account()]
    data: Account<'info, Data>
}

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
    pub data: u16,
}