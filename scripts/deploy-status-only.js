const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying PolychatStatus contract with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy PolychatStatus only
  const PolychatStatus = await ethers.getContractFactory("PolychatStatus");
  console.log("\nDeploying PolychatStatus...");
  const status = await PolychatStatus.deploy();
  await status.waitForDeployment();
  const statusAddress = await status.getAddress();
  console.log("PolychatStatus deployed to:", statusAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("PolychatStatus:", statusAddress);
  console.log("\nSave this address to your .env file:");
  console.log(`NEXT_PUBLIC_STATUS_CONTRACT_ADDRESS=${statusAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



