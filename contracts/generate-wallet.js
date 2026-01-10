#!/usr/bin/env node
const { ethers } = require('ethers');

console.log('Generating new deployment wallet...\n');

const wallet = ethers.Wallet.createRandom();

console.log('✅ Wallet generated!\n');
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
console.log('\n⚠️  SAVE THESE CREDENTIALS SECURELY!');
console.log('\nNext steps:');
console.log('1. Add private key to contracts/.env');
console.log('2. Get testnet ETH from: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet');
console.log('3. Send ~0.05 ETH on Base Sepolia to:', wallet.address);
console.log('4. Deploy contracts with: npx hardhat run scripts/deploy-cdp.ts --network base-sepolia');
