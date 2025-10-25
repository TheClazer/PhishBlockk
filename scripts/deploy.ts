import { ethers } from "hardhat";

async function main() {
  console.log("Deploying ReportRegistry contract...");

  const ReportRegistry = await ethers.getContractFactory("ReportRegistry");
  const reportRegistry = await ReportRegistry.deploy();

  await reportRegistry.waitForDeployment();

  const address = await reportRegistry.getAddress();

  console.log(`ReportRegistry deployed to: ${address}`);
  console.log("\nSave this address to your .env file:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
