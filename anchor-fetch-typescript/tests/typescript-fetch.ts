import * as anchor from "@coral-xyz/anchor"
import { Program, AnchorProvider, IdlTypes, IdlAccounts, AnchorError, IdlEvents } from "@coral-xyz/anchor"
import { Keypair, PublicKey } from '@solana/web3.js'
import * as idl from "../target/types/typescript_fetch"

import { expect } from "chai"
import { inspect, isDeepStrictEqual } from 'util'

// Anchor type declaration
// IDL
const TypescriptFetchIDL = idl.IDL
type TypescriptFetchProgram = Program<idl.TypescriptFetch>

// Loading constants from IDL defined in contract
const programIdAsString = JSON.parse(
  TypescriptFetchIDL.constants.find(x => x.name === 'PROGRAM_ID')!.value
)
export const PROGRAM_ID = new PublicKey(programIdAsString)

const INT_VAR_CONSTANT = JSON.parse(
  TypescriptFetchIDL.constants.find(x => x.name === 'DEFAULT_INT_VAR')!.value
)
// TODO: work with seed constant
// export const PRINT_MESSAGE_ACCOUNT_SEED = JSON.parse(
//   TypescriptFetchIDL.constants.find(x => x.name === 'PRINT_MESSAGE_ACCOUNT_SEED')!
//     .value
// )

// Type of Account that is fetch (created by initialize_data instruction)
type Data = IdlAccounts<idl.TypescriptFetch>["data"]
// Type of enum and struct used in Data account
type DataEnum = IdlTypes<idl.TypescriptFetch>["DataEnum"]
type DataStruct = IdlTypes<idl.TypescriptFetch>["DataStruct"]
// Event emitted when Data account created
const DATA_EVENT_NAME = "DataEvent"
type DataEvent = IdlEvents<idl.TypescriptFetch>[typeof DATA_EVENT_NAME]
// Errors loading
const typescriptFetchErrors = anchor.parseIdlErrors(TypescriptFetchIDL)

describe("typescript-fetch", () => {
  // using Anchor tools to get a provider and load program belonging to the workspace
  anchor.setProvider(anchor.AnchorProvider.env())
  const provider = anchor.getProvider() as AnchorProvider

  // to load from workspace, the info about program is loaded from Anchor.toml
  const program: TypescriptFetchProgram = anchor.workspace.TypescriptFetch as Program<idl.TypescriptFetch>
  // load program through IDL and programId loaded as constant
  const program2: TypescriptFetchProgram = new Program<idl.TypescriptFetch>(TypescriptFetchIDL, PROGRAM_ID, provider)



  it.only("Initialize data account", async () => {
    const newAccount = Keypair.generate()

    // found current blockhash (used to search for tx later)
    const blockhash = await anchor
      .getProvider()
      .connection.getLatestBlockhash();

    // 0. register event & listener
    const event = new Promise<DataEvent>(resolve => {
      const listener = program.addEventListener(
        DATA_EVENT_NAME,
        async event => {
          // listener has to be removed before exit, otherwise the program never ends
          await program.removeEventListener(listener)
          resolve(event)
        }
      )
    })

    // 1. call to create account with data
    const tx = await program.methods.initializeData()
      .accounts({
        data: newAccount.publicKey,
        payer: provider.wallet.publicKey,
      })
      .signers([newAccount])
      .rpc()

    // 2. load created account
    const accountData: Data = await program.account.data.fetch(newAccount.publicKey)
    const accountData2: Data = await program2.account.data.fetch(newAccount.publicKey)
    const accountEnum: DataEnum = accountData.enumVar
    const accountStruct: DataStruct = accountData.structVar
    switch (Object.keys(accountEnum)[0]) {
      case "one":
        break
      default:
        throw new Error("Invalid enum value, enumVar expected being 'one'")
    }
    expect(accountData.intVar).eq(INT_VAR_CONSTANT)
    expect(accountData2.intVar).eq(INT_VAR_CONSTANT)
    expect(accountEnum.one).to.exist
    expect(accountEnum.two).not.to.exist
    expect(accountStruct.index).eq(1)

    // 2.b load created account decoding getAccountInfo
    const accountDataInfo = await program.provider.connection.getAccountInfo(newAccount.publicKey)
    expect(accountDataInfo.data.length).greaterThan(0)
    const decodedAccountData = program.coder.accounts.decode<Data>(
      "Data",
      accountDataInfo.data
    )
    expect(decodedAccountData.intVar).eq(INT_VAR_CONSTANT)

    // NOTE:
    // On JavasScript comparison of different objects
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

    // 4. get event and check it
    await event.then(processedEvent => {
      expect(processedEvent.intVar).equal(INT_VAR_CONSTANT)
    })

    // 5. get data from the initializeData transaction
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

    // 6. parsing log from transaction to get anchor event
    const anchorEventParser = new anchor.EventParser(program.programId, program.coder)
    const parsedEvents = anchorEventParser.parseLogs(txLog.meta.logMessages)
    for (let event of parsedEvents) {
      console.log("emitted number: ", (event.data as DataEvent).intVar);
    }
  })

  it.only("Error me", async () => {
    // 1. call to get error
    try {
      await program.methods.errorMe()
        .rpc()
      expect.fail("Error expected")
    } catch (e) {
      if (e instanceof AnchorError) {
        const errNumber = 6000
        expect(e.error.errorCode.number).eq(errNumber)
        // check error.rs, expecting code 6000 that is 'You get an error' string
        const errMsg = typescriptFetchErrors.get(errNumber)
        expect(errMsg).equal("You get an error")
        const programError = anchor.translateError(e, typescriptFetchErrors)
        expect(programError.error.errorMessage).equal(errMsg)
      } else {
        throw e
      }
    }
  })

})
