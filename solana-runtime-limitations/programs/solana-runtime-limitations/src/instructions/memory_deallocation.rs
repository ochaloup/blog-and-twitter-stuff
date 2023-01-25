use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct MemoryDealocationOp {}

impl MemoryDealocationOp {
    pub fn process(&mut self, data: String, iterations: u32) -> Result<()> {
        let mut index: usize = 0;
        let mut store: char = '_';
        let mut temp: String;
        for _ in 1..=iterations {
            temp = data.clone();
            let char = temp.as_str().chars().nth(index).unwrap();
            store = char;
            index = if index + 1 == temp.len() {
                0
            } else {
                index + 1
            };
        }
        msg!("store: {}", store);
        Ok(())
    }
}
