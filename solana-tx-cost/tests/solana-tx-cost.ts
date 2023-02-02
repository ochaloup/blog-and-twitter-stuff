import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolanaProvider, TransactionEnvelope } from "@saberhq/solana-contrib";
import { SolanaTxCost } from "../target/types/solana_tx_cost";
import {
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  ComputeBudgetProgram,
  Keypair
} from "@solana/web3.js";
import BN from "bn.js";
import { expect } from "chai";

describe("solana-tx-cost", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const anchorProvider = anchor.getProvider() as anchor.AnchorProvider;
  anchorProvider.opts.skipPreflight = true;
  const solanaProvider = SolanaProvider.init({
    connection: anchorProvider.connection,
    wallet: anchorProvider.wallet,
    opts: anchorProvider.opts,
  });

  const program = anchor.workspace.SolanaTxCost as Program<SolanaTxCost>;

  const DEFAULT_NUMBER_OF_COMPUTE_UNITS_PER_TX = 200_000;
  const DEFAULT_SIGNATURE_FEE = 5000

  async function getLamports(): Promise<BN> {
    const num = await solanaProvider.connection.getBalance(
      solanaProvider.wallet.publicKey
    );
    // const aiLamports = (
    //   await solanaProvider.connection.getAccountInfo(solanaProvider.wallet.publicKey)
    // ).lamports
    return new BN(num.toString());
  }

  it("call simple", async () => {
    const lamportsBefore = await getLamports();

    // transaction is automatically signed by the wallet
    const ix = await program.methods.simple().instruction();
    const tx = new TransactionEnvelope(solanaProvider, [ix], []);
    const txSignature = await tx.confirm();

    const afterLamports = await getLamports();
    const feeCalculated = lamportsBefore.sub(afterLamports)
    console.log(
      "CALL SIMPLE:",
      "Signature",
      txSignature.signature,
      "receipt fee",
      txSignature.response.meta.fee,
      "before",
      lamportsBefore.toString(),
      "after",
      afterLamports.toString(),
      "calculation",
      feeCalculated.toString()
    );
    expect(feeCalculated.toNumber()).eq(txSignature.response.meta.fee);
    expect(feeCalculated.toNumber()).eq(DEFAULT_SIGNATURE_FEE);
  });

  it.only("call with siganture", async () => {
    const lamportsBefore = await getLamports();

    // transaction is automatically signed by the wallet + one more signature
    const additionalSignature = Keypair.generate();
    const ix = await program.methods.withSignature().accounts({
      signer: additionalSignature.publicKey,
    }).instruction();
    const tx = new TransactionEnvelope(solanaProvider, [ix], [additionalSignature]);
    const txSignature = await tx.confirm();

    const afterLamports = await getLamports();
    const feeCalculated = lamportsBefore.sub(afterLamports)
    console.log(
      "CALL WITH SIGNATURE:",
      "Signature",
      txSignature.signature,
      "receipt fee",
      txSignature.response.meta.fee,
      "before",
      lamportsBefore.toString(),
      "after",
      afterLamports.toString(),
      "calculation",
      feeCalculated.toString()
    );
    expect(feeCalculated.toNumber()).eq(txSignature.response.meta.fee);
    expect(feeCalculated.toNumber()).eq(DEFAULT_SIGNATURE_FEE * 2);
    expect(tx.signers.length).eq(1); // wallet is not mentioned, it's added automatically on send/confirm()
  });

  it("transfer bare", async () => {
    const lamportsBefore = await getLamports();

    // https://docs.rs/solana-program/latest/src/solana_program/rent.rs.html#31
    const rentExceptionLamports = new BN(
      await solanaProvider.connection.getMinimumBalanceForRentExemption(0)
    );

    const somePubkey = PublicKey.unique();
    const ix = SystemProgram.transfer({
      fromPubkey: solanaProvider.wallet.publicKey,
      toPubkey: somePubkey,
      lamports: rentExceptionLamports.toNumber(),
    });
    const tx = new TransactionEnvelope(solanaProvider, [ix], []);

    const recentBlockhash =
      await solanaProvider.connection.getLatestBlockhash();
    const web3jsTransaction = new Transaction({
      blockhash: recentBlockhash.blockhash,
      lastValidBlockHeight: recentBlockhash.lastValidBlockHeight,
      feePayer: anchorProvider.publicKey,
    }).add(ix);
    const estimatedFee = await web3jsTransaction.getEstimatedFee(
      solanaProvider.connection
    );
    console.log("estimatedFee", estimatedFee);

    const txSignature = await tx.confirm();

    // https://github.com/solana-labs/solana/blob/v1.14.13/program-runtime/src/prioritization_fee.rs#L17
    // https://github.com/solana-labs/solana/blob/v1.14.13/program-runtime/src/compute_budget.rs#L13
    // default CU (compute unit limit) is 200_000, default fee for CU is

    const afterLamports = await getLamports();
    const feeCalculated = lamportsBefore
      .sub(rentExceptionLamports)
      .sub(afterLamports);
    console.log(
      "TRANSFER BARE:",
      "Signature",
      txSignature.signature,
      "receipt fee",
      txSignature.response.meta.fee,
      "before",
      lamportsBefore.toString(),
      "rentExceptionLamports",
      rentExceptionLamports.toString(),
      "after",
      afterLamports.toString(),
      "calculation",
      feeCalculated.toString()
    );
    expect(feeCalculated.toNumber()).eq(txSignature.response.meta.fee);
  });

  it("transfer priority fee", async () => {
    const lamportsBefore = await getLamports();
    const transferAmount = new BN(LAMPORTS_PER_SOL.toString());

    const somePubkey = PublicKey.unique();
    const microLamportsPerComputeUnit = 1_000_000; // 1 LAMPORT per CU
    const priceIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: microLamportsPerComputeUnit,
    });
    const transferIx = SystemProgram.transfer({
      fromPubkey: solanaProvider.wallet.publicKey,
      toPubkey: somePubkey,
      lamports: transferAmount.toNumber(),
    });
    const tx = new TransactionEnvelope(
      solanaProvider,
      [priceIx, transferIx],
      []
    );
    const txSignature = await tx.confirm();

    const afterLamports = await getLamports();
    const feeCalculated = lamportsBefore.sub(transferAmount).sub(afterLamports);
    console.log(
      "TRANSFER PRIORITY FEE:",
      "Signature",
      txSignature.signature,
      "receipt fee",
      txSignature.response.meta.fee,
      "before",
      lamportsBefore.toString(),
      "after",
      afterLamports.toString(),
      "calculation",
      feeCalculated.toString()
    );

    expect(feeCalculated.toNumber()).eq(
      txSignature.response.meta.fee
    );
    expect(feeCalculated.toNumber() - DEFAULT_SIGNATURE_FEE).eq(
      DEFAULT_NUMBER_OF_COMPUTE_UNITS_PER_TX // we set 1 LAMPORT per CU
    );
    expect(feeCalculated.toNumber()).eq(DEFAULT_SIGNATURE_FEE * 2);
  });

  it.only("call with signature set compute units", async () => {
    const lamportsBefore = await getLamports();

    const computeUnitsSet = 1000;
    const setUnitsIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: computeUnitsSet,
    });
    const additionalSignature = Keypair.generate();
    const ix = await program.methods.withSignature().accounts({
      signer: additionalSignature.publicKey,
    }).instruction();
    const tx = new TransactionEnvelope(
      solanaProvider,
      [setUnitsIx, ix],
      [additionalSignature]
    );
    const txSignature = await tx.confirm();

    const afterLamports = await getLamports();
    const feeCalculated = lamportsBefore.sub(afterLamports);
    console.log(
      "CALL WITH SIGNATURE SET COMPUTE UNITS:",
      "Signature",
      txSignature.signature,
      "receipt fee",
      txSignature.response.meta.fee,
      "before",
      lamportsBefore.toString(),
      "after",
      afterLamports.toString(),
      "calculation",
      feeCalculated.toString()
    );

    expect(feeCalculated.toNumber()).eq(
      txSignature.response.meta.fee
    );
  });

  it.only("transfer set units and priority fee", async () => {
    const lamportsBefore = await getLamports();
    const transferAmount = new BN(LAMPORTS_PER_SOL.toString());

    const somePubkey = PublicKey.unique();
    const computeUnitsSet = 0; // TODO: it's maybe a bug
    const microLamportsPerComputeUnit = 500_000; // 0.5 of LAMPORT per CU
    const setUnitsIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: computeUnitsSet,
    });
    // what priority the transaction has is calculated within solana code
    // refer to this issue on some details https://github.com/solana-labs/solana/issues/25604
    const priceIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: microLamportsPerComputeUnit,
    });
    const transferIx = SystemProgram.transfer({
      fromPubkey: solanaProvider.wallet.publicKey,
      toPubkey: somePubkey,
      lamports: transferAmount.toNumber(),
    });
    const tx = new TransactionEnvelope(
      solanaProvider,
      [setUnitsIx, priceIx, transferIx],
      []
    );
    const txSignature = await tx.confirm();

    const afterLamports = await getLamports();
    const feeCalculated = lamportsBefore.sub(transferAmount).sub(afterLamports);
    console.log(
      "TRANSFER SET UNITS and PRIORITY FEE:",
      "Signature",
      txSignature.signature,
      "receipt fee",
      txSignature.response.meta.fee,
      "before",
      lamportsBefore.toString(),
      "after",
      afterLamports.toString(),
      "calculation",
      feeCalculated.toString()
    );
    expect(feeCalculated.toNumber()).eq(
      txSignature.response.meta.fee
    );
  });
});

// TODO: heap size to be bigger than 32 * 1024
// https://github.com/solana-labs/solana/blob/edd5f6f3be767480ae8724e64d42428702d530b0/sdk/program/src/entrypoint.rs#L36
// https://github.com/solana-labs/solana/blob/0a3e52ba8b4f63c3675fa91fc89c4f54f69e5855/program-runtime/src/compute_budget.rs#L211
