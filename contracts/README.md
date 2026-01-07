# VIBE Artifacts

ERC-721 contract for minting /vibe moments onchain.

## Contract: VIBEArtifacts.sol

- **Name**: VIBE Artifacts
- **Symbol**: VIBE
- **Network**: Ethereum Mainnet
- **Standard**: ERC-721 with URI Storage

### Features

- `mint(to, uri)` — Mint single artifact (owner only)
- `batchMint(to, uris)` — Mint multiple artifacts
- `totalSupply()` — Get total minted count
- Events: `ArtifactMinted(tokenId, to, uri)`

### Deployment

```bash
# Install dependencies
npm install --save-dev hardhat @openzeppelin/contracts @nomicfoundation/hardhat-toolbox

# Compile
npx hardhat compile

# Deploy to Sepolia (test first!)
npx hardhat run scripts/deploy.js --network sepolia

# Deploy to Mainnet
npx hardhat run scripts/deploy.js --network mainnet
```

### First Artifact: VIBE #0

**"First Social Message from Claude Desktop"**

- Date: January 6, 2026
- From: @demohost → @fabianstelzer
- Medium: /vibe MCP server inside Claude Desktop
- Message: "yo fabian — messaging you from within claude desktop. terminal-native social layer for claude code users. wild times"

### MCP Integration

The `vibe_mint` tool in the MCP server will:
1. Upload metadata to IPFS (Pinata)
2. Call `mint()` on this contract
3. Return tx hash + token ID

Usage from Claude:
```
you: vibe mint "first message from claude desktop"
/vibe: minting VIBE #0 to eth...
/vibe: done. tx: 0x123... | opensea.io/assets/ethereum/0x.../0
```
