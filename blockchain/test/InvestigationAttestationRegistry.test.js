const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("InvestigationAttestationRegistry", function () {
  let registry;
  let owner, issuerA, issuerB, unauthorized;

  // 테스트용 Report Hash (SHA-256 결과를 bytes32로)
  const HASH_1 = ethers.keccak256(ethers.toUtf8Bytes("report-content-1"));
  const HASH_2 = ethers.keccak256(ethers.toUtf8Bytes("report-content-2"));
  const ZERO_HASH = ethers.ZeroHash;

  beforeEach(async function () {
    [owner, issuerA, issuerB, unauthorized] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("InvestigationAttestationRegistry");
    registry = await Registry.deploy();
    await registry.waitForDeployment();
  });

  // ── 1. Deployment ──────────────────────────

  it("should deploy with correct owner", async function () {
    expect(await registry.owner()).to.equal(owner.address);
  });

  // ── 2~3. Issuer Management ─────────────────

  it("should authorize issuer", async function () {
    await registry.authorizeIssuer(issuerA.address);
    expect(await registry.authorizedIssuers(issuerA.address)).to.be.true;
  });

  it("should reject unauthorized issuer authorization", async function () {
    await expect(
      registry.connect(issuerA).authorizeIssuer(issuerB.address)
    ).to.be.revertedWith("Not owner");
  });

  // ── 4~7. Issue Report ──────────────────────

  it("should issue report", async function () {
    await registry.authorizeIssuer(issuerA.address);
    await registry.connect(issuerA).issueReport(HASH_1);

    const [issuer, issuedAt, revoked] = await registry.getAttestation(HASH_1);
    expect(issuer).to.equal(issuerA.address);
    expect(issuedAt).to.be.gt(0);
    expect(revoked).to.be.false;
  });

  it("should reject issue from unauthorized address", async function () {
    await expect(
      registry.connect(unauthorized).issueReport(HASH_1)
    ).to.be.revertedWith("Not authorized issuer");
  });

  it("should reject zero hash", async function () {
    await registry.authorizeIssuer(issuerA.address);
    await expect(
      registry.connect(issuerA).issueReport(ZERO_HASH)
    ).to.be.revertedWith("Invalid hash");
  });

  it("should reject duplicate report hash", async function () {
    await registry.authorizeIssuer(issuerA.address);
    await registry.connect(issuerA).issueReport(HASH_1);
    await expect(
      registry.connect(issuerA).issueReport(HASH_1)
    ).to.be.revertedWith("Already issued");
  });

  // ── 8~9. Get Attestation ───────────────────

  it("should get attestation", async function () {
    await registry.authorizeIssuer(issuerA.address);
    await registry.connect(issuerA).issueReport(HASH_1);

    const [issuer, issuedAt, revoked] = await registry.getAttestation(HASH_1);
    expect(issuer).to.equal(issuerA.address);
    expect(issuedAt).to.be.gt(0);
    expect(revoked).to.be.false;
  });

  it("should return empty for non-existent hash", async function () {
    const [issuer, issuedAt, revoked] = await registry.getAttestation(HASH_2);
    expect(issuer).to.equal(ethers.ZeroAddress);
    expect(issuedAt).to.equal(0);
    expect(revoked).to.be.false;
  });

  // ── 10~13. Revoke Report ───────────────────

  it("should revoke report by issuer", async function () {
    await registry.authorizeIssuer(issuerA.address);
    await registry.connect(issuerA).issueReport(HASH_1);
    await registry.connect(issuerA).revokeReport(HASH_1);

    const [, , revoked] = await registry.getAttestation(HASH_1);
    expect(revoked).to.be.true;
  });

  it("should reject revoke by non-issuer", async function () {
    await registry.authorizeIssuer(issuerA.address);
    await registry.connect(issuerA).issueReport(HASH_1);
    await expect(
      registry.connect(issuerB).revokeReport(HASH_1)
    ).to.be.revertedWith("Only issuer can revoke");
  });

  it("should reject revoke of already revoked report", async function () {
    await registry.authorizeIssuer(issuerA.address);
    await registry.connect(issuerA).issueReport(HASH_1);
    await registry.connect(issuerA).revokeReport(HASH_1);
    await expect(
      registry.connect(issuerA).revokeReport(HASH_1)
    ).to.be.revertedWith("Already revoked");
  });

  it("should reject revoke of non-existent report", async function () {
    await expect(
      registry.connect(issuerA).revokeReport(HASH_2)
    ).to.be.revertedWith("Report not found");
  });

  // ── 14~15. Events ──────────────────────────

  it("should emit ReportIssued event", async function () {
    await registry.authorizeIssuer(issuerA.address);
    await expect(registry.connect(issuerA).issueReport(HASH_1))
      .to.emit(registry, "ReportIssued")
      .withArgs(HASH_1, issuerA.address, (value) => value > 0);
  });

  it("should emit ReportRevoked event", async function () {
    await registry.authorizeIssuer(issuerA.address);
    await registry.connect(issuerA).issueReport(HASH_1);
    await expect(registry.connect(issuerA).revokeReport(HASH_1))
      .to.emit(registry, "ReportRevoked")
      .withArgs(HASH_1, issuerA.address, (value) => value > 0);
  });

  // ── 16~18. isActive ────────────────────────

  it("isActive should return true for active report", async function () {
    await registry.authorizeIssuer(issuerA.address);
    await registry.connect(issuerA).issueReport(HASH_1);
    expect(await registry.isActive(HASH_1)).to.be.true;
  });

  it("isActive should return false for revoked report", async function () {
    await registry.authorizeIssuer(issuerA.address);
    await registry.connect(issuerA).issueReport(HASH_1);
    await registry.connect(issuerA).revokeReport(HASH_1);
    expect(await registry.isActive(HASH_1)).to.be.false;
  });

  it("isActive should return false for non-existent report", async function () {
    expect(await registry.isActive(HASH_2)).to.be.false;
  });
});
