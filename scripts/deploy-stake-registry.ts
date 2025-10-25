import { ethers } from "hardhat";

async function main() {
  console.log("Deploying StakeBasedReportRegistry...");

  const StakeBasedReportRegistry = await ethers.getContractFactory("StakeBasedReportRegistry");
  const stakeRegistry = await StakeBasedReportRegistry.deploy();

  await stakeRegistry.waitForDeployment();

  const address = await stakeRegistry.getAddress();
  console.log("StakeBasedReportRegistry deployed to:", address);

  // Verify deployment
  console.log("Verifying deployment...");
  const totalReports = await stakeRegistry.getTotalReports();
  const totalValidators = await stakeRegistry.getTotalValidators();
  
  console.log("Initial state:");
  console.log("- Total Reports:", totalReports.toString());
  console.log("- Total Validators:", totalValidators.toString());
  console.log("- Report Stake Required:", ethers.formatEther(await stakeRegistry.REPORT_STAKE()), "ETH");
  console.log("- Voting Stake Required:", ethers.formatEther(await stakeRegistry.VOTING_STAKE()), "ETH");
  console.log("- Reporter Reward:", ethers.formatEther(await stakeRegistry.REPORTER_REWARD()), "ETH");
  console.log("- Validator Reward:", ethers.formatEther(await stakeRegistry.VALIDATOR_REWARD()), "ETH");

  console.log("\nDeployment completed successfully!");
  console.log("Contract Address:", address);
  console.log("\nNext steps:");
  console.log("1. Update NEXT_PUBLIC_STAKE_REGISTRY_ADDRESS in .env file");
  console.log("2. Register initial validators");
  console.log("3. Test report submission with staking");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

