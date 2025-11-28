import { createPublicClient, http } from "viem";
import { polygonAmoy } from "./chains";

export const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(polygonAmoy.rpcUrls.default.http[0]!),
});





