use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CuLimitOp {}

impl CuLimitOp {
    pub fn process(&mut self, iterations: u64) -> Result<()> {
        let clock = Clock::get()?;
        let mut store = 0;
        for i in 1..=iterations {
            store = (clock.unix_timestamp as u64) / i;
        }
        msg!("store: {}", store);
        Ok(())
    }
}
