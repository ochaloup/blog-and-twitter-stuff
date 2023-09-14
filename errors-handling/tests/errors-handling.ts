import * as anchor from "@coral-xyz/anchor"
import { expect } from "chai"
import { ErrorsHandling } from "../target/types/errors_handling"
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet"

describe("errors-handling", () => {
  anchor.setProvider(anchor.AnchorProvider.env())
  const program = anchor.workspace
    .ErrorsHandling as anchor.Program<ErrorsHandling>
  const provider = anchor.getProvider() as anchor.AnchorProvider
  provider.opts.commitment = "processed"
  let latestBlockhash: {
    blockhash: string
    lastValidBlockHeight: number
  }

  beforeEach(async () => {
    latestBlockhash = await provider.connection.getLatestBlockhash()
  })

  it.only("Just transfer", async () => {
    const connection = new anchor.web3.Connection(provider.connection.rpcEndpoint, 'processed')
    const feePayer = (provider.wallet as NodeWallet).payer
    latestBlockhash = await connection.getLatestBlockhash()
    const receiver = anchor.web3.Keypair.generate()
    const ix = anchor.web3.SystemProgram.transfer({
      fromPubkey: feePayer.publicKey,
      toPubkey: receiver.publicKey,
      lamports: anchor.web3.LAMPORTS_PER_SOL,
    })
    const messageV0 = new anchor.web3.TransactionMessage({
      payerKey: feePayer.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [ix],
    }).compileToV0Message();
    const tx = new anchor.web3.VersionedTransaction(messageV0)
    tx.sign([feePayer])
    const txSignature = await connection.sendTransaction(tx)
    const startTime = Date.now()
    // expecting process happens here
    const confirmation = await connection.confirmTransaction({signature:txSignature, ...latestBlockhash}, 'processed')
    expect(confirmation.value.err).to.be.null
    console.log(confirmation, "current slot", await connection.getSlot())

    await connection.getTransaction(txSignature, {commitment: 'confirmed', maxSupportedTransactionVersion: undefined})
    // try {
    //   await connection.getTransaction(txSignature, {commitment: 'confirmed', maxSupportedTransactionVersion: undefined})
    //   throw new Error("Expecting error as we sent a versioned transaction but we expect to processes only the legacy one")
    // } catch (err) {
    //   expect(err.message).to.contains("maxSupportedTransactionVersion")
    // }
    const c = await connection.confirmTransaction({signature:txSignature, ...latestBlockhash}, 'confirmed')
    console.log('confirmation stuff', c)
    const txDataBefore = await connection.getTransaction(txSignature, {commitment: 'confirmed', maxSupportedTransactionVersion: 0})
    expect(txDataBefore).to.be.null // based on timing issues this is not always true but it highly expected (tx was just acknowledged to be 'processed' it takes some time to be 'confirmed')

    //// This prolongs the test significantly so it is commented out
    console.log("Waiting for the slot expires, i.e., 150 blocks =~ 60s")
    await new Promise((resolve) => setTimeout(resolve, 59 * 1000))
    while (confirmation.context.slot + 150 < (await connection.getSlot())) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    const confirmation2 = await connection.confirmTransaction(txSignature, "processed")
    console.log("confirmation2", confirmation2, "current slot", await connection.getSlot())
    expect(confirmation2.value.err).to.be.null
    const txData = await connection.getTransaction(txSignature, {commitment: 'finalized', maxSupportedTransactionVersion: 0})
    expect(txData.slot).to.equal(confirmation.context.slot)
  })
    
  it("SystemProgram Transfer: not signed, client not checked, not simulated", async () => {
    const fromKeypair = anchor.web3.Keypair.generate()
    const ix = anchor.web3.SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: provider.wallet.publicKey,
      lamports: anchor.web3.LAMPORTS_PER_SOL,
    })
    const txBuf = new anchor.web3.Transaction({
      ...latestBlockhash,
      feePayer: provider.wallet.publicKey,
    })
      .add(ix)
      .serialize({ verifySignatures: false, requireAllSignatures: false }) // NO check on client
    const txSig = await provider.connection.sendRawTransaction(txBuf, {
      skipPreflight: true, // NO simulation at RPC
      preflightCommitment: "processed",
    })

    try {
      await provider.connection.confirmTransaction(
        {
          signature: txSig,
          ...latestBlockhash,
          abortSignal: AbortSignal.timeout(3000),
        },
        "processed"
      )
      throw new Error("Expecting timeout as not processed transaction")
    } catch (err) {
      // Not waiting whole blockhash expiration time (~ 150 * 400ms = 60s)
      // and timed-outing just after 3s
      expect(err.message).to.equal("The operation was aborted due to timeout")
    }
  })

  it("SystemProgram Transfer: not signed, client not checked, simulated", async () => {
    const fromKeypair = anchor.web3.Keypair.generate()
    const ix = anchor.web3.SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: provider.wallet.publicKey,
      lamports: anchor.web3.LAMPORTS_PER_SOL,
    })
    const tx = new anchor.web3.Transaction({
      ...latestBlockhash,
      feePayer: provider.wallet.publicKey,
    })
      .add(ix)
    tx.partialSign(fromKeypair) // partial sign
    const txBuf = tx.serialize({ verifySignatures: false, requireAllSignatures: false })
    try {
      await provider.connection.sendRawTransaction(txBuf, {
        skipPreflight: false, // simulated == YES
        preflightCommitment: "processed",
      })
      throw new Error("Expecting signature error from simulation")
    } catch (err) {
      expect(err).instanceOf(anchor.web3.SendTransactionError)
      expect(err.message).to.equal(
        "failed to send transaction: Transaction signature verification failure"
      )
    }
  })

  it("SystemProgram Transfer: not signed, client checked", async () => {
    const fromKeypair = anchor.web3.Keypair.generate()
    const ix = anchor.web3.SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: provider.wallet.publicKey,
      lamports: anchor.web3.LAMPORTS_PER_SOL,
    })
    try {
      new anchor.web3.Transaction({
        ...latestBlockhash,
        feePayer: provider.wallet.publicKey,
      })
        .add(ix)
        .serialize({ verifySignatures: true, requireAllSignatures: true })
      throw new Error("Expecting signature error from client")
    } catch (err) {
      expect(err.message).to.equal("Signature verification failed")
    }
  })

  it("SystemProgram Transfer:  no funds, simulated", async () => {
    const fromKeypair = anchor.web3.Keypair.generate()
    const ix = anchor.web3.SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: provider.wallet.publicKey,
      lamports: anchor.web3.LAMPORTS_PER_SOL,
    })
    const tx = new anchor.web3.Transaction({
      ...latestBlockhash,
      feePayer: provider.wallet.publicKey,
    }).add(ix)
    try {
      await provider.sendAndConfirm(tx, [fromKeypair], {
        skipPreflight: false, // Simulated == YES
        preflightCommitment: "processed",
      })
      throw new Error("Expecting no funds error from simulation")
    } catch (err) {
      // failed to send transaction: Transaction simulation failed: Error processing Instruction 0: custom program error: 0x1
      expect(err).instanceOf(anchor.web3.SendTransactionError)
      expect((err as anchor.web3.SendTransactionError).name).to.equal("Error")
      expect((err as anchor.web3.SendTransactionError).message).contains("0x1")
      expect(
        (err as anchor.web3.SendTransactionError).logs.filter((i) =>
          i.includes("Transfer: insufficient lamports")
        )
      ).to.be.not.empty
    }
  })

  it("SystemProgram Transfer: no funds, not simulated", async () => {
    const fromKeypair = anchor.web3.Keypair.generate()
    const ix = anchor.web3.SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: provider.wallet.publicKey,
      lamports: anchor.web3.LAMPORTS_PER_SOL,
    })
    const tx = new anchor.web3.Transaction({
      ...latestBlockhash,
      feePayer: provider.wallet.publicKey,
    }).add(ix)
    try {
      await provider.sendAndConfirm(tx, [fromKeypair], {
        skipPreflight: true, // NOT Simulated
        preflightCommitment: "processed",
      })
      throw new Error("Expecting no funds error from confirm at chain")
    } catch (err) {
      // Error: Raw transaction <tx-signature> failed ({"err":{"InstructionError":[0,{"Custom":1}]}}) // ConfirmError
      expect(err).instanceOf(Error)
      expect((err as Error).name).to.equal("Error")
      expect((err as Error).message).contains(
        '"InstructionError":[0,{"Custom":1}]'
      )
    }
  })

  it("Anchor Program: anchor error from rpc()", async () => {
    try {
      await program.methods.errorMe().accounts({}).rpc()
      throw new Error("Expecting error me from anchor")
    } catch (err) {
      // Error: AnchorError occurred. Error Code: ErrorMeError. Error Number: 6000. Error Message: ErrorMe error.
      expect(err).instanceOf(anchor.AnchorError)
      expect((err as anchor.AnchorError).name).to.equal("Error")
      expect((err as anchor.AnchorError).error.errorCode.number).to.equal(6000)
      expect((err as anchor.AnchorError).error.errorCode.code).to.equal(
        "ErrorMeError"
      )
      expect((err as anchor.AnchorError).error.errorMessage).to.equal(
        "ErrorMe error"
      )
    }
  })

  it("Anchor Program: anchor error from provider transaction sending", async () => {
    const ix = await program.methods.errorMe().accounts({}).instruction()
    const tx = new anchor.web3.Transaction({
      ...latestBlockhash,
      feePayer: provider.wallet.publicKey,
    }).add(ix)
    try {
      await provider.sendAndConfirm(tx, [], {
        skipPreflight: false, // Simulated
        preflightCommitment: "processed",
      })
      throw new Error("Expecting anchor error thrown")
    } catch (err) {
      // Error: failed to send transaction: Transaction simulation failed: Error processing Instruction 0: custom program error: 0x1770
      expect(err).instanceOf(anchor.web3.SendTransactionError)
      expect((err as anchor.web3.SendTransactionError).name).to.equal("Error")
      expect((err as anchor.web3.SendTransactionError).message).contains(
        "custom program error: 0x1770"
      )
      const anchorError = anchor.AnchorError.parse(
        (err as anchor.web3.SendTransactionError).logs
      )
      expect(anchorError).is.not.null // null on parsing failure
      expect(anchorError.error.errorCode.number).to.equal(6000)
    }
  })

  it("Anchor Program: missing account client failure", async () => {
    try {
      // anchor verifies on client side when builder finishes on rpc() or instruction()
      // await program.methods.okMe().accounts({}).instruction()
      await program.methods.okMe().accounts({}).rpc()
      // await program.methods.okMe().accountsStrict({}).rpc()
      throw new Error("Expecting missing account from anchor")
    } catch (err) {
      // Error: Invalid arguments: me not provided.
      expect(err).instanceOf(Error)
      expect((err as Error).name).to.equal("Error")
      expect((err as Error).message).contains("me not provided")
      // console.log('error constructor:', err.constructor.name)
    }
  })

  it("Program: missing account on chain simulation", async () => {
    const ix = new anchor.web3.TransactionInstruction({
      programId: program.programId,
      keys: [],
      data: Buffer.from([236, 197, 203, 252, 43, 137, 43, 69]),
    })
    const tx = new anchor.web3.Transaction({
      ...latestBlockhash,
      feePayer: provider.wallet.publicKey,
    }).add(ix)

    try {
      await provider.sendAndConfirm(tx, [], {
        skipPreflight: false, // Simulated
        preflightCommitment: "processed",
      })
      throw new Error("Expecting anchor error thrown")
    } catch (err) {
      // Error: failed to send transaction: Transaction simulation failed: Error processing Instruction 0: custom program error: 0xbbd
      expect(err).instanceOf(anchor.web3.SendTransactionError)
      expect((err as anchor.web3.SendTransactionError).message).contains(
        "custom program error: 0xbbd"
      )
      const anchorError = anchor.AnchorError.parse(
        (err as anchor.web3.SendTransactionError).logs
      )
      expect(anchorError).is.not.null // null on parsing failure
      expect(anchorError.error.errorCode.number).to.equal(3005)
      expect(anchorError.error.errorMessage).to.equal(
        "Not enough account keys given to the instruction"
      )
    }
  })
})
