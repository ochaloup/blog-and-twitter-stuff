import * as anchor from "@project-serum/anchor";
import { AnchorError, Program } from "@project-serum/anchor";
import {
  ComputeBudgetProgram,
  Finality,
  Keypair,
  SystemProgram,
  VersionedMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { BroadcastOptions, PendingTransaction, SolanaProvider, TransactionEnvelope, TransactionReceipt } from '@saberhq/solana-contrib'
import { SolanaRuntimeLimitations } from "../target/types/solana_runtime_limitations";
import { expect } from "chai";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";

describe("solana-runtime-limitations", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  
  const program = anchor.workspace
  .SolanaRuntimeLimitations as Program<SolanaRuntimeLimitations>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  provider.opts.skipPreflight = true
  // provider.opts.commitment = "confirmed"
  // provider.opts.preflightCommitment = "confirmed"
  // anchor.setProvider(anchor.AnchorProvider.local(undefined, provider.opts))
  const solanaProvider = SolanaProvider.init({
    connection: provider.connection,
    wallet: provider.wallet,
    opts: provider.opts,
  })

  it("transaction size limitation, size limit passed", async () => {
    const accountKey = Keypair.generate();
    // Maximal transaction size is 1232 this is maximal lenght of string to fit
    const data = "a".repeat(917);
    console.log("data len", data.length);
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
      .rpc();
    console.log("Sent tx", tx);
  });

  it("transaction size limitation", async () => {
    const accountKey = Keypair.generate();
    const data = "a".repeat(918);
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
        .rpc();
    } catch (e) {
      expect((e as Error).message.includes("Transaction too large"), e);
    }
  });

  it("transaction preset call", async () => {
    const accountKey = Keypair.generate();
    await program.methods
      // https://github.com/solana-labs/solana/blob/v1.14.13/sdk/bpf/c/inc/sol/deserialize.h#L16
      .dataSizeSupplierInit(10 * 1024) // MAX on one reallocate
      .accounts({
        dataAccount: accountKey.publicKey,
        payer: provider.publicKey,
      })
      .signers([accountKey])
      .rpc();
    const data = "a".repeat(918);
    // for 12 iterations: Error Code: AccountDidNotSerialize. Error Number: 3004. Error Message: Failed to serialize the account.
    const interations = 11;
    for (let i = 1; i <= interations; i++) {
      await program.methods
        .dataSizeSupplierAdd(data)
        .accounts({
          dataAccount: accountKey.publicKey,
        })
        .rpc();
    }
    const supplierAccount = await program.account.dataSupplierAccount.fetch(
      accountKey.publicKey
    );
    expect(supplierAccount.varString).equal(data.repeat(interations));

    const dataSizeLimitAccount = Keypair.generate();
    await program.methods
      .dataSizeSupplierSetup()
      .accountsStrict({
        dataAccount: accountKey.publicKey,
        dataSizeLimitAccount: dataSizeLimitAccount.publicKey,
        payer: provider.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([dataSizeLimitAccount])
      .rpc();
    const dataSizeLimit = await program.account.dataSizeLimitAccount.fetch(
      accountKey.publicKey
    );
    expect(dataSizeLimit.varString).equal(data.repeat(interations));
  });

  it.only("transaction reallocate call", async () => {
    const accountKey = Keypair.generate();
    await program.methods
      .dataSizeReallocateInit()
      .accounts({
        dataAccount: accountKey.publicKey,
        payer: provider.publicKey,
      })
      .signers([accountKey])
      .rpc();
    const data = "a".repeat(918);
    const interations = 12;
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
        .rpc();
      } else {
        const ix = await program.methods
          .dataSizeReallocateAdd(data)
          .accountsStrict({
            dataAccount: accountKey.publicKey,
            payer: provider.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .instruction();
        
        const signature = await provider.connection.sendTransaction(tx, [(provider.wallet as NodeWallet).payer], {skipPreflight: true})
        let txn = await provider.connection.getParsedTransaction(signature, "confirmed")
        while (!txn) {
          txn = await provider.connection.getParsedTransaction(signature, "confirmed")
        }
        console.log(i, "messages:", txn)
      }
    }
    const reallocateAccount = await program.account.dataSizeReallocateAccount.fetch(
      accountKey.publicKey
    );
    expect(reallocateAccount.varString).equal(data.repeat(interations));

    console.log("going to setup..................")
    const dataSizeLimitAccount = Keypair.generate();
    await program.methods
      .dataSizeReallocateSetup()
      .accountsStrict({
        dataAccount: accountKey.publicKey,
        dataSizeLimitAccount: dataSizeLimitAccount.publicKey,
        payer: provider.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([dataSizeLimitAccount])
      .rpc();
    const dataSizeLimit = await program.account.dataSizeLimitAccount.fetch(
      accountKey.publicKey
    );
    expect(dataSizeLimit.varString).equal(data.repeat(interations));
  });
});

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
      console.debug(
        'No txPending after execution failure (maybe in simulation mode?; ' +
          'consider `(anchor.getProvider() as AnchorProvider).opts.skipPreflight = true`)'
      )
    }
    throw e
  }
}