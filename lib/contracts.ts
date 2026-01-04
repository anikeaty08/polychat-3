import { ethers } from 'ethers';

// PaymentEscrow ABI
export const PAYMENT_ESCROW_ABI = [
  'function createPayment(bytes32 paymentId, string memory metadata) external payable',
  'function verifyPayment(bytes32 paymentId) external',
  'function getPayment(bytes32 paymentId) external view returns (address payer, uint256 amount, uint256 timestamp, bool verified, string memory metadata)',
  'function getBalance() external view returns (uint256)',
  'event PaymentCreated(bytes32 indexed paymentId, address indexed payer, uint256 amount, uint256 timestamp)',
  'event PaymentVerified(bytes32 indexed paymentId, address indexed payer, uint256 amount)',
];

// UserRegistry ABI
export const USER_REGISTRY_ABI = [
  'function registerUsername(string memory _username) external',
  'function updateUsername(string memory _newUsername) external',
  'function getUserByUsername(string memory _username) external view returns (address walletAddress, string memory username, uint256 registeredAt, bool active)',
  'function getUserByAddress(address _address) external view returns (address walletAddress, string memory username, uint256 registeredAt, bool active)',
  'function isUsernameAvailable(string memory _username) external view returns (bool)',
  'function usernameToAddress(string memory) external view returns (address)',
  'function addressToUsername(address) external view returns (string memory)',
  'event UserRegistered(address indexed walletAddress, string username, uint256 timestamp)',
  'event UsernameUpdated(address indexed walletAddress, string oldUsername, string newUsername)',
];

// PolychatMessaging ABI
export const POLYCHAT_MESSAGING_ABI = [
  'function createConversation(address participant1, address participant2) external returns (bytes32)',
  'function sendMessage(bytes32 conversationId, address receiver, string memory content, string memory messageType, string memory ipfsHash) external returns (bytes32)',
  'function getConversationId(address user1, address user2) external pure returns (bytes32)',
  'function getMessageCount(bytes32 conversationId) external view returns (uint256)',
  'function getMessageIds(bytes32 conversationId, uint256 offset, uint256 limit) external view returns (bytes32[])',
  'event MessageSent(bytes32 indexed messageId, address indexed sender, address indexed receiver, string content, string messageType, uint256 timestamp)',
  'event ConversationCreated(bytes32 indexed conversationId, address indexed participant1, address indexed participant2, uint256 timestamp)',
];

// PolychatCalls ABI
export const POLYCHAT_CALLS_ABI = [
  'function initiateCall(address receiver, uint8 callType) external returns (bytes32)',
  'function updateCallStatus(bytes32 callId, uint8 status) external',
  'function getUserCalls(address user) external view returns (bytes32[])',
  'function getCall(bytes32 callId) external view returns (address caller, address receiver, uint8 callType, uint8 status, uint256 startedAt, uint256 endedAt, uint256 duration)',
  'event CallInitiated(bytes32 indexed callId, address indexed caller, address indexed receiver, uint8 callType, uint256 timestamp)',
  'event CallStatusChanged(bytes32 indexed callId, uint8 status, uint256 timestamp)',
];

// PolychatStatus ABI
export const POLYCHAT_STATUS_ABI = [
  'function createStatus(string memory text, string memory imageIpfsHash) external',
  'function getUserStatuses(address user) external view returns (tuple(address user, string text, string imageIpfsHash, uint256 timestamp, uint256 expiresAt, bool exists)[])',
  'function getLatestStatus(address user) external view returns (string text, string imageIpfsHash, uint256 timestamp, uint256 expiresAt, bool exists)',
  'function deleteStatus(uint256 statusIndex) external',
  'function cleanupExpiredStatuses(address user) external',
  'event StatusCreated(address indexed user, string text, string imageIpfsHash, uint256 timestamp, uint256 expiresAt)',
  'event StatusDeleted(address indexed user, uint256 statusIndex)',
];

/**
 * Get PaymentEscrow contract instance
 */
export function getPaymentEscrowContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  const address = process.env.NEXT_PUBLIC_PAYMENT_ESCROW_ADDRESS;
  if (!address) {
    throw new Error('PaymentEscrow address not configured');
  }
  return new ethers.Contract(address, PAYMENT_ESCROW_ABI, signerOrProvider);
}

/**
 * Get UserRegistry contract instance
 */
export function getUserRegistryContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  const address = process.env.NEXT_PUBLIC_USER_REGISTRY_ADDRESS;
  if (!address) {
    throw new Error('UserRegistry address not configured');
  }
  return new ethers.Contract(address, USER_REGISTRY_ABI, signerOrProvider);
}

/**
 * Create a payment on-chain
 */
export async function createPayment(
  signer: ethers.Signer,
  amount: bigint,
  metadata: string = ''
): Promise<string> {
  const contract = getPaymentEscrowContract(signer);
  const paymentId = ethers.id(`${Date.now()}-${Math.random()}`);
  
  const tx = await contract.createPayment(paymentId, metadata, { value: amount });
  await tx.wait();
  
  return paymentId;
}

/**
 * Get payment details
 */
export async function getPayment(
  provider: ethers.Provider,
  paymentId: string
) {
  const contract = getPaymentEscrowContract(provider);
  return await contract.getPayment(paymentId);
}

/**
 * Check if username is available on-chain (optional)
 */
export async function isUsernameAvailableOnChain(
  provider: ethers.Provider,
  username: string
): Promise<boolean> {
  try {
    const contract = getUserRegistryContract(provider);
    return await contract.isUsernameAvailable(username);
  } catch (error) {
    console.error('Error checking username on-chain:', error);
    return true; // Fallback to true if contract not deployed
  }
}

/**
 * Get PolychatMessaging contract instance
 */
export function getMessagingContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  const address = process.env.NEXT_PUBLIC_MESSAGING_CONTRACT_ADDRESS;
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error('Messaging contract address not configured. Please deploy contracts and set NEXT_PUBLIC_MESSAGING_CONTRACT_ADDRESS in .env');
  }
  return new ethers.Contract(address, POLYCHAT_MESSAGING_ABI, signerOrProvider);
}

/**
 * Get PolychatCalls contract instance
 */
export function getCallsContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  const address = process.env.NEXT_PUBLIC_CALLS_CONTRACT_ADDRESS;
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error('Calls contract address not configured. Please deploy contracts and set NEXT_PUBLIC_CALLS_CONTRACT_ADDRESS in .env');
  }
  return new ethers.Contract(address, POLYCHAT_CALLS_ABI, signerOrProvider);
}

/**
 * Get PolychatStatus contract instance
 */
export function getStatusContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  const address = process.env.NEXT_PUBLIC_STATUS_CONTRACT_ADDRESS;
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    throw new Error('Status contract address not configured. Please deploy contracts and set NEXT_PUBLIC_STATUS_CONTRACT_ADDRESS in .env');
  }
  return new ethers.Contract(address, POLYCHAT_STATUS_ABI, signerOrProvider);
}

/**
 * Check if on-chain features are enabled
 */
export function isOnChainEnabled(): boolean {
  if (typeof window === 'undefined') {
    // Server-side: check process.env directly
    const messagingAddress = process.env.NEXT_PUBLIC_MESSAGING_CONTRACT_ADDRESS;
    const callsAddress = process.env.NEXT_PUBLIC_CALLS_CONTRACT_ADDRESS;
    const statusAddress = process.env.NEXT_PUBLIC_STATUS_CONTRACT_ADDRESS;
    return !!(
      messagingAddress && 
      messagingAddress !== '0x0000000000000000000000000000000000000000' &&
      messagingAddress.trim() !== '' &&
      callsAddress && 
      callsAddress !== '0x0000000000000000000000000000000000000000' &&
      callsAddress.trim() !== '' &&
      statusAddress && 
      statusAddress !== '0x0000000000000000000000000000000000000000' &&
      statusAddress.trim() !== ''
    );
  } else {
    // Client-side: check from window (Next.js exposes NEXT_PUBLIC_ vars)
    // In Next.js, NEXT_PUBLIC_ vars are available at build time
    // We need to check if they're actually set (not placeholder)
    try {
      const messagingAddress = process.env.NEXT_PUBLIC_MESSAGING_CONTRACT_ADDRESS;
      const callsAddress = process.env.NEXT_PUBLIC_CALLS_CONTRACT_ADDRESS;
      const statusAddress = process.env.NEXT_PUBLIC_STATUS_CONTRACT_ADDRESS;
      
      // If addresses are not set or are placeholders, return false
      if (!messagingAddress || !callsAddress || !statusAddress) {
        return false;
      }
      
      if (
        messagingAddress === '0x0000000000000000000000000000000000000000' ||
        messagingAddress.trim() === '' ||
        callsAddress === '0x0000000000000000000000000000000000000000' ||
        callsAddress.trim() === '' ||
        statusAddress === '0x0000000000000000000000000000000000000000' ||
        statusAddress.trim() === ''
      ) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
}

