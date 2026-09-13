/**
 * TraceLens — Deploy InvestigationAttestationRegistry
 *
 * 실행:
 *   npx hardhat node                                         # 터미널 1
 *   npx hardhat run scripts/deploy.js --network localhost     # 터미널 2
 *
 * 역할:
 *   1. Contract deploy
 *   2. Account 1, Account 2를 authorized issuer로 등록
 *   3. Contract address 출력
 *   4. ABI를 backend/app/contracts/ 에 복사
 */
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer, issuerA, issuerB] = await ethers.getSigners();

  console.log("═══════════════════════════════════════════════");
  console.log("  TraceLens — InvestigationAttestationRegistry");
  console.log("═══════════════════════════════════════════════");
  console.log();
  console.log("Deployer (Owner):", deployer.address);
  console.log("Institution A:   ", issuerA.address);
  console.log("Institution B:   ", issuerB.address);
  console.log();

  // 1. Deploy
  const Registry = await ethers.getContractFactory("InvestigationAttestationRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const contractAddress = await registry.getAddress();

  console.log("✅ Contract deployed at:", contractAddress);
  console.log();

  // 2. Authorize issuers
  let tx;
  tx = await registry.authorizeIssuer(issuerA.address);
  await tx.wait();
  console.log("✅ Authorized Institution A:", issuerA.address);

  tx = await registry.authorizeIssuer(issuerB.address);
  await tx.wait();
  console.log("✅ Authorized Institution B:", issuerB.address);
  console.log();

  // 3. Copy ABI to backend
  const artifactPath = path.join(
    __dirname, "..", "artifacts", "contracts",
    "InvestigationAttestationRegistry.sol",
    "InvestigationAttestationRegistry.json"
  );
  const backendContractsDir = path.join(__dirname, "..", "..", "backend", "app", "contracts");

  if (!fs.existsSync(backendContractsDir)) {
    fs.mkdirSync(backendContractsDir, { recursive: true });
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  const abiOnly = { abi: artifact.abi };
  const destPath = path.join(backendContractsDir, "InvestigationAttestationRegistry.json");
  fs.writeFileSync(destPath, JSON.stringify(abiOnly, null, 2));
  console.log("✅ ABI copied to:", destPath);
  console.log();

  // 4. Summary
  console.log("═══════════════════════════════════════════════");
  console.log("  Backend .env 설정");
  console.log("═══════════════════════════════════════════════");
  console.log();
  console.log(`  BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545`);
  console.log(`  CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`  ISSUER_PRIVATE_KEY=<Account 1 or 2 private key>`);
  console.log();
  console.log("  Hardhat default Account 1 (Institution A) private key:");
  console.log("  0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
  console.log();
  console.log("  Hardhat default Account 2 (Institution B) private key:");
  console.log("  0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
  console.log("═══════════════════════════════════════════════");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
