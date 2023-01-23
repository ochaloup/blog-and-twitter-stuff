mod instructions;

use crate::instructions::data_size_limit::*;
use crate::instructions::data_size_supplier::*;
use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod solana_runtime_limitations {

    use super::*;

    // -- data_size_limit
    pub fn data_size_limit(ctx: Context<DataSizeLimit>, params: DataSizeLimitParams) -> Result<()> {
        ctx.accounts.process(params)
    }

    // -- data_size_supplier
    pub fn data_size_supplier_init(ctx: Context<DataSizeSupplierInit>, space: u16) -> Result<()> {
        ctx.accounts.process(space)
    }

    pub fn data_size_supplier_add(
        ctx: Context<DataSizeSupplierAdd>,
        addition: String,
    ) -> Result<()> {
        ctx.accounts.process(addition)
    }

    pub fn data_size_supplier_cpi(ctx: Context<DataSizeSupplierCpi>) -> Result<()> {
        ctx.accounts.process()
    }
}
