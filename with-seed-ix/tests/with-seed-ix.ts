import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { WithSeedIx } from "../target/types/with_seed_ix";

describe("with-seed-ix", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.WithSeedIx as Program<WithSeedIx>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
