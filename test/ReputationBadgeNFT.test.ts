import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReputationBadgeNFT", function () {
  let badgeNFT: any;
  let owner: any;
  let addr1: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const BadgeNFT = await ethers.getContractFactory("ReputationBadgeNFT");
    badgeNFT = await BadgeNFT.deploy();
    await badgeNFT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await badgeNFT.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await badgeNFT.name()).to.equal("PhishBlock Reputation Badge");
      expect(await badgeNFT.symbol()).to.equal("PHB-BADGE");
    });
  });

  describe("Minting", function () {
    it("Should mint a badge", async function () {
      await badgeNFT.mintBadge(addr1.address, 1, "https://example.com/metadata/1");
      expect(await badgeNFT.ownerOf(1)).to.equal(addr1.address);
      expect(await badgeNFT.getBadgeLevel(1)).to.equal(1);
    });

    it("Should emit BadgeMinted event", async function () {
      await expect(badgeNFT.mintBadge(addr1.address, 1, "https://example.com/metadata/1"))
        .to.emit(badgeNFT, "BadgeMinted")
        .withArgs(addr1.address, 1, 1);
    });
  });

  describe("Updating", function () {
    beforeEach(async function () {
      await badgeNFT.mintBadge(addr1.address, 1, "https://example.com/metadata/1");
    });

    it("Should update badge level", async function () {
      await badgeNFT.updateBadgeLevel(1, 2, "https://example.com/metadata/2");
      expect(await badgeNFT.getBadgeLevel(1)).to.equal(2);
    });

    it("Should emit BadgeUpdated event", async function () {
      await expect(badgeNFT.updateBadgeLevel(1, 2, "https://example.com/metadata/2"))
        .to.emit(badgeNFT, "BadgeUpdated")
        .withArgs(1, 2);
    });
  });
});
