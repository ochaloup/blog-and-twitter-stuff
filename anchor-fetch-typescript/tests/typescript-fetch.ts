import * as anchor from "@project-serum/anchor"
import { Program, AnchorProvider, IdlTypes, IdlAccounts, AnchorError, IdlEvents } from "@project-serum/anchor"
import { Keypair, PublicKey } from '@solana/web3.js'
import * as idl from "../target/types/typescript_fetch"

import { expect } from "chai"
import { inspect, isDeepStrictEqual } from 'util'

describe("typescript-fetch", () => {
  anchor.setProvider(anchor.AnchorProvider.env())

  const program = anchor.workspace.TypescriptFetch as Program<idl.TypescriptFetch>
  const provider = anchor.getProvider() as AnchorProvider

  type Data = IdlAccounts<idl.TypescriptFetch>["data"]
  type DataEnum = IdlTypes<idl.TypescriptFetch>["DataEnum"]
  type DataStruct = IdlTypes<idl.TypescriptFetch>["DataStruct"]
  const DATA_EVENT_NAME = "DataEvent"
  type DataEvent = IdlEvents<idl.TypescriptFetch>["DataEvent"]


  it.only("Initialized", async () => {
    const newAccount = Keypair.generate()
    // 1. call to create account with data
    await program.methods.initialize()
      .accounts({
        data: newAccount.publicKey,
        payer: provider.wallet.publicKey,
      })
      .signers([newAccount])
      .rpc()
    // 2. load created account
    const accountData: Data = await program.account.data.fetch(newAccount.publicKey)
    const accountEnum: DataEnum = accountData.enumVar
    const accountStruct: DataStruct = accountData.structVar
    expect(accountEnum.one).to.exist
    expect(accountEnum.two).not.to.exist
    expect(accountStruct.index).eq(1)

    // NOTE: JavasScript comparision
    console.log(inspect(accountStruct))
    // eq returns false since JavaScript compares objects by reference, not value
    expect(accountStruct).not.eq({index: 1})
    expect(isDeepStrictEqual(accountStruct, {index: 1}))
    expect(JSON.stringify(accountStruct) === JSON.stringify({index: 1}))
    // similar to PublicKey
    const otherObjectPk = new PublicKey(newAccount.publicKey.toBuffer())
    expect(newAccount.publicKey).not.eq(otherObjectPk)
    expect(newAccount.publicKey.toBase58()).eq(otherObjectPk.toBase58())
    expect(newAccount.publicKey.equals(otherObjectPk))
  })

  it.only("Error me", async () => {
    // 1. call to get error
    try {
      await program.methods.errorMe()
        .rpc()
      expect.fail("Error expected")
    } catch (e) {
      if (e instanceof AnchorError) {
        expect(e.error.errorCode.number).eq(6000)
      } else {
        throw e
      }
    }
  })

  it.only("Event me", async () => {
    const blockhash = await anchor
      .getProvider()
      .connection.getLatestBlockhash("confirmed");
    const newAccount = Keypair.generate()
    // 1. call to create account with data
    await program.methods.initialize()
      .accounts({
        data: newAccount.publicKey,
        payer: provider.wallet.publicKey,
      })
      .signers([newAccount])
      .rpc()
    // 2. call to get event
    // 2.1 register listener
    const eventListener = program.addEventListener(DATA_EVENT_NAME, (event: DataEvent, slot, signature) => {
      console.log(`listener called, on transaction ${signature}`, event.data)
      // needed to remove otherwise the program never ends
      program.removeEventListener(eventListener)
    })
    // 2.2 call program emitting event
    const tx = await program.methods.eventMe()
      .accounts({
        data: newAccount.publicKey
      })
      .rpc()
    // 3. get data from the past transaction
    const confirm = await anchor
    .getProvider()
    .connection.confirmTransaction(
      {
        signature: tx,
        blockhash: blockhash.blockhash,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
      },
      "confirmed"
    );
    expect(confirm).not.null
    const txLog = await anchor.getProvider().connection.getTransaction(tx, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: undefined,
    });
    const anchorEventParser = new anchor.EventParser(program.programId, program.coder)
    // console.log(txLog.meta.logMessages)
    const parsedEvents = anchorEventParser.parseLogs(txLog.meta.logMessages)
    for (let event of parsedEvents) {
      console.log("emitted number: ", (event.data as DataEvent).data);
  }
  })
})
