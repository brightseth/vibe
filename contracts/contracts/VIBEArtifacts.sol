// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VIBEArtifacts
 * @dev ERC-721 contract for minting /vibe moments onchain
 * @notice Simple, clean, no bloat. First artifact = first social message from Claude Desktop.
 */
contract VIBEArtifacts is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    event ArtifactMinted(uint256 indexed tokenId, address indexed to, string uri);

    constructor() ERC721("VIBE Artifacts", "VIBE") Ownable(msg.sender) {}

    /**
     * @dev Mint a new artifact
     * @param to Address to mint to
     * @param uri IPFS URI for metadata
     * @return tokenId The ID of the newly minted token
     */
    function mint(address to, string memory uri) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        emit ArtifactMinted(tokenId, to, uri);
        return tokenId;
    }

    /**
     * @dev Batch mint multiple artifacts
     * @param to Address to mint to
     * @param uris Array of IPFS URIs
     * @return tokenIds Array of minted token IDs
     */
    function batchMint(address to, string[] memory uris) public onlyOwner returns (uint256[] memory) {
        uint256[] memory tokenIds = new uint256[](uris.length);
        for (uint256 i = 0; i < uris.length; i++) {
            tokenIds[i] = mint(to, uris[i]);
        }
        return tokenIds;
    }

    /**
     * @dev Get total supply
     */
    function totalSupply() public view returns (uint256) {
        return _nextTokenId;
    }

    // Required overrides
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
