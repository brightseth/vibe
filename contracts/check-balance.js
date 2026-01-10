#!/usr/bin/env node
require('dotenv').config();
const { ethers } = require('hardhat');

async function checkBalance() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
  const address = "0xe510B2A4D22CFbB336E442857424916cd1b6dCce";

  console.log('Checking balance on Base Sepolia...');
  console.log('Address:', address, '\n');

  const balance = await provider.getBalance(address);
  const ethBalance = ethers.formatEther(balance);

  console.log('Balance:', ethBalance, 'ETH');

  if (parseFloat(ethBalance) > 0) {
    console.log('\n✅ Ready to deploy!');
    console.log('\nRun: npx hardhat run scripts/deploy-cdp.ts --network base-sepolia');
  } else {
    console.log('\n⏳ Waiting for faucet... (check again in 30 seconds)');
  }
}

checkBalance().catch(console.error);
