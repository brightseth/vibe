/**
 * vibe_mint — Mint a /vibe moment as an NFT on Ethereum
 *
 * Flow:
 * 1. Upload metadata to IPFS (Pinata)
 * 2. Call VIBEArtifacts.mint() on Ethereum
 * 3. Return tx hash + token ID
 */

// Lazy-load ethers to avoid startup crash if not installed
let ethers = null;
function getEthers() {
  if (!ethers) {
    try {
      ethers = require('ethers');
    } catch (e) {
      throw new Error('ethers package not installed. Run: npm install ethers');
    }
  }
  return ethers;
}

const config = require('../config');

// Contract ABI (minimal, just what we need)
const VIBE_ARTIFACTS_ABI = [
  'function mint(address to, string memory uri) public returns (uint256)',
  'function totalSupply() public view returns (uint256)',
  'event ArtifactMinted(uint256 indexed tokenId, address indexed to, string uri)'
];

// Will be set after deployment
const CONTRACT_ADDRESS = process.env.VIBE_ARTIFACTS_ADDRESS || null;
const PINATA_JWT = process.env.PINATA_JWT || null;
const MINTER_PRIVATE_KEY = process.env.VIBE_MINTER_PRIVATE_KEY || null;
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth.llamarpc.com';

const definition = {
  name: 'vibe_mint',
  description: 'Mint a /vibe moment as an NFT on Ethereum. Creates permanent onchain record of significant moments.',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Title of the artifact (e.g., "First Message from Claude Desktop")'
      },
      description: {
        type: 'string',
        description: 'Description of what happened'
      },
      attributes: {
        type: 'object',
        description: 'Optional attributes (from, to, date, medium, etc.)',
        additionalProperties: true
      },
      image_url: {
        type: 'string',
        description: 'Optional image URL (will be uploaded to IPFS)'
      },
      dry_run: {
        type: 'boolean',
        description: 'Preview metadata without minting (default: false)'
      }
    },
    required: ['title', 'description']
  }
};

async function uploadToIPFS(metadata) {
  if (!PINATA_JWT) {
    throw new Error('PINATA_JWT not configured');
  }

  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PINATA_JWT}`
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: {
        name: `vibe-artifact-${Date.now()}`
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Pinata upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return `ipfs://${result.IpfsHash}`;
}

async function mintOnchain(uri) {
  if (!CONTRACT_ADDRESS) {
    throw new Error('VIBE_ARTIFACTS_ADDRESS not configured');
  }
  if (!MINTER_PRIVATE_KEY) {
    throw new Error('VIBE_MINTER_PRIVATE_KEY not configured');
  }

  const ethers = getEthers();
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(MINTER_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, VIBE_ARTIFACTS_ABI, wallet);

  // Mint to the wallet owner
  const tx = await contract.mint(wallet.address, uri);
  const receipt = await tx.wait();

  // Parse the event to get tokenId
  const event = receipt.logs.find(log => {
    try {
      const parsed = contract.interface.parseLog(log);
      return parsed?.name === 'ArtifactMinted';
    } catch {
      return false;
    }
  });

  let tokenId = null;
  if (event) {
    const parsed = contract.interface.parseLog(event);
    tokenId = parsed.args.tokenId.toString();
  }

  return {
    txHash: receipt.hash,
    tokenId,
    contractAddress: CONTRACT_ADDRESS
  };
}

async function handler(args) {
  const { title, description, attributes = {}, image_url, dry_run = false } = args;

  // Build metadata
  const metadata = {
    name: title,
    description,
    attributes: [
      { trait_type: 'Source', value: '/vibe MCP' },
      { trait_type: 'Minted Via', value: 'Claude Desktop' },
      { trait_type: 'Date', value: new Date().toISOString().split('T')[0] },
      ...Object.entries(attributes).map(([key, value]) => ({
        trait_type: key,
        value: String(value)
      }))
    ],
    external_url: 'https://slashvibe.dev'
  };

  if (image_url) {
    metadata.image = image_url;
  }

  // Dry run - just show metadata
  if (dry_run) {
    return {
      display: `## Dry Run - Metadata Preview\n\n` +
        '```json\n' + JSON.stringify(metadata, null, 2) + '\n```\n\n' +
        `Ready to mint. Run without \`dry_run\` to mint onchain.`
    };
  }

  // Check configuration
  if (!CONTRACT_ADDRESS) {
    return {
      display: `## Configuration Required\n\n` +
        `Set these environment variables:\n` +
        `- \`VIBE_ARTIFACTS_ADDRESS\` - Contract address on Ethereum\n` +
        `- \`VIBE_MINTER_PRIVATE_KEY\` - Wallet private key\n` +
        `- \`PINATA_JWT\` - Pinata API token\n` +
        `- \`ETH_RPC_URL\` - Ethereum RPC (optional, defaults to llamarpc)\n\n` +
        `Contract not yet deployed? Run:\n` +
        '```bash\ncd /Users/seth/vibe/contracts && npm install && npm run deploy:mainnet\n```'
    };
  }

  try {
    // 1. Upload to IPFS
    const ipfsUri = await uploadToIPFS(metadata);

    // 2. Mint onchain
    const { txHash, tokenId, contractAddress } = await mintOnchain(ipfsUri);

    // 3. Return result
    const etherscanUrl = `https://etherscan.io/tx/${txHash}`;
    const openseaUrl = tokenId
      ? `https://opensea.io/assets/ethereum/${contractAddress}/${tokenId}`
      : null;

    let display = `## VIBE #${tokenId || '?'} Minted\n\n`;
    display += `**${title}**\n\n`;
    display += `- IPFS: \`${ipfsUri}\`\n`;
    display += `- Tx: [${txHash.slice(0, 10)}...](${etherscanUrl})\n`;
    if (openseaUrl) {
      display += `- OpenSea: [View](${openseaUrl})\n`;
    }
    display += `\nOnchain. Forever.`;

    return { display };

  } catch (err) {
    return {
      display: `## Mint Failed\n\n${err.message}\n\n` +
        `Check configuration and try again.`
    };
  }
}

module.exports = { definition, handler };
