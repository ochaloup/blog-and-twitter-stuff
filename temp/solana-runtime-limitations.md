# Solana runtime limits

When started to work on updates of SPL Governance
we recognized the limitations set for the voting
won't fit with our requirements.
The base limitation is having way to create
the most [10 voting options](https://github.com/solana-labs/solana-program-library/blob/governance-v3.1.0/governance/program/src/state/proposal.rs#L1069)
while we want to vote on validator gauges where we currently manage around 80 validators to vote for.
Removing the limitation of 10 voting options is easy in code
but what happens when we try to place 80 or more options into SPL governance proposal?
We start discovering Solana runtime limits.

**NOTE:** the article works with Solana runtime in version `1.14.11`
          as up-to-date version in January 2023

## What are Solana runtime limits

As any other blockchain Solana defends the runtime against hostile
or wrongly written code that may try to steal CPU or memory capacity of the validator machine
and cause denial-of-service or brokage of the system.
What if the code runs infinite loop or consuming anormous amount of memory?

Usually the systems defend themselves by setting up high price for an operation.
It's possible to steal system capacity but it's expensive.
Bitcoin limits the power of the [scripting language](https://en.bitcoin.it/wiki/Script).
As a stack-based system which does not permit cycles there is a need to pay
for every instruction saved to blockchain that's limited by size of the block.
Ethereum contracts permit cycles (it's turing complete) while any processed
operation has to be paid with [gas](https://ethereum.org/en/developers/docs/gas/).
As longer the contract runs as much money the caller has to pay.