import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";
import { NeuroPass } from "../target/types/neuro_pass";
import * as crypto from "crypto";

// ─── helpers ──────────────────────────────────────────────────────────────────

function sha256(input: string): Buffer {
  return crypto.createHash("sha256").update(input).digest();
}

function toBytes32(buf: Buffer): number[] {
  return Array.from(buf.slice(0, 32));
}

function registryPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("registry")], programId);
}

function verifierPda(verifier: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("verifier"), verifier.toBuffer()],
    programId
  );
}

function skillPda(user: PublicKey, skillCount: BN, programId: PublicKey): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(skillCount.toString()));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("skill"), user.toBuffer(), buf],
    programId
  );
}

function credentialPda(mint: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("credential"), mint.toBuffer()],
    programId
  );
}

// ─── test suite ───────────────────────────────────────────────────────────────

describe("neuro_pass", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.NeuroPass as Program<NeuroPass>;
  const admin = provider.wallet as anchor.Wallet;

  const verifierKp = Keypair.generate();
  const userKp = Keypair.generate();
  const fakeMintKp = Keypair.generate(); // simulate an already-minted NFT

  let registryKey: PublicKey;
  let verifierRecordKey: PublicKey;
  let skillRecordKey: PublicKey;
  let credentialRecordKey: PublicKey;

  // Airdrop SOL to test wallets
  before(async () => {
    for (const kp of [verifierKp, userKp]) {
      const sig = await provider.connection.requestAirdrop(kp.publicKey, 2e9);
      await provider.connection.confirmTransaction(sig);
    }
    [registryKey] = registryPda(program.programId);
    [verifierRecordKey] = verifierPda(verifierKp.publicKey, program.programId);
  });

  // ── 1. Initialize ──────────────────────────────────────────────────────────
  it("initializes the registry", async () => {
    await program.methods
      .initialize()
      .accounts({
        registry: registryKey,
        admin: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const registry = await program.account.registry.fetch(registryKey);
    assert.equal(registry.admin.toBase58(), admin.publicKey.toBase58());
    assert.equal(registry.skillCount.toNumber(), 0);
    assert.equal(registry.verifierCount.toNumber(), 0);
  });

  // ── 2. Register verifier ───────────────────────────────────────────────────
  it("admin registers a verifier", async () => {
    await program.methods
      .registerVerifier(verifierKp.publicKey)
      .accounts({
        registry: registryKey,
        verifierRecord: verifierRecordKey,
        admin: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const vr = await program.account.verifierRecord.fetch(verifierRecordKey);
    assert.isTrue(vr.isActive);
    assert.equal(vr.verifier.toBase58(), verifierKp.publicKey.toBase58());

    const registry = await program.account.registry.fetch(registryKey);
    assert.equal(registry.verifierCount.toNumber(), 1);
  });

  // ── 3. Non-admin cannot register a verifier ────────────────────────────────
  it("rejects a non-admin attempting to register a verifier", async () => {
    const rogue = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(rogue.publicKey, 1e9);
    await provider.connection.confirmTransaction(sig);

    const [rogueVerifierRecord] = verifierPda(rogue.publicKey, program.programId);

    try {
      await program.methods
        .registerVerifier(rogue.publicKey)
        .accounts({
          registry: registryKey,
          verifierRecord: rogueVerifierRecord,
          admin: rogue.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([rogue])
        .rpc();
      assert.fail("Should have thrown");
    } catch (err: any) {
      assert.include(err.toString(), "Unauthorized");
    }
  });

  // ── 4. Submit skill ────────────────────────────────────────────────────────
  it("user submits a skill with a proof hash", async () => {
    const registry = await program.account.registry.fetch(registryKey);
    const currentCount = registry.skillCount;
    [skillRecordKey] = skillPda(userKp.publicKey, currentCount, program.programId);

    const proofHash = toBytes32(sha256("dummy-video-content"));
    const ipfsCid = "QmXyz123456789abcdefghijklmnopqrstuvwxyz012345";

    await program.methods
      .submitSkill("Soldering", proofHash, ipfsCid)
      .accounts({
        registry: registryKey,
        skillRecord: skillRecordKey,
        user: userKp.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([userKp])
      .rpc();

    const skill = await program.account.skillRecord.fetch(skillRecordKey);
    assert.equal(skill.skillName, "Soldering");
    assert.equal(skill.user.toBase58(), userKp.publicKey.toBase58());
    assert.deepEqual(Object.keys(skill.status), ["submitted"]);
    assert.deepEqual(Array.from(skill.proofHash), proofHash);

    const updatedRegistry = await program.account.registry.fetch(registryKey);
    assert.equal(updatedRegistry.skillCount.toNumber(), 1);
  });

  // ── 5. Self-verification guard ─────────────────────────────────────────────
  it("prevents a user from verifying their own skill", async () => {
    // Register the user as a verifier first
    const [userVerifierRecord] = verifierPda(userKp.publicKey, program.programId);
    await program.methods
      .registerVerifier(userKp.publicKey)
      .accounts({
        registry: registryKey,
        verifierRecord: userVerifierRecord,
        admin: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    try {
      await program.methods
        .verifySkill({ approve: {} }, toBytes32(sha256("comment")))
        .accounts({
          verifierRecord: userVerifierRecord,
          skillRecord: skillRecordKey,
          verifier: userKp.publicKey,
        })
        .signers([userKp])
        .rpc();
      assert.fail("Should have thrown");
    } catch (err: any) {
      assert.include(err.toString(), "SelfVerification");
    }
  });

  // ── 6. Verifier approves skill ─────────────────────────────────────────────
  it("verifier approves the skill", async () => {
    const commentHash = toBytes32(sha256("Excellent hands-on demonstration"));

    await program.methods
      .verifySkill({ approve: {} }, commentHash)
      .accounts({
        verifierRecord: verifierRecordKey,
        skillRecord: skillRecordKey,
        verifier: verifierKp.publicKey,
      })
      .signers([verifierKp])
      .rpc();

    const skill = await program.account.skillRecord.fetch(skillRecordKey);
    assert.deepEqual(Object.keys(skill.status), ["verified"]);
    assert.equal(skill.verifier.toBase58(), verifierKp.publicKey.toBase58());

    const vr = await program.account.verifierRecord.fetch(verifierRecordKey);
    assert.equal(vr.reputationScore.toNumber(), 1);
    assert.equal(vr.totalVerifications.toNumber(), 1);
  });

  // ── 7. Cannot double-verify ────────────────────────────────────────────────
  it("rejects a second verification attempt on an already-processed skill", async () => {
    try {
      await program.methods
        .verifySkill({ reject: {} }, toBytes32(sha256("again")))
        .accounts({
          verifierRecord: verifierRecordKey,
          skillRecord: skillRecordKey,
          verifier: verifierKp.publicKey,
        })
        .signers([verifierKp])
        .rpc();
      assert.fail("Should have thrown");
    } catch (err: any) {
      assert.include(err.toString(), "AlreadyProcessed");
    }
  });

  // ── 8. Record credential ───────────────────────────────────────────────────
  it("anchors the minted NFT credential on-chain", async () => {
    [credentialRecordKey] = credentialPda(fakeMintKp.publicKey, program.programId);

    await program.methods
      .recordCredential("ipfs://QmCredentialMetadata123456789")
      .accounts({
        skillRecord: skillRecordKey,
        mint: fakeMintKp.publicKey,
        credentialRecord: credentialRecordKey,
        user: userKp.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([userKp])
      .rpc();

    const cr = await program.account.credentialRecord.fetch(credentialRecordKey);
    assert.equal(cr.mint.toBase58(), fakeMintKp.publicKey.toBase58());
    assert.equal(cr.user.toBase58(), userKp.publicKey.toBase58());
    assert.equal(cr.verifier.toBase58(), verifierKp.publicKey.toBase58());
    assert.equal(cr.metadataUri, "ipfs://QmCredentialMetadata123456789");

    const skill = await program.account.skillRecord.fetch(skillRecordKey);
    assert.deepEqual(Array.from(cr.proofHash), Array.from(skill.proofHash));
  });

  // ── 9. Public verification — hash check ───────────────────────────────────
  it("public verifier can read credential and validate the proof hash", async () => {
    const cr = await program.account.credentialRecord.fetch(credentialRecordKey);
    const expectedHash = toBytes32(sha256("dummy-video-content"));

    assert.deepEqual(Array.from(cr.proofHash), expectedHash,
      "On-chain proof hash matches the hash of the original file"
    );
    console.log("  Credential mint :", cr.mint.toBase58());
    console.log("  Proof hash      :", Buffer.from(cr.proofHash).toString("hex"));
    console.log("  Metadata URI    :", cr.metadataUri);
  });

  // ── 10. Revoke verifier ────────────────────────────────────────────────────
  it("admin revokes a verifier", async () => {
    await program.methods
      .revokeVerifier()
      .accounts({
        registry: registryKey,
        verifierRecord: verifierRecordKey,
        admin: admin.publicKey,
      })
      .rpc();

    const vr = await program.account.verifierRecord.fetch(verifierRecordKey);
    assert.isFalse(vr.isActive);
  });

  // ── 11. Revoked verifier cannot verify ────────────────────────────────────
  it("revoked verifier cannot process new submissions", async () => {
    // Submit a second skill
    const registry = await program.account.registry.fetch(registryKey);
    const [skill2] = skillPda(userKp.publicKey, registry.skillCount, program.programId);

    await program.methods
      .submitSkill("Welding", toBytes32(sha256("welding-video")), "QmWeldingCid")
      .accounts({
        registry: registryKey,
        skillRecord: skill2,
        user: userKp.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([userKp])
      .rpc();

    try {
      await program.methods
        .verifySkill({ approve: {} }, toBytes32(sha256("comment")))
        .accounts({
          verifierRecord: verifierRecordKey,
          skillRecord: skill2,
          verifier: verifierKp.publicKey,
        })
        .signers([verifierKp])
        .rpc();
      assert.fail("Should have thrown");
    } catch (err: any) {
      assert.include(err.toString(), "VerifierNotActive");
    }
  });
});
