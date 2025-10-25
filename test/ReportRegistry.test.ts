import { expect } from "chai";
import { ethers } from "hardhat";
import { ReportRegistry } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ReportRegistry", function () {
  let reportRegistry: ReportRegistry;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;
  let addr3: HardhatEthersSigner;

  const testHash1 = ethers.id("phishing-url-1");
  const testHash2 = ethers.id("scam-wallet-1");

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    const ReportRegistry = await ethers.getContractFactory("ReportRegistry");
    reportRegistry = await ReportRegistry.deploy();
    await reportRegistry.waitForDeployment();
  });

  describe("Report Registration", function () {
    it("Should register a new report", async function () {
      await expect(reportRegistry.registerReport(testHash1))
        .to.emit(reportRegistry, "ReportRegistered")
        .withArgs(testHash1, owner.address, await getBlockTimestamp());

      const report = await reportRegistry.getReport(testHash1);
      expect(report.reporter).to.equal(owner.address);
      expect(report.exists).to.be.true;
      expect(report.voteScore).to.equal(0);
    });

    it("Should not allow registering with zero hash", async function () {
      const zeroHash = ethers.ZeroHash;
      await expect(
        reportRegistry.registerReport(zeroHash)
      ).to.be.revertedWith("Invalid report hash");
    });

    it("Should not allow duplicate report registration", async function () {
      await reportRegistry.registerReport(testHash1);
      await expect(
        reportRegistry.registerReport(testHash1)
      ).to.be.revertedWith("Report already exists");
    });

    it("Should track multiple reports", async function () {
      await reportRegistry.registerReport(testHash1);
      await reportRegistry.connect(addr1).registerReport(testHash2);

      const count = await reportRegistry.getReportCount();
      expect(count).to.equal(2);

      const hash1 = await reportRegistry.getReportHashByIndex(0);
      const hash2 = await reportRegistry.getReportHashByIndex(1);
      expect(hash1).to.equal(testHash1);
      expect(hash2).to.equal(testHash2);
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      await reportRegistry.registerReport(testHash1);
    });

    it("Should allow upvoting a report", async function () {
      await expect(reportRegistry.connect(addr1).vote(testHash1, true))
        .to.emit(reportRegistry, "VoteCast")
        .withArgs(testHash1, addr1.address, true, 1);

      const report = await reportRegistry.getReport(testHash1);
      expect(report.voteScore).to.equal(1);

      const vote = await reportRegistry.getUserVote(testHash1, addr1.address);
      expect(vote.hasVoted).to.be.true;
      expect(vote.isUpvote).to.be.true;
    });

    it("Should allow downvoting a report", async function () {
      await expect(reportRegistry.connect(addr1).vote(testHash1, false))
        .to.emit(reportRegistry, "VoteCast")
        .withArgs(testHash1, addr1.address, false, -1);

      const report = await reportRegistry.getReport(testHash1);
      expect(report.voteScore).to.equal(-1);

      const vote = await reportRegistry.getUserVote(testHash1, addr1.address);
      expect(vote.hasVoted).to.be.true;
      expect(vote.isUpvote).to.be.false;
    });

    it("Should not allow voting on non-existent report", async function () {
      await expect(
        reportRegistry.vote(testHash2, true)
      ).to.be.revertedWith("Report does not exist");
    });

    it("Should allow multiple users to vote", async function () {
      await reportRegistry.connect(addr1).vote(testHash1, true);
      await reportRegistry.connect(addr2).vote(testHash1, true);
      await reportRegistry.connect(addr3).vote(testHash1, false);

      const report = await reportRegistry.getReport(testHash1);
      expect(report.voteScore).to.equal(1); // 2 upvotes - 1 downvote
    });

    it("Should allow changing vote from upvote to downvote", async function () {
      await reportRegistry.connect(addr1).vote(testHash1, true);
      let report = await reportRegistry.getReport(testHash1);
      expect(report.voteScore).to.equal(1);

      await expect(reportRegistry.connect(addr1).vote(testHash1, false))
        .to.emit(reportRegistry, "VoteChanged")
        .withArgs(testHash1, addr1.address, false, -1);

      report = await reportRegistry.getReport(testHash1);
      expect(report.voteScore).to.equal(-1);

      const vote = await reportRegistry.getUserVote(testHash1, addr1.address);
      expect(vote.isUpvote).to.be.false;
    });

    it("Should allow changing vote from downvote to upvote", async function () {
      await reportRegistry.connect(addr1).vote(testHash1, false);
      let report = await reportRegistry.getReport(testHash1);
      expect(report.voteScore).to.equal(-1);

      await expect(reportRegistry.connect(addr1).vote(testHash1, true))
        .to.emit(reportRegistry, "VoteChanged")
        .withArgs(testHash1, addr1.address, true, 1);

      report = await reportRegistry.getReport(testHash1);
      expect(report.voteScore).to.equal(1);
    });

    it("Should not change score when voting same way twice", async function () {
      await reportRegistry.connect(addr1).vote(testHash1, true);
      await reportRegistry.connect(addr1).vote(testHash1, true);

      const report = await reportRegistry.getReport(testHash1);
      expect(report.voteScore).to.equal(1);
    });

    it("Should handle complex voting scenarios", async function () {
      // addr1 upvotes
      await reportRegistry.connect(addr1).vote(testHash1, true);
      let report = await reportRegistry.getReport(testHash1);
      expect(report.voteScore).to.equal(1);

      // addr2 upvotes
      await reportRegistry.connect(addr2).vote(testHash1, true);
      report = await reportRegistry.getReport(testHash1);
      expect(report.voteScore).to.equal(2);

      // addr3 downvotes
      await reportRegistry.connect(addr3).vote(testHash1, false);
      report = await reportRegistry.getReport(testHash1);
      expect(report.voteScore).to.equal(1);

      // addr1 changes to downvote
      await reportRegistry.connect(addr1).vote(testHash1, false);
      report = await reportRegistry.getReport(testHash1);
      expect(report.voteScore).to.equal(-1);

      // addr3 changes to upvote
      await reportRegistry.connect(addr3).vote(testHash1, true);
      report = await reportRegistry.getReport(testHash1);
      expect(report.voteScore).to.equal(1);
    });
  });

  describe("Getters", function () {
    it("Should return correct report count", async function () {
      expect(await reportRegistry.getReportCount()).to.equal(0);

      await reportRegistry.registerReport(testHash1);
      expect(await reportRegistry.getReportCount()).to.equal(1);

      await reportRegistry.registerReport(testHash2);
      expect(await reportRegistry.getReportCount()).to.equal(2);
    });

    it("Should revert when accessing out of bounds index", async function () {
      await expect(
        reportRegistry.getReportHashByIndex(0)
      ).to.be.revertedWith("Index out of bounds");

      await reportRegistry.registerReport(testHash1);
      await expect(
        reportRegistry.getReportHashByIndex(1)
      ).to.be.revertedWith("Index out of bounds");
    });

    it("Should return non-existent report correctly", async function () {
      const report = await reportRegistry.getReport(testHash1);
      expect(report.exists).to.be.false;
      expect(report.reporter).to.equal(ethers.ZeroAddress);
      expect(report.voteScore).to.equal(0);
    });
  });

  async function getBlockTimestamp(): Promise<number> {
    const blockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNumber);
    return block!.timestamp;
  }
});
