use crate::DataSizeLimitAccount;
use anchor_lang::prelude::*;

#[account]
pub struct DataSupplierAccount {
    var_string: String,
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
    pub fn process(&mut self, _space: u16) -> Result<()> {
        self.data_account.set_inner(DataSupplierAccount {
            var_string: "".to_string(),
        });
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
    pub fn process(&mut self, addition: String) -> Result<()> {
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
    pub fn process(&mut self) -> Result<()> {
        self.data_size_limit_account
            .set_inner(DataSizeLimitAccount {
                var_string: self.data_account.var_string.clone(),
            });
        Ok(())
    }
}
