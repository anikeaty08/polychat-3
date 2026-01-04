const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying UserRegistry contract with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy UserRegistry
  const UserRegistry = await ethers.getContractFactory("UserRegistry");
  console.log("\nDeploying UserRegistry...");
  const userRegistry = await UserRegistry.deploy();
  await userRegistry.waitForDeployment();
  const userRegistryAddress = await userRegistry.getAddress();
  console.log("UserRegistry deployed to:", userRegistryAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("UserRegistry:", userRegistryAddress);
  console.log("\nSave this address to your .env file:");
  console.log(`NEXT_PUBLIC_USER_REGISTRY_ADDRESS=${userRegistryAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



