const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy PaymentEscrow
  const PaymentEscrow = await ethers.getContractFactory("PaymentEscrow");
  const serverAddress = process.env.SERVER_WALLET_ADDRESS || deployer.address; // Server wallet for verification
  
  console.log("\nDeploying PaymentEscrow...");
  const paymentEscrow = await PaymentEscrow.deploy(serverAddress);
  await paymentEscrow.waitForDeployment();
  const paymentEscrowAddress = await paymentEscrow.getAddress();
  console.log("PaymentEscrow deployed to:", paymentEscrowAddress);

  // Deploy UserRegistry (optional)
  const UserRegistry = await ethers.getContractFactory("UserRegistry");
  console.log("\nDeploying UserRegistry...");
  const userRegistry = await UserRegistry.deploy();
  await userRegistry.waitForDeployment();
  const userRegistryAddress = await userRegistry.getAddress();
  console.log("UserRegistry deployed to:", userRegistryAddress);

  // Deploy PolychatMessaging
  const PolychatMessaging = await ethers.getContractFactory("PolychatMessaging");
  console.log("\nDeploying PolychatMessaging...");
  const messaging = await PolychatMessaging.deploy();
  await messaging.waitForDeployment();
  const messagingAddress = await messaging.getAddress();
  console.log("PolychatMessaging deployed to:", messagingAddress);

  // Deploy PolychatCalls
  const PolychatCalls = await ethers.getContractFactory("PolychatCalls");
  console.log("\nDeploying PolychatCalls...");
  const calls = await PolychatCalls.deploy();
  await calls.waitForDeployment();
  const callsAddress = await calls.getAddress();
  console.log("PolychatCalls deployed to:", callsAddress);

  // Deploy PolychatStatus
  const PolychatStatus = await ethers.getContractFactory("PolychatStatus");
  console.log("\nDeploying PolychatStatus...");
  const status = await PolychatStatus.deploy();
  await status.waitForDeployment();
  const statusAddress = await status.getAddress();
  console.log("PolychatStatus deployed to:", statusAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("PaymentEscrow:", paymentEscrowAddress);
  console.log("UserRegistry:", userRegistryAddress);
  console.log("PolychatMessaging:", messagingAddress);
  console.log("PolychatCalls:", callsAddress);
  console.log("PolychatStatus:", statusAddress);
  console.log("\nSave these addresses to your .env file:");
  console.log(`NEXT_PUBLIC_PAYMENT_ESCROW_ADDRESS=${paymentEscrowAddress}`);
  console.log(`NEXT_PUBLIC_USER_REGISTRY_ADDRESS=${userRegistryAddress}`);
  console.log(`NEXT_PUBLIC_MESSAGING_CONTRACT_ADDRESS=${messagingAddress}`);
  console.log(`NEXT_PUBLIC_CALLS_CONTRACT_ADDRESS=${callsAddress}`);
  console.log(`NEXT_PUBLIC_STATUS_CONTRACT_ADDRESS=${statusAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

