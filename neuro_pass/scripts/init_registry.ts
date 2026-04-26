import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import idl from "../target/idl/neuro_pass.json";

const PROGRAM_ID = new PublicKey("F11FFZasp1pEGDaHoguWokQbenh7TLc5SWTz7pbDpVQD");

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new anchor.Program(idl as anchor.Idl, provider);

  const [registry] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    PROGRAM_ID
  );

  console.log("Registry PDA:", registry.toBase58());
  console.log("Admin:       ", provider.wallet.publicKey.toBase58());

  const tx = await program.methods
    .initialize()
    .accounts({
      registry,
      admin: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("\nRegistry initialized!");
  console.log("Tx signature:", tx);
  console.log("Explorer:    ", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);
}

main().catch(console.error);
