mod instructions;

use crate::instructions::data_size_limit::*;
use crate::instructions::data_size_reallocate::*;
use crate::instructions::data_size_supplier::*;
use anchor_lang::prelude::*;

declare_id!("6rtKQYnusfX9bXu4c5x26j6JkTefJmHExhpc5oEHCgj7");

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

    pub fn data_size_supplier_setup(ctx: Context<DataSizeSupplierSetup>) -> Result<()> {
        ctx.accounts.process()
    }

    // -- data_size_reallocate
    pub fn data_size_reallocate_init(ctx: Context<DataSizeReallocateInit>) -> Result<()> {
        ctx.accounts.process()
    }

    pub fn data_size_reallocate_add(
        ctx: Context<DataSizeReallocateAdd>,
        addition: String,
    ) -> Result<()> {
        ctx.accounts.process(addition)
    }

    pub fn data_size_reallocate_setup(ctx: Context<DataSizeReallocateSetup>) -> Result<()> {
        ctx.accounts.process()
    }
}
