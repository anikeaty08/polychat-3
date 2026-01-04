const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying PolychatMessaging contract with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy PolychatMessaging
  const PolychatMessaging = await ethers.getContractFactory("PolychatMessaging");
  console.log("\nDeploying PolychatMessaging...");
  const messaging = await PolychatMessaging.deploy();
  await messaging.waitForDeployment();
  const messagingAddress = await messaging.getAddress();
  console.log("PolychatMessaging deployed to:", messagingAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("PolychatMessaging:", messagingAddress);
  console.log("\nSave this address to your .env file:");
  console.log(`NEXT_PUBLIC_MESSAGING_CONTRACT_ADDRESS=${messagingAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



