import { ethers } from "hardhat";

/**
 * Deploy CDP-related contracts to Base
 *
 * Contracts:
 * 1. X402Micropayments - Pay-per-request primitive
 * 2. VibeEscrow - Peer-to-peer escrow for services
 *
 * Usage:
 *   npx hardhat run scripts/deploy-cdp.ts --network base
 */

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // USDC on Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

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
  console.log("  Platform Fee:", await x402.platformFeeBps(), "bps (2.5%)");

  console.log("\n--- Deploying VibeEscrow ---");
  const VibeEscrow = await ethers.getContractFactory("VibeEscrow");
  const escrow = await VibeEscrow.deploy(USDC_ADDRESS, FEE_COLLECTOR, DEFAULT_ARBITER);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();

  console.log("✓ VibeEscrow deployed to:", escrowAddress);
  console.log("  USDC:", USDC_ADDRESS);
  console.log("  Fee Collector:", FEE_COLLECTOR);
  console.log("  Default Arbiter:", DEFAULT_ARBITER);
  console.log("  Timeout Period:", await escrow.timeoutPeriod(), "seconds (48 hours)");

  console.log("\n--- Deployment Summary ---");
  console.log(`
Add these to your .env file:

X402_CONTRACT_ADDRESS=${x402Address}
ESCROW_CONTRACT_ADDRESS=${escrowAddress}
USDC_ADDRESS=${USDC_ADDRESS}

Verify on Basescan:
npx hardhat verify --network base ${x402Address} "${USDC_ADDRESS}" "${FEE_COLLECTOR}"
npx hardhat verify --network base ${escrowAddress} "${USDC_ADDRESS}" "${FEE_COLLECTOR}" "${DEFAULT_ARBITER}"
  `);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
