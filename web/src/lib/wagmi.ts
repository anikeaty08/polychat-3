"use client";
import { cookieStorage, createStorage, http } from "wagmi";
import { createConfig } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { polygonAmoy } from "./chains";

const rpcUrl = polygonAmoy.rpcUrls.default.http[0];

const transports = rpcUrl
  ? {
      [polygonAmoy.id]: http(rpcUrl),
    }
  : {};

export const wagmiConfig = createConfig({
  chains: [polygonAmoy],
  transports,
  ssr: false,
  storage: createStorage({
    storage: cookieStorage,
  }),
  connectors: [
    injected({ shimDisconnect: true }),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
      showQrModal: true,
    }),
  ],
});
