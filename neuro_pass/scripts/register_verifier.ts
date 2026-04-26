import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import idl from "../target/idl/neuro_pass.json";

const PROGRAM_ID = new PublicKey("F11FFZasp1pEGDaHoguWokQbenh7TLc5SWTz7pbDpVQD");
// The backend verifier wallet that was just generated
const VERIFIER_PUBKEY = new PublicKey("BwnAeNXAmozFNRBMqV8kk27KU9yrHnPV5UPFQHEk6snM");

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = new anchor.Program(idl as anchor.Idl, provider);

  const [registry] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    PROGRAM_ID
  );
  const [verifierRecord] = PublicKey.findProgramAddressSync(
    [Buffer.from("verifier"), VERIFIER_PUBKEY.toBuffer()],
    PROGRAM_ID
  );

  console.log("Registering verifier:", VERIFIER_PUBKEY.toBase58());

  const tx = await program.methods
    .registerVerifier(VERIFIER_PUBKEY)
    .accounts({
      registry,
      verifierRecord,
      admin: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Verifier registered! Tx:", tx);
  console.log("VerifierRecord PDA:", verifierRecord.toBase58());
  console.log("Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);
}

main().catch(console.error);
