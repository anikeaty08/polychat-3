const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying PaymentEscrow contract with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const serverAddress = process.env.SERVER_WALLET_ADDRESS || deployer.address;
  console.log("Server wallet address:", serverAddress);

  // Deploy PaymentEscrow
  const PaymentEscrow = await ethers.getContractFactory("PaymentEscrow");
  console.log("\nDeploying PaymentEscrow...");
  const paymentEscrow = await PaymentEscrow.deploy(serverAddress);
  await paymentEscrow.waitForDeployment();
  const paymentEscrowAddress = await paymentEscrow.getAddress();
  console.log("PaymentEscrow deployed to:", paymentEscrowAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("PaymentEscrow:", paymentEscrowAddress);
  console.log("\nSave this address to your .env file:");
  console.log(`NEXT_PUBLIC_PAYMENT_ESCROW_ADDRESS=${paymentEscrowAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



