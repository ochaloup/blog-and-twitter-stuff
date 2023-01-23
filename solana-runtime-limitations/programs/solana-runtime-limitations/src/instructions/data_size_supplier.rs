use anchor_lang::prelude::*;
use crate::DataSizeLimitAccount;

#[account]
pub struct DataSupplierAccount {
    var_string: String
}


// --- INIT of the account
#[derive(Accounts)]
#[instruction(space: u16)]
pub struct DataSizeSupplierInit<'info> {
    #[account(
        init,
        payer = payer,
        space = space as usize,
    )]
    data_account: Account<'info, DataSupplierAccount>,

    #[account(mut)]
    payer: Signer<'info>,

    system_program: Program<'info, System>,
}

impl<'info> DataSizeSupplierInit<'info> {
    pub fn process(
        &mut self,
        _space: u16
    ) -> Result<()> {
        self.data_account.set_inner(
            DataSupplierAccount { var_string: "".to_string() }
        );
        Ok(())
    }
}


// --- ADD data in chunks into acccount
#[derive(Accounts)]
pub struct DataSizeSupplierAdd<'info> {
    #[account(mut)]
    data_account: Account<'info, DataSupplierAccount>,
}

impl<'info> DataSizeSupplierAdd<'info> {
    pub fn process(
        &mut self,
        addition: String,
    ) -> Result<()> {
        self.data_account.var_string += addition.as_str();
        Ok(())
    }
}


// --- DATA SIZE LIMIT initialization in one go
#[derive(Accounts)]
pub struct DataSizeSupplierCpi<'info> {
    #[account()]
    data_account: Account<'info, DataSupplierAccount>,

    #[account(
        init,
        payer = payer,
        space = (8 + 4) as usize + data_account.var_string.len()
    )]
    data_size_limit_account: Account<'info, DataSizeLimitAccount>,

    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

impl<'info> DataSizeSupplierCpi<'info> {
    pub fn process(
        &mut self,
    ) -> Result<()> {
        let cpi_program = self.data_size_limit_program.to_account_info();
        let cpi_accounts = DataSizeLimit {
            data_account: self.data_size_limit_account.to_account_info(),
            payer: self.payer.to_account_info(),
            system_program: self.system_program.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        crate::cpi::data_size_limit(cpi_ctx, DataSizeLimitParams{
            data: self.data_account.var_string.clone(),
            space: 8 + 4 + self.data_account.var_string.len() as u16,
        })?;
        Ok(())
    }
}

