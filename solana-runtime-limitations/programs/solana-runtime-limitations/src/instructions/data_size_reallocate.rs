use crate::DataSizeLimitAccount;
use anchor_lang::prelude::*;

#[account]
pub struct DataSizeReallocateAccount {
    var_string: String,
}

// --- INIT of the account
#[derive(Accounts)]
pub struct DataSizeReallocateInit<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 4, // anchor discriminator + length of string
    )]
    data_account: Account<'info, DataSizeReallocateAccount>,

    #[account(mut)]
    payer: Signer<'info>,

    system_program: Program<'info, System>,
}

impl<'info> DataSizeReallocateInit<'info> {
    pub fn process(&mut self) -> Result<()> {
        self.data_account.set_inner(DataSizeReallocateAccount {
            var_string: "".to_string(),
        });
        Ok(())
    }
}

// --- ADD data in chunks into account reallocating space
#[derive(Accounts)]
#[instruction(addition: String)]
pub struct DataSizeReallocateAdd<'info> {
    #[account(
        mut,
        realloc = (8 + 4) as usize + data_account.var_string.as_bytes().len() + addition.as_bytes().len(),
        realloc::payer = payer,
        realloc::zero = false,

    )]
    data_account: Account<'info, DataSizeReallocateAccount>,

    #[account(mut)]
    payer: Signer<'info>,

    system_program: Program<'info, System>,
}

impl<'info> DataSizeReallocateAdd<'info> {
    pub fn process(&mut self, addition: String) -> Result<()> {
        self.data_account.var_string += addition.as_str();
        Ok(())
    }
}

// --- DATA SIZE LIMIT initialization in one go
#[derive(Accounts)]
pub struct DataSizeReallocateSetup<'info> {
    #[account()]
    data_account: Account<'info, DataSizeReallocateAccount>,

    #[account(
        init,
        payer = payer,
        space = (8 + 4) as usize + data_account.var_string.as_bytes().len()
    )]
    data_size_limit_account: Account<'info, DataSizeLimitAccount>,

    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

impl<'info> DataSizeReallocateSetup<'info> {
    pub fn process(&mut self) -> Result<()> {
        self.data_size_limit_account
            .set_inner(DataSizeLimitAccount {
                var_string: self.data_account.var_string.clone(),
            });
        Ok(())
    }
}
