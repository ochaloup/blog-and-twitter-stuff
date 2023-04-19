# Solana Program Library Governance

With Marinade migration from Tribeca governance system to Realms of SPL Govevernance
we introduce a bit more technical article on this topic.
It's meant for anybody interested to understand the Realms system in details
and for anybody planning to integrate with SPL Gov.

## SPL Goveranance

Let's talk from technical perspective here.
The SPL Governance is [a Solana blockchain program](https://github.com/solana-labs/solana-program-library/tree/master/governance)
developed as part of the [Solana Program Library](https://spl.solana.com/), meaning the program is developed by guys from Solana Labs.
The program purpose is to provide a blockchain based tool to manage [Decentralized Autonomous Organization (DAO)](https://docs.marinade.finance/marinade-dao).

The SPL Governance is designed in generic manner to cover good amount of use cases for DAO management.
The corner stone of functionality covers creating a proposals containing blockchain instructions
that DAO members may vote upon and on succesful voting the instructions may be executed.
A simplistic use case could be to use the SPL Gov system to create a multisig control
over distribution of DAO funds.
A heavier use runs smooth DAO management through created instructions that can be voted by community and/or council
which consist minting tokens, transfering funds from DAO treasury, upgrading code of programs belonging to DAO
and being an admin authority of the managed programs.

## Where to find, how to get

The SPL Governance can be

**IMPORTANT:** whole this article refers to SPL Governance in version 3.1
[released in December 2022](https://github.com/solana-labs/solana-program-library/releases/tag/governance-v3.1.0). 

## Terms and glossary

The terms used within the SPL Governance system are a bit ambiguous at some places,
so let's pin some of them to clarify their meaning and not missed you in the rest of the text.

### DAO vs. Realm

The term `realm` is used at multiple places within the texts and documentation
of the SPL Gov system. At some perspective it can be considered as equivalent to DAO,
in cases a DAO may consists of several relms. Let's elaborate.

From technical perspective the `Realm` is the top level wrapper of configuration setup for voting over proposals.
The [`Realm`](https://github.com/solana-labs/solana-program-library/blob/governance-v3.1.0/governance/program/src/state/realm.rs)
is as well the top level data structure within the SPL Gov program library that all other data structures points to.

If the DAO, as the organization itself, requires some really specific configuration for their voting
it can happen that in such case multiple `Realms` are created belonging under such decentralized organization.
Such configuration is exceptional and it is usual that DAO is managed within one `Realm`.
For that it's usual to consider the terms `dao` and `a realm` equivalent in SPL Gov system.
It's the reason why the `governance-ui` uses both terms interchangeably.

### DAO Wallet vs. Governance

When we check the 



