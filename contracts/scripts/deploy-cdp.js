const { ethers } = require("hardhat");

/**
 * Deploy CDP-related contracts to Base
 *
 * Contracts:
 * 1. X402Micropayments - Pay-per-request primitive
 * 2. VibeEscrow - Peer-to-peer escrow for services
 *
 * Usage:
 *   npx hardhat run scripts/deploy-cdp.js --network base-sepolia
 *   npx hardhat run scripts/deploy-cdp.js --network base
 */

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // USDC address (testnet or mainnet depending on network)
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  // Fee collector (vibe treasury)
  const FEE_COLLECTOR = process.env.FEE_COLLECTOR || deployer.address;

  // Default arbiter for disputes
  const DEFAULT_ARBITER = process.env.DEFAULT_ARBITER || deployer.address;

  console.log("\n--- Deploying X402Micropayments ---");
  const X402 = await ethers.getContractFactory("X402Micropayments");
  const x402 = await X402.deploy(USDC_ADDRESS, FEE_COLLECTOR);
  await x402.waitForDeployment();
  const x402Address = await x402.getAddress();

  console.log("✓ X402Micropayments deployed to:", x402Address);
  console.log("  USDC:", USDC_ADDRESS);
  console.log("  Fee Collector:", FEE_COLLECTOR);

  console.log("\n--- Deploying VibeEscrow ---");
  const VibeEscrow = await ethers.getContractFactory("VibeEscrow");
  const escrow = await VibeEscrow.deploy(USDC_ADDRESS, FEE_COLLECTOR, DEFAULT_ARBITER);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();

  console.log("✓ VibeEscrow deployed to:", escrowAddress);
  console.log("  USDC:", USDC_ADDRESS);
  console.log("  Fee Collector:", FEE_COLLECTOR);
  console.log("  Default Arbiter:", DEFAULT_ARBITER);

  console.log("\n--- Deployment Summary ---");
  console.log(`
Add these to your .env file:

X402_CONTRACT_ADDRESS=${x402Address}
ESCROW_CONTRACT_ADDRESS=${escrowAddress}
USDC_ADDRESS=${USDC_ADDRESS}

Verify on Basescan:
npx hardhat verify --network base-sepolia ${x402Address} "${USDC_ADDRESS}" "${FEE_COLLECTOR}"
npx hardhat verify --network base-sepolia ${escrowAddress} "${USDC_ADDRESS}" "${FEE_COLLECTOR}" "${DEFAULT_ARBITER}"
  `);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
