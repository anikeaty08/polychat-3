const { run } = require("hardhat");

async function main() {
  const contractAddress = process.argv[2];
  const contractName = process.argv[3] || "PaymentEscrow";

  if (!contractAddress) {
    console.error("Usage: node scripts/verify-contract.js <contract-address> [contract-name]");
    process.exit(1);
  }

  console.log(`Verifying contract ${contractName} at ${contractAddress}...`);

  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: contractName === "PaymentEscrow" 
        ? [process.env.SERVER_WALLET_ADDRESS || "0x0000000000000000000000000000000000000000"]
        : [],
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("Contract already verified");
    } else {
      console.error("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

