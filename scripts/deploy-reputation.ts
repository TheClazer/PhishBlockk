import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy PHBToken
  const PHBToken = await ethers.getContractFactory("PHBToken");
  const phbToken = await PHBToken.deploy();
  await phbToken.waitForDeployment();
  const phbTokenAddress = await phbToken.getAddress();
  console.log("PHBToken deployed to:", phbTokenAddress);

  // Deploy TimelockController
  const TimelockController = await ethers.getContractFactory("PhishTimelockController");
  const minDelay = 3600; // 1 hour
  const timelock = await TimelockController.deploy(minDelay, [deployer.address], [deployer.address], deployer.address);
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log("TimelockController deployed to:", timelockAddress);

  // Deploy ReputationBadgeNFT
  const ReputationBadgeNFT = await ethers.getContractFactory("ReputationBadgeNFT");
  const badgeNFT = await ReputationBadgeNFT.deploy();
  await badgeNFT.waitForDeployment();
  const badgeNFTAddress = await badgeNFT.getAddress();
  console.log("ReputationBadgeNFT deployed to:", badgeNFTAddress);

  // Deploy PhishDAO
  const PhishDAO = await ethers.getContractFactory("PhishDAO");
  const dao = await PhishDAO.deploy(phbTokenAddress, timelockAddress);
  await dao.waitForDeployment();
  const daoAddress = await dao.getAddress();
  console.log("PhishDAO deployed to:", daoAddress);

  // Save addresses to a file or console
  console.log("\nDeployment complete!");
  console.log("PHB_TOKEN_ADDRESS=", phbTokenAddress);
  console.log("TIMELOCK_ADDRESS=", timelockAddress);
  console.log("REPUTATION_NFT_ADDRESS=", badgeNFTAddress);
  console.log("PHISHDAO_ADDRESS=", daoAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
