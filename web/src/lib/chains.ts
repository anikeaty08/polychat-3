import { Chain } from "viem";

const defaultRpc = process.env.NEXT_PUBLIC_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/";

export const polygonAmoy: Chain = {
  id: 80002,
  name: "Polygon Amoy",
  nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  rpcUrls: {
    default: { http: [defaultRpc] },
    public: { http: [defaultRpc] },
  },
  blockExplorers: {
    default: { name: "Polygonscan", url: "https://www.oklink.com/amoy" },
  },
};



