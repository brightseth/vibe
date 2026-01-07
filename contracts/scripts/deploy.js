const hre = require("hardhat");

async function main() {
  console.log("Deploying VIBEArtifacts...");

  const VIBEArtifacts = await hre.ethers.getContractFactory("VIBEArtifacts");
  const contract = await VIBEArtifacts.deploy({
    gasLimit: 3000000  // Explicit gas limit
  });

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`VIBEArtifacts deployed to: ${address}`);
  console.log(`Network: ${hre.network.name}`);
  console.log(`\nVerify with:`);
  console.log(`npx hardhat verify --network ${hre.network.name} ${address}`);

  return address;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
