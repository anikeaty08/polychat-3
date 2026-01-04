const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying PolychatCalls contract with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy PolychatCalls
  const PolychatCalls = await ethers.getContractFactory("PolychatCalls");
  console.log("\nDeploying PolychatCalls...");
  const calls = await PolychatCalls.deploy();
  await calls.waitForDeployment();
  const callsAddress = await calls.getAddress();
  console.log("PolychatCalls deployed to:", callsAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("PolychatCalls:", callsAddress);
  console.log("\nSave this address to your .env file:");
  console.log(`NEXT_PUBLIC_CALLS_CONTRACT_ADDRESS=${callsAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



