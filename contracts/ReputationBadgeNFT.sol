// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title ReputationBadgeNFT
 * @dev ERC-721 NFT for reputation badges with dynamic metadata and admin controls
 */
contract ReputationBadgeNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    // Events
    event BadgeMinted(address indexed owner, uint256 indexed tokenId, uint8 level);
    event BadgeUpdated(uint256 indexed tokenId, uint8 newLevel);

    // Mappings
    mapping(uint256 => uint8) public badgeLevels;
    mapping(uint8 => string) public tierNames; // e.g., 0 => "Bronze", 1 => "Silver"

    constructor() ERC721("PhishBlock Reputation Badge", "PHB-BADGE") Ownable(msg.sender) {
        // Initialize tier names
        tierNames[0] = "Bronze";
        tierNames[1] = "Silver";
        tierNames[2] = "Gold";
        tierNames[3] = "Platinum";
        tierNames[4] = "Diamond";
    }

    /**
     * @dev Mint a new badge NFT
     * @param to Address to mint to
     * @param level Initial level of the badge
     * @param uri Metadata URI
     */
    function mintBadge(address to, uint8 level, string memory uri) external onlyOwner {
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        _mint(to, tokenId);
        _setTokenURI(tokenId, uri);
        badgeLevels[tokenId] = level;

        emit BadgeMinted(to, tokenId, level);
    }

    /**
     * @dev Update the level of an existing badge
     * @param tokenId Token ID to update
     * @param newLevel New level
     * @param newUri New metadata URI
     */
    function updateBadgeLevel(uint256 tokenId, uint8 newLevel, string memory newUri) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        badgeLevels[tokenId] = newLevel;
        _setTokenURI(tokenId, newUri);

        emit BadgeUpdated(tokenId, newLevel);
    }

    /**
     * @dev Get the level of a badge
     * @param tokenId Token ID
     */
    function getBadgeLevel(uint256 tokenId) external view returns (uint8) {
        return badgeLevels[tokenId];
    }

    /**
     * @dev Get the tier name for a level
     * @param level Badge level
     */
    function getTierName(uint8 level) external view returns (string memory) {
        return tierNames[level];
    }

    /**
     * @dev Override tokenURI to include dynamic metadata
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev Override supportsInterface
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev Burn a token (if needed)
     */
    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender || getApproved(tokenId) == msg.sender || isApprovedForAll(ownerOf(tokenId), msg.sender), "Not approved");
        _burn(tokenId);
        delete badgeLevels[tokenId];
    }
}
