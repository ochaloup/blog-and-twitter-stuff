import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Keypair } from "@solana/web3.js";
import { SolanaRuntimeLimitations } from "../target/types/solana_runtime_limitations";

describe("solana-runtime-limitations", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaRuntimeLimitations as Program<SolanaRuntimeLimitations>;
  const provider = anchor.getProvider() as anchor.AnchorProvider

  it("transaction size limitation", async () => {
    const accountKey = Keypair.generate()
    const data = "a".repeat(1000)
    const tx = await program.methods
      .dataSizeLimit({
        data,
        space: 8 + 4 + data.length // anchor delimitar, space for lenght size, data
      })
      .accounts({
        dataAccount: accountKey.publicKey,
        payer: provider.publicKey
      })
      .signers([accountKey])
      .rpc();
    console.log("Your transaction signature", tx);
  });
});
