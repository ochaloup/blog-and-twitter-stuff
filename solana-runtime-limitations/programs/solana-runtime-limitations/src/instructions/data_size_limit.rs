use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(params: DataSizeLimitParams)]
pub struct DataSizeLimit<'info> {
    #[account(
        init,
        payer = payer,
        space = params.space as usize,
    )]
    data_account: Account<'info, DataAccount>,

    #[account(mut)]
    payer: Signer<'info>,

    system_program: Program<'info, System>,
}

#[derive(AnchorDeserialize, AnchorSerialize, Debug, Clone)]
pub struct DataSizeLimitParams {
    space: u16,
    data: String
}

impl<'info> DataSizeLimit<'info> {
    pub fn process(
        &mut self,
        param: DataSizeLimitParams
    ) -> Result<()> {
        self.data_account.set_inner(
            DataAccount { var_string: param.data }
        );
        Ok(())
    }
}

#[account]
pub struct DataAccount {
    var_string: String
}