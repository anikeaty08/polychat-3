export const polygonChatRegistryAbi = [
  {
    type: "function",
    name: "registerProfile",
    stateMutability: "nonpayable",
    inputs: [
      { name: "username", type: "string" },
      { name: "avatarCid", type: "string" },
      { name: "bio", type: "string" },
      { name: "displayName", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "updateProfile",
    stateMutability: "nonpayable",
    inputs: [
      { name: "avatarCid", type: "string" },
      { name: "bio", type: "string" },
      { name: "displayName", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "changeUsername",
    stateMutability: "nonpayable",
    inputs: [{ name: "newUsername", type: "string" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setBlockStatus",
    stateMutability: "nonpayable",
    inputs: [
      { name: "target", type: "address" },
      { name: "shouldBlock", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "upsertMessagePointer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "counterparty", type: "address" },
      { name: "cid", type: "string" },
      { name: "contentHash", type: "bytes32" },
    ],
    outputs: [
      { name: "conversationId", type: "bytes32" },
      { name: "messageCount", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getProfile",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [
      {
        components: [
          { name: "username", type: "string" },
          { name: "displayName", type: "string" },
          { name: "bio", type: "string" },
          { name: "avatarCid", type: "string" },
          { name: "exists", type: "bool" },
        ],
        type: "tuple",
      },
    ],
  },
  {
    type: "function",
    name: "ownerOfUsername",
    stateMutability: "view",
    inputs: [{ name: "username", type: "string" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "isBlocked",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "target", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getConversationMeta",
    stateMutability: "view",
    inputs: [{ name: "conversationId", type: "bytes32" }],
    outputs: [
      {
        components: [
          { name: "conversationId", type: "bytes32" },
          { name: "userA", type: "address" },
          { name: "userB", type: "address" },
          { name: "latestCid", type: "string" },
          { name: "messageCount", type: "uint256" },
          { name: "updatedAt", type: "uint256" },
        ],
        type: "tuple",
      },
    ],
  },
  {
    type: "event",
    name: "MessagePointerUpdated",
    inputs: [
      { name: "conversationId", type: "bytes32", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "cid", type: "string", indexed: false },
      { name: "contentHash", type: "bytes32", indexed: false },
      { name: "messageCount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

export const registryAddress =
  (process.env.NEXT_PUBLIC_CHAT_REGISTRY_ADDRESS as `0x${string}` | undefined) ||
  "0x0000000000000000000000000000000000000000";





