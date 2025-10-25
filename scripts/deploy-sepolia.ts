import { ethers } from "hardhat";
import { PhishBlockRegistry } from "../typechain-types";
import { ReputationSystem } from "../typechain-types";
import { EvidenceValidator } from "../typechain-types";
import { MockERC20 } from "../typechain-types";

async function main() {
  console.log("🚀 Starting PhishBlock deployment to Sepolia testnet...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Check if we have enough ETH
  const balance = await deployer.provider.getBalance(deployer.address);
  if (balance < ethers.parseEther("0.1")) {
    console.error("❌ Insufficient ETH balance. Please fund your account with at least 0.1 ETH");
    process.exit(1);
  }

  // Deploy MockERC20 token for testing
  console.log("\n📦 Deploying MockERC20 token...");
  const MockERC20Factory = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20Factory.deploy();
  await mockToken.waitForDeployment();
  const mockTokenAddress = await mockToken.getAddress();
  console.log("✅ MockERC20 deployed to:", mockTokenAddress);

  // Deploy PhishBlockRegistry
  console.log("\n📦 Deploying PhishBlockRegistry...");
  const PhishBlockRegistryFactory = await ethers.getContractFactory("PhishBlockRegistry");
  const registry = await PhishBlockRegistryFactory.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("✅ PhishBlockRegistry deployed to:", registryAddress);

  // Deploy ReputationSystem
  console.log("\n📦 Deploying ReputationSystem...");
  const ReputationSystemFactory = await ethers.getContractFactory("ReputationSystem");
  const reputationSystem = await ReputationSystemFactory.deploy(mockTokenAddress);
  await reputationSystem.waitForDeployment();
  const reputationSystemAddress = await reputationSystem.getAddress();
  console.log("✅ ReputationSystem deployed to:", reputationSystemAddress);

  // Deploy EvidenceValidator
  console.log("\n📦 Deploying EvidenceValidator...");
  const EvidenceValidatorFactory = await ethers.getContractFactory("EvidenceValidator");
  const evidenceValidator = await EvidenceValidatorFactory.deploy();
  await evidenceValidator.waitForDeployment();
  const evidenceValidatorAddress = await evidenceValidator.getAddress();
  console.log("✅ EvidenceValidator deployed to:", evidenceValidatorAddress);

  // Initialize the system
  console.log("\n🔧 Initializing system...");

  // Add some initial malicious patterns to EvidenceValidator
  console.log("📝 Adding malicious patterns...");
  await evidenceValidator.addMaliciousPattern("phishing", true);
  await evidenceValidator.addMaliciousPattern("scam", true);
  await evidenceValidator.addMaliciousPattern("fake", true);
  await evidenceValidator.addMaliciousPattern("steal", true);
  await evidenceValidator.addMaliciousPattern("hack", true);

  // Add some suspicious domains
  console.log("📝 Adding suspicious domains...");
  await evidenceValidator.addSuspiciousDomain("phishing-site.com", true);
  await evidenceValidator.addSuspiciousDomain("fake-bank.com", true);
  await evidenceValidator.addSuspiciousDomain("scam-wallet.com", true);

  // Authorize some initial validators
  console.log("📝 Authorizing initial validators...");
  const validatorAddresses = [
    "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6", // Example validator 1
    "0x8ba1f109551bD432803012645Hac136c", // Example validator 2
  ];

  for (const validatorAddress of validatorAddresses) {
    try {
      await evidenceValidator.authorizeValidator(validatorAddress, 100);
      console.log(`✅ Authorized validator: ${validatorAddress}`);
    } catch (error) {
      console.log(`⚠️  Could not authorize validator ${validatorAddress}:`, error);
    }
  }

  // Add some URLs to blacklist
  console.log("📝 Adding URLs to blacklist...");
  await registry.addToBlacklist("https://known-phishing-site.com", true);
  await registry.addToBlacklist("https://fake-exchange.com", true);
  await registry.addToBlacklist("https://scam-wallet.com", true);

  // Add some wallet addresses to blacklist
  console.log("📝 Adding wallet addresses to blacklist...");
  await registry.addToBlacklist("0x1234567890123456789012345678901234567890", false);
  await registry.addToBlacklist("0x0987654321098765432109876543210987654321", false);

  // Mint tokens to deployer for testing
  console.log("📝 Minting test tokens to deployer...");
  await mockToken.mint(deployer.address, ethers.parseEther("100000"));

  // Display deployment summary
  console.log("\n🎉 Deployment completed successfully!");
  console.log("=" .repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=" .repeat(60));
  console.log("🌐 Network: Sepolia Testnet");
  console.log("👤 Deployer:", deployer.address);
  console.log("📦 MockERC20:", mockTokenAddress);
  console.log("📦 PhishBlockRegistry:", registryAddress);
  console.log("📦 ReputationSystem:", reputationSystemAddress);
  console.log("📦 EvidenceValidator:", evidenceValidatorAddress);
  console.log("=" .repeat(60));

  // Save deployment info to file
  const deploymentInfo = {
    network: "sepolia",
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      MockERC20: mockTokenAddress,
      PhishBlockRegistry: registryAddress,
      ReputationSystem: reputationSystemAddress,
      EvidenceValidator: evidenceValidatorAddress,
    },
    blockNumber: await deployer.provider.getBlockNumber(),
  };

  const fs = require("fs");
  const path = require("path");
  const deploymentPath = path.join(__dirname, "../deployments");
  
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentPath, "sepolia-deployment.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("💾 Deployment info saved to deployments/sepolia-deployment.json");

  // Verify contracts on Etherscan (optional)
  console.log("\n🔍 Verifying contracts on Etherscan...");
  try {
    console.log("⏳ Waiting for block confirmations...");
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

    console.log("🔍 Verifying MockERC20...");
    await hre.run("verify:verify", {
      address: mockTokenAddress,
      constructorArguments: [],
    });

    console.log("🔍 Verifying PhishBlockRegistry...");
    await hre.run("verify:verify", {
      address: registryAddress,
      constructorArguments: [],
    });

    console.log("🔍 Verifying ReputationSystem...");
    await hre.run("verify:verify", {
      address: reputationSystemAddress,
      constructorArguments: [mockTokenAddress],
    });

    console.log("🔍 Verifying EvidenceValidator...");
    await hre.run("verify:verify", {
      address: evidenceValidatorAddress,
      constructorArguments: [],
    });

    console.log("✅ All contracts verified successfully!");
  } catch (error) {
    console.log("⚠️  Contract verification failed:", error);
    console.log("💡 You can verify manually later using:");
    console.log(`npx hardhat verify --network sepolia ${mockTokenAddress}`);
    console.log(`npx hardhat verify --network sepolia ${registryAddress}`);
    console.log(`npx hardhat verify --network sepolia ${reputationSystemAddress} ${mockTokenAddress}`);
    console.log(`npx hardhat verify --network sepolia ${evidenceValidatorAddress}`);
  }

  console.log("\n🎯 Next steps:");
  console.log("1. Update your frontend with the new contract addresses");
  console.log("2. Test the contracts using the provided test scripts");
  console.log("3. Configure your environment variables");
  console.log("4. Deploy to production when ready");

  console.log("\n✨ PhishBlock is now live on Sepolia testnet!");
}

// Handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
