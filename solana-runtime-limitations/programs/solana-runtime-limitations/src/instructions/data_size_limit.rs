use anchor_lang::prelude::*;

#[account]
pub struct DataSizeLimitAccount {
    pub var_string: String,
}

#[derive(Accounts)]
#[instruction(params: DataSizeLimitParams)]
pub struct DataSizeLimit<'info> {
    #[account(
        init,
        payer = payer,
        space = params.space as usize,
    )]
    data_account: Account<'info, DataSizeLimitAccount>,

    #[account(mut)]
    payer: Signer<'info>,

    system_program: Program<'info, System>,
}

#[derive(AnchorDeserialize, AnchorSerialize, Debug, Clone)]
pub struct DataSizeLimitParams {
    pub space: u16,
    pub data: String,
}

impl<'info> DataSizeLimit<'info> {
    pub fn process(&mut self, param: DataSizeLimitParams) -> Result<()> {
        self.data_account.set_inner(DataSizeLimitAccount {
            var_string: param.data,
        });
        Ok(())
    }
}
