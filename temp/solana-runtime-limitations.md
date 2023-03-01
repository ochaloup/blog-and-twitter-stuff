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
What if the code runs infinite loop or consuming enormous amount of memory?

Usually the blockchain systems defend themselves by setting up high price for an operation.
It's possible to steal system capacity but it's expensive.
Bitcoin limits the power of the [scripting language](https://en.bitcoin.it/wiki/Script).
As a stack-based system which does not permit cycles there is an inherent payment
in form of blockchain space that every processed instruction is saved in, plus the block size
is limited.
Ethereum contracts permit cycles and EVM is turing complete. Every processed
[operation](https://ethereum.org/en/developers/docs/evm/opcodes/) is defined with gas cost
and the [gas](https://ethereum.org/en/developers/docs/gas/) has to be paid.
When longer the contract runs, more money the caller has to pay.

Even turing complete Solana brought a flat model for payments for transactions
with no additional cost for every operation. The transaction initiator pays 
5000 lamports (0.000005 SOL) for a signature used within the transaction. Nothing more.

This flat payment model was extended with introduction of [priority fees](https://docs.solana.com/proposals/fee_transaction_priority)
but the purpose of the priority fee is not to charge for computation units.
The purppose is prioritization of the sent transaction in the queue of transactions at block building validator
to get better chance to being grabbed and involved into the block.

In current times you don't pay for CPU time and memory consumption of the program (contract) code at validator.
While many areas of the Solana runtime progresses forward the part around the fees is one of them.

How Solana limits the programs to not grab all computation time at validator? There are pre-defined rules
and hard limits that the program has to fit in. Let's discuss them in more details
while recommended to check the Solana documentation on the topic of
(runtime compute budget)[https://github.com/solana-labs/solana/blob/v1.14.11/docs/src/developing/programming-model/runtime.md#compute-budget].

## Computation units

Any operation processed within the program (counting like BPF instruction calls and system calls)
is tracked as in terms of compute units.
Any transaction can be checked [on estimated cost](https://github.com/solana-labs/solana/blob/v1.14.11/runtime/src/cost_model.rs)
before execution while can check for the processed transaction as well
within the results of (getTransaction)[https://docs.solana.com/api/http#gettransaction] (see `computeUnitsConsumed`).

Each transaction is hard capped by maximum of compute units processed within it
with default transaction-wide compute budget of 200k units.
The transaction compute budget could be increased up to 1.4M of units with use of
(`ComputeBudget`)[https://github.com/solana-labs/solana/blob/v1.14.11/sdk/src/compute_budget.rs#L22] instruction.