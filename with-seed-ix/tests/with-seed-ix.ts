import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { encode } from '@project-serum/anchor/dist/cjs/utils/bytes/utf8'
import { WithSeedIx } from "../target/types/with_seed_ix";
import { BinaryReader } from 'borsh';
import {
  SystemProgram,
  PublicKey,
  Keypair,
  Transaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { expect } from "chai";

describe("with-seed-ix", () => {
  const anchorProvider = anchor.AnchorProvider.env()
  anchor.setProvider(anchorProvider);
  const program = anchor.workspace.WithSeedIx as Program<WithSeedIx>;

  const INITIALIZE_INIT_SEED = "initialize-init";

  before(async () => {
    console.log("wallet", anchorProvider.wallet.publicKey.toBase58(), "program", program.programId.toBase58())
  })

  async function readData(address: PublicKey): Promise<number> {
    const ai = await anchorProvider.connection.getAccountInfo(address)
    const reader = new BinaryReader(ai.data);
    return reader.buf.readUInt8(8); // offset 8 bytes for anchor
  }

  it("anchor init", async () => {
    const seed = 'hello'
    const address = PublicKey.findProgramAddressSync(
      [encode(INITIALIZE_INIT_SEED), encode(seed)],
      program.programId
    )[0]
    // signer of the transaction is only the wallet (it's rent payer as well)
    let tx = await program.methods.initializeInit('hello').accountsStrict({
      initializeInit: address,
      rentPayer: anchorProvider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    }).rpc();
    const ai = await anchorProvider.connection.getAccountInfo(address)
    let value = await readData(address)
    console.log('account info; owner', ai.owner.toBase58(), 'value', value)
    expect(value).to.equal(1)

    // check if we can change data
    tx = await program.methods.change(2).accountsStrict({
      initializeInit: address
    }).rpc();
    expect(await readData(address)).to.equal(2)
  });

  it("anchor zero", async () => {
    const address = Keypair.generate()
    const ix = SystemProgram.createAccount({
      fromPubkey: anchorProvider.wallet.publicKey,
      newAccountPubkey: address.publicKey,
      lamports: await anchorProvider.connection.getMinimumBalanceForRentExemption(8 + 1),
      space: 8 + 1,
      programId: program.programId,
    })
    let tx = new Transaction().add(ix)
    // needed to sign with address + with rent payer (i.e., fromPubkey -> wallet)
    const signature = await anchorProvider.sendAndConfirm(tx, [address])

    // signer of the transaction is only the wallet (it's rent payer as well)
    await program.methods.initializeZero().accountsStrict({
      initializeInit: address.publicKey
    }).rpc();
    const ai = await anchorProvider.connection.getAccountInfo(address.publicKey)
    let value = await readData(address.publicKey)
    console.log('account info; owner', ai.owner.toBase58(), 'value', value)
    expect(value).to.equal(1)

    // check if we can change data
    await program.methods.change(3).accountsStrict({
      initializeInit: address.publicKey
    }).rpc();
    expect(await readData(address.publicKey)).to.equal(3)
  });

  it("transfer&create", async () => {
    console.log("transfer creates the account when necessary")
    let keypair = Keypair.generate()
    let ix = SystemProgram.transfer({
      fromPubkey: anchorProvider.wallet.publicKey,
      toPubkey: keypair.publicKey,
      lamports: LAMPORTS_PER_SOL,
    })
    await anchorProvider.sendAndConfirm(new Transaction().add(ix), [])
    let ai = await anchorProvider.connection.getAccountInfo(keypair.publicKey)
    expect(ai.lamports).to.equal(LAMPORTS_PER_SOL)
    console.log('account info transfer; owner', ai.owner.toBase58(), 'lamports', ai.lamports)

    console.log("transfer may delete the account when 0 lamports is left")
    ix = SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: anchorProvider.wallet.publicKey,
      lamports: LAMPORTS_PER_SOL,
    })
    await anchorProvider.sendAndConfirm(new Transaction().add(ix), [keypair])
    ai = await anchorProvider.connection.getAccountInfo(keypair.publicKey)
    expect(ai).to.be.null
    console.log('account info is null')

    console.log("transfer to unfunded account needs to transfer at least rent exception")
    keypair = Keypair.generate()
    ix = SystemProgram.transfer({
      fromPubkey: anchorProvider.wallet.publicKey,
      toPubkey: keypair.publicKey,
      lamports: await anchorProvider.connection.getMinimumBalanceForRentExemption(0) - 1,
    })
    try {
      await anchorProvider.sendAndConfirm(new Transaction().add(ix), [])
      throw new Error("Exepected error as not enough lamports to rent account")
    } catch (e) {
      expect(e.message).to.contain("insufficient funds for rent")
    }

    console.log("create account and transfer back from the created account")
    keypair = Keypair.generate()
    ix = SystemProgram.createAccount({
      fromPubkey: anchorProvider.wallet.publicKey,
      newAccountPubkey: keypair.publicKey,
      lamports: 2 * LAMPORTS_PER_SOL,
      // https://solana.stackexchange.com/questions/250/error-processing-instruction-0-invalid-program-argument-while-signing-transfe?rq=1#comment243_271
      space: 0, // for tranfer to work, the account needs to have no data
      programId: SystemProgram.programId,
    })
    let ix2 = SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: Keypair.generate().publicKey,
      lamports: LAMPORTS_PER_SOL,
    })
    await anchorProvider.sendAndConfirm(new Transaction().add(ix).add(ix2), [keypair])
    ai = await anchorProvider.connection.getAccountInfo(keypair.publicKey)
    console.log('account info create&transfer; owner', ai.owner.toBase58(), 'lamports', ai.lamports)

    console.log("assign the account to the program")
    ix = SystemProgram.assign({
      accountPubkey: keypair.publicKey,
      programId: program.programId,
    })
    await anchorProvider.sendAndConfirm(new Transaction().add(ix), [keypair])
    console.log('account info assign; owner', ai.owner.toBase58(), 'lamports', ai.lamports)

    console.log("we owns the private key of the account but we cannot transfer as owner is not the system program and the current program has different flow")
    try {
      let ix = SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: Keypair.generate().publicKey,
        lamports: LAMPORTS_PER_SOL,
      })
      await anchorProvider.sendAndConfirm(new Transaction().add(ix), [keypair])
      throw new Error("Exepected error as system program is not the owner of the account")
    } catch (e) {
      expect(e.message).to.contain("does not own")
    }

    console.log("when assigned we cannot change data straight away, limitation of anchor that requires 8 byte discriminator")
    try {
      await program.methods.change(1).accountsStrict({
        initializeInit: keypair.publicKey
      }).rpc();
      throw new Error("Exepected error as not initialized anchor discriminator")
    } catch (e) {
      expect(e.message).to.contain("No 8 byte discriminator")
    }
  });

  // https://github.com/solana-labs/solana-web3.js/blob/62513cdee2ca0c4f350e811a982ca13731201a9f/test/system-program.test.ts#L453
  it("create seeded", async () => {
    console.log("transfer creates the account when necessary, now seeded")
    const keypair = Keypair.generate()
    const seed = "seed"
    const seededAddress = await PublicKey.createWithSeed(keypair.publicKey, seed, program.programId)
    let ix = SystemProgram.createAccountWithSeed({
      fromPubkey: anchorProvider.wallet.publicKey,
      newAccountPubkey: seededAddress,
      basePubkey: keypair.publicKey,
      seed,
      programId: program.programId,
      lamports: LAMPORTS_PER_SOL,
      space: 8 + 1,
    })
    // seeded account needs to be signed by base pubkey
    await anchorProvider.sendAndConfirm(new Transaction().add(ix), [keypair])
    let ai = await anchorProvider.connection.getAccountInfo(seededAddress)
    expect(ai.lamports).to.equal(LAMPORTS_PER_SOL)
    console.log('account info seeded create; owner', ai.owner.toBase58(), 'lamports', ai.lamports)

    await program.methods.initializeZero().accountsStrict({
      initializeInit: seededAddress
    }).rpc();
    await program.methods.change(10).accountsStrict({
      initializeInit: seededAddress
    }).rpc();
    expect(await readData(seededAddress)).to.equal(10)
  });
});
