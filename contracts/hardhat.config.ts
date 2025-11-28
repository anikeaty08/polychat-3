import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const AMOY_RPC_URL = process.env.AMOY_RPC_URL || "";
// User doesn't have a PolygonScan key; allow using a generic ETHERSCAN_API_KEY env instead.
const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY || "";

const networks: HardhatUserConfig["networks"] = {
  hardhat: {
    chainId: 31337,
  },
};

if (AMOY_RPC_URL) {
  networks.amoy = {
    url: AMOY_RPC_URL,
    accounts: PRIVATE_KEY ? [PRIVATE_KEY] : undefined,
    chainId: 80002,
  };
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: "hardhat",
  networks,
  etherscan: {
    apiKey: {
      polygonAmoy: ETHERSCAN_KEY,
    },
  },
};

export default config;

