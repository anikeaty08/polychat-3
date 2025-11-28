import { ethers } from "hardhat";

async function main() {
  const registry = await ethers.deployContract("PolygonChatRegistry");
  await registry.waitForDeployment();

  console.log("PolygonChatRegistry deployed to:", await registry.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});





