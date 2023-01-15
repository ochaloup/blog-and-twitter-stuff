mod instructions;

use anchor_lang::prelude::*;
use crate::instructions::data_size_limit::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod solana_runtime_limitations {

    use super::*;

    pub fn data_size_limit(ctx: Context<DataSizeLimit>, params: DataSizeLimitParams) -> Result<()> {
        ctx.accounts.process(params)
    }
}
