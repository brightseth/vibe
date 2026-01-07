/**
 * Mint VIBE #0 — First Social Message from Claude Desktop
 * January 6, 2026
 */

const hre = require("hardhat");

const CONTRACT_ADDRESS = "0xb381164D09682A066fD104579d9A7176905c8CB3";
// Clean JWT (remove any whitespace/newlines that might have been in env)
const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI2YmQxMzlhMC0wZWRiLTQ3OWMtYmY2YS00NDY2NmQ1ZDM3ODciLCJlbWFpbCI6InB5ZS5oZW5yeUBwcm90b25tYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiI1ZmQwYzAxMGNlMGMyN2QyNzlkMiIsInNjb3BlZEtleVNlY3JldCI6IjVhMGIwY2RjNTVkNzMxNDQ0NDk2ZjMyN2E2ZWQ1NzM2MDVjOWI3MGQ3YjBiOTMxMjk4OTcyM2E2NGU0YjJhMDkiLCJleHAiOjE3OTQyNjE2MjB9.uoPnqiBSxnMHYE5Uk8RSUwO7cReF3btzCGNqhv8apzM".trim();

const metadata = {
  name: "VIBE #0 — First Social Message from Claude Desktop",
  description: "The first social DM sent from within Claude Desktop via /vibe MCP server. January 6, 2026. From @demohost to @fabianstelzer: 'yo fabian — messaging you from within claude desktop. terminal-native social layer for claude code users. wild times'",
  external_url: "https://slashvibe.dev",
  attributes: [
    { trait_type: "From", value: "@demohost" },
    { trait_type: "To", value: "@fabianstelzer" },
    { trait_type: "Medium", value: "/vibe MCP → Claude Desktop" },
    { trait_type: "Date", value: "2026-01-06" },
    { trait_type: "Message", value: "yo fabian — messaging you from within claude desktop. terminal-native social layer for claude code users. wild times" },
    { trait_type: "Significance", value: "First" },
    { trait_type: "Provenance", value: "gigabrain trace" }
  ]
};

async function uploadToIPFS(data) {
  console.log("Uploading metadata to IPFS...");

  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${PINATA_JWT}`
    },
    body: JSON.stringify({
      pinataContent: data,
      pinataMetadata: { name: "vibe-0-first-message" }
    })
  });

  if (!response.ok) {
    throw new Error(`Pinata upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return `ipfs://${result.IpfsHash}`;
}

async function main() {
  // 1. Upload metadata to IPFS
  const ipfsUri = await uploadToIPFS(metadata);
  console.log(`Metadata uploaded: ${ipfsUri}`);

  // 2. Get contract
  const VIBEArtifacts = await hre.ethers.getContractFactory("VIBEArtifacts");
  const contract = VIBEArtifacts.attach(CONTRACT_ADDRESS);

  // 3. Get signer
  const [signer] = await hre.ethers.getSigners();
  console.log(`Minting from: ${signer.address}`);

  // 4. Mint
  console.log("Minting VIBE #0...");
  const tx = await contract.mint(signer.address, ipfsUri, {
    gasLimit: 200000
  });

  console.log(`Transaction: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`Confirmed in block: ${receipt.blockNumber}`);

  // 5. Get token ID from event
  const event = receipt.logs.find(log => {
    try {
      const parsed = contract.interface.parseLog(log);
      return parsed?.name === "ArtifactMinted";
    } catch { return false; }
  });

  if (event) {
    const parsed = contract.interface.parseLog(event);
    console.log(`\n✅ VIBE #${parsed.args.tokenId} minted!`);
    console.log(`\nView on:`);
    console.log(`- Etherscan: https://etherscan.io/tx/${tx.hash}`);
    console.log(`- OpenSea: https://opensea.io/assets/ethereum/${CONTRACT_ADDRESS}/${parsed.args.tokenId}`);
  }
}

main().catch(console.error);
