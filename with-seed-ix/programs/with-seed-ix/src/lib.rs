use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[constant]
pub const INITIALIZE_INIT_SEED: &[u8] = b"initialize-init";

#[program]
pub mod with_seed_ix {
    use super::*;

    pub fn initialize_init(ctx: Context<InitializeInit>, _seed: String) -> Result<()> {
        ctx.accounts.initialize_init.set_inner(
            InitializeInitData{data: 1}
        );
        Ok(())
    }

    pub fn initialize_zero(ctx: Context<InitializeZero>) -> Result<()> {
        ctx.accounts.initialize_init.set_inner(
            InitializeInitData{data: 1}
        );
        Ok(())
    }

    pub fn change(ctx: Context<Change>, value: u8) -> Result<()> {
        ctx.accounts.initialize_init.data = value;
        Ok(())
    }
}

// --- Instruction accounts parameters
#[derive(Accounts)]
#[instruction(seed: String)]
pub struct InitializeInit<'info> {
    #[account(
        init,
        payer = rent_payer,
        space = 8 + 1,
        seeds = [INITIALIZE_INIT_SEED, seed.as_bytes()], bump
    )]
    initialize_init: Account<'info, InitializeInitData>,

    #[account(mut)]
    rent_payer: Signer<'info>,

    // needed for account init
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeZero<'info> {
    #[account(zero)]
    initialize_init: Account<'info, InitializeInitData>,
}

#[derive(Accounts)]
pub struct Change<'info> {
    #[account(mut)]
    initialize_init: Account<'info, InitializeInitData>,
}


// --- Accounts storing data
#[account()]
#[derive(Debug)]
pub struct InitializeInitData {
    pub data: u8
}