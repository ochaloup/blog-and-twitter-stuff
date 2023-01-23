import * as anchor from "@project-serum/anchor";
import { AnchorError, Program } from "@project-serum/anchor";
import {
  Keypair,
  SystemProgram,
  VersionedMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { SolanaRuntimeLimitations } from "../target/types/solana_runtime_limitations";
import { expect } from "chai";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";

describe("solana-runtime-limitations", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .SolanaRuntimeLimitations as Program<SolanaRuntimeLimitations>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  it("transaction size limitation, size limit passed", async () => {
    const accountKey = Keypair.generate();
    // Maximal transaction size is 1232; this is maximal lenght of string to fit
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

  it.only("transaction cpi call", async () => {
    const accountKey = Keypair.generate();
    await program.methods
      .dataSizeSupplierInit(10240)
      .accounts({
        dataAccount: accountKey.publicKey,
        payer: provider.publicKey,
      })
      .signers([accountKey])
      .rpc();
    const data = "a".repeat(918);
    await program.methods
      .dataSizeSupplierAdd(data)
      .accounts({
        dataAccount: accountKey.publicKey,
      })
      .rpc();
    let supplierAccount = await program.account.dataSupplierAccount.fetch(
      accountKey.publicKey
    );
    expect(supplierAccount.varString).equal(data);
  });
});
