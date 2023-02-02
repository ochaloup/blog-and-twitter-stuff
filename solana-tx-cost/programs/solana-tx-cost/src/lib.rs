use anchor_lang::prelude::*;

declare_id!("BbkLEpNuXhFv1fTeRq6qJpm8BK1aecGWb2g8iqmvNYiw");

#[program]
pub mod solana_tx_cost {
    use super::*;

    pub fn simple(_ctx: Context<Simple>) -> Result<()> {
        Ok(())
    }

    pub fn with_signature(_ctx: Context<WithSignature>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Simple {}

#[derive(Accounts)]
pub struct WithSignature<'info> {
    /// CHECK: not important, for testing of signature only
    #[account(signer)]
    pub signer: AccountInfo<'info>,
}
