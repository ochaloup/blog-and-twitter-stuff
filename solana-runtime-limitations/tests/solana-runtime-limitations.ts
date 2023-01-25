import * as anchor from "@project-serum/anchor"
import { AnchorError, Program } from "@project-serum/anchor"
import {
  ComputeBudgetProgram,
  Finality,
  Keypair,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js"
import { BroadcastOptions, PendingTransaction, SolanaProvider, TransactionEnvelope, TransactionReceipt } from '@saberhq/solana-contrib'
import { SolanaRuntimeLimitations } from "../target/types/solana_runtime_limitations"
import { expect } from "chai"
import { BN } from "bn.js"

describe("solana-runtime-limitations", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env())
  
  const program = anchor.workspace
    .SolanaRuntimeLimitations as Program<SolanaRuntimeLimitations>
  // const preProvider = anchor.getProvider() as anchor.AnchorProvider
  const opts = anchor.AnchorProvider.defaultOptions()
  opts.commitment = 'confirmed'
  opts.preflightCommitment = 'confirmed'
  opts.skipPreflight = true
  const provider = anchor.AnchorProvider.local(anchor.AnchorProvider.env().connection.rpcEndpoint, opts)
  const solanaProvider = SolanaProvider.init({
    connection: provider.connection,
    wallet: provider.wallet,
    opts: provider.opts,
  })

  it("transaction size limitation, size limit passed", async () => {
    const accountKey = Keypair.generate()
    // Maximal transaction size is 1232 this is maximal lenght of string to fit
    const data = "a".repeat(917)
    console.log("data len", data.length)
    const tx = await program.methods
      .dataSizeLimit({
        data,
        space: 8 + 4 + data.length, // anchor delimitar, space for lenght size, data
      })
      .accounts({
        dataAccount: accountKey.publicKey,
        payer: provider.publicKey,
      })
      .signers([accountKey])
      .rpc()
    console.log("Sent tx", tx)
  })

  it("transaction size limitation", async () => {
    const accountKey = Keypair.generate()
    const data = "a".repeat(918)
    try {
      const tx = await program.methods
        .dataSizeLimit({
          data,
          space: 8 + 4 + data.length, // anchor delimiter, space for lenght size, data
        })
        .accounts({
          dataAccount: accountKey.publicKey,
          payer: provider.publicKey,
        })
        .signers([accountKey])
        .rpc()
      expect.fail("Size exceeded expected")
    } catch (e) {
      expect((e as Error).message.includes("Transaction too large"), e)
    }
  })

  it("transaction preset call", async () => {
    const accountKey = Keypair.generate()
    await program.methods
      // https://github.com/solana-labs/solana/blob/v1.14.13/sdk/bpf/c/inc/sol/deserialize.h#L16
      .dataSizeSupplierInit(10 * 1024) // MAX on one reallocate
      .accounts({
        dataAccount: accountKey.publicKey,
        payer: provider.publicKey,
      })
      .signers([accountKey])
      .rpc()
    const data = "a".repeat(918)
    // for 12 iterations: Error Code: AccountDidNotSerialize. Error Number: 3004. Error Message: Failed to serialize the account.
    const interations = 11
    for (let i = 1; i <= interations; i++) {
      await program.methods
        .dataSizeSupplierAdd(data)
        .accounts({
          dataAccount: accountKey.publicKey,
        })
        .rpc()
    }
    const supplierAccount = await program.account.dataSupplierAccount.fetch(
      accountKey.publicKey
    )
    expect(supplierAccount.varString).equal(data.repeat(interations))

    const dataSizeLimitAccount = Keypair.generate()
    await program.methods
      .dataSizeSupplierSetup()
      .accountsStrict({
        dataAccount: accountKey.publicKey,
        dataSizeLimitAccount: dataSizeLimitAccount.publicKey,
        payer: provider.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([dataSizeLimitAccount])
      .rpc()
    const dataSizeLimit = await program.account.dataSizeLimitAccount.fetch(
      dataSizeLimitAccount.publicKey
    )
    expect(dataSizeLimit.varString).equal(data.repeat(interations))
  })

  it("transaction reallocate call", async () => {
    const accountKey = Keypair.generate()
    await program.methods
      .dataSizeReallocateInit()
      .accounts({
        dataAccount: accountKey.publicKey,
        payer: provider.publicKey,
      })
      .signers([accountKey])
      .rpc()
    const data = "a".repeat(918)
    const interations = 11
    for (let i = 1; i <= interations; i++) {
      console.log("iiiiiiiiiiii", i)
      if (i < 12) {
        const tx = await program.methods
          .dataSizeReallocateAdd(data)
          .accountsStrict({
            dataAccount: accountKey.publicKey,
            payer: provider.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()
      } else {
        // TODO: not possible to exceed heap frame with IX requestHeapFrame
        const ix = await program.methods
          .dataSizeReallocateAdd(data)
          .accountsStrict({
            dataAccount: accountKey.publicKey,
            payer: provider.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .instruction()
        const tx = new TransactionEnvelope(solanaProvider, [ix])       
        await executeTx({tx, printLogs: true, exceedHeapFrame: 10 * 1024})
      }
    }
    const reallocateAccount = await program.account.dataSizeReallocateAccount.fetch(
      accountKey.publicKey
    )
    expect(reallocateAccount.varString).equal(data.repeat(interations))

    const dataSizeLimitAccount = Keypair.generate()
    await program.methods
      .dataSizeReallocateSetup()
      .accountsStrict({
        dataAccount: accountKey.publicKey,
        dataSizeLimitAccount: dataSizeLimitAccount.publicKey,
        payer: provider.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([dataSizeLimitAccount])
      .rpc()
    const dataSizeLimit = await program.account.dataSizeLimitAccount.fetch(
      dataSizeLimitAccount.publicKey
    )
    expect(dataSizeLimit.varString).equal(data.repeat(interations))
  })


  it("cu limit", async () => {
    const tx = await program.methods
      .cuLimitInit(new BN(10000))
      .rpc()
    let txData = await solanaProvider.connection.getTransaction(tx)
    while (!txData) {
      txData = await solanaProvider.connection.getTransaction(tx)
    }
    console.log("Tx", tx, "consumed CU", txData.meta.computeUnitsConsumed)
  })

  it.only("memory deallocation", async () => {
    const strData = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz'.repeat(3)
    let ix = await program.methods
      .memoryDeallocation(strData, 200)
      .instruction()
    const tx = new TransactionEnvelope(solanaProvider, [ix, ix])
    await executeTx({tx, printLogs: true})

    try {
      const ixFail = await program.methods
        .memoryDeallocation(strData, 400)
        .instruction()
      const txFail = new TransactionEnvelope(solanaProvider, [ixFail])
      await executeTx({tx: txFail, printLogs: true})
    } catch (e) {
      expect((e as Error).message.includes("Transaction too large"), e)
    }
  })
})


async function executeTx({
  tx,
  opts = undefined,
  commitment = undefined,
  printLogs = undefined,
  exceedComputeBudget = undefined,
  exceedHeapFrame = undefined,
}: {
  tx: TransactionEnvelope
  opts?: BroadcastOptions
  commitment?: Finality
  printLogs?: boolean
  exceedComputeBudget?: number
  exceedHeapFrame?: number
}): Promise<TransactionReceipt> {
  // when needed to exceed compute budget, preparing instructions
  if (exceedComputeBudget && exceedComputeBudget > 0) {
    tx = tx.prepend(
      ComputeBudgetProgram.setComputeUnitLimit({ units: exceedComputeBudget })
    )
  }
  if (exceedHeapFrame && exceedHeapFrame > 0) {
    // console.log('exceeding heapframe', exceedHeapFrame)
    tx = tx.prepend(
      ComputeBudgetProgram.requestHeapFrame({ bytes: exceedHeapFrame })
    )
    // const ix = ComputeBudgetProgram.requestHeapFrame({ bytes: exceedHeapFrame })
    // ix.data = Buffer.from(
    //   Uint8Array.of(1, ...new BN(10 * 1024).toArray("le", 4))
    // )
  }

  let txPending: PendingTransaction | undefined
  try {
    txPending = await tx.send(opts)
    const txReceipt = await txPending.wait({ commitment })
    if (printLogs) txReceipt.printLogs()
    return txReceipt
  } catch (e) {
    if (txPending) {
      const txReceipt = await txPending.pollForReceipt()
      txReceipt.printLogs()
    } else {
      // consider: (anchor.getProvider() as AnchorProvider).opts.skipPreflight = true)
      // NOTE: error on Typescript side could be for example validation of Anchor IDL
      console.debug("Transaction failed at client typescript side or in simulation mode. Instruction programs:")
      tx.instructions.forEach((value, index) => console.debug(`[${index}]:${(value as TransactionInstruction).programId.toBase58()}`))
    }
    throw e
  }
}