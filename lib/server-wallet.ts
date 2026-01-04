import { ethers } from 'ethers';
import { getMessagingContract, getCallsContract, getStatusContract } from './contracts';

/**
 * Get server wallet instance
 */
export function getServerWallet(): ethers.Wallet {
  if (!process.env.SERVER_PRIVATE_KEY) {
    throw new Error('SERVER_PRIVATE_KEY not configured');
  }

  const provider = new ethers.JsonRpcProvider(
    process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC
  );

  return new ethers.Wallet(process.env.SERVER_PRIVATE_KEY, provider);
}

/**
 * Execute a transaction using server wallet
 */
export async function executeServerTransaction(
  contractMethod: () => Promise<ethers.ContractTransactionResponse>
): Promise<{ hash: string; receipt: any }> {
  try {
    const tx = await contractMethod();
    const receipt = await tx.wait();
    
    if (!receipt || receipt.status !== 1) {
      throw new Error('Failed to process transaction');
    }

    return {
      hash: receipt.hash,
      receipt,
    };
  } catch (error: any) {
    console.error('Server transaction error:', error);
    
    // Provide user-friendly error messages
    if (error.reason) {
      throw new Error('Failed to process transaction');
    }
    if (error.message?.includes('revert') || error.message?.includes('execution reverted')) {
      throw new Error('Failed to process transaction');
    }
    if (error.message?.includes('insufficient funds') || error.message?.includes('gas')) {
      throw new Error('Insufficient funds for transaction');
    }
    if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
      throw new Error('Transaction was rejected');
    }
    
    throw new Error('Failed to process transaction');
  }
}

/**
 * Send message on-chain using server wallet
 */
export async function sendMessageOnChain(
  conversationId: string,
  receiverWallet: string,
  content: string,
  messageType: string = 'text',
  ipfsHash: string = ''
) {
  const serverWallet = getServerWallet();
  const messagingContract = getMessagingContract(serverWallet);

  return executeServerTransaction(() =>
    messagingContract.sendMessage(
      conversationId,
      receiverWallet,
      content,
      messageType,
      ipfsHash
    )
  );
}

/**
 * Initiate call on-chain using server wallet
 */
export async function initiateCallOnChain(
  receiverWallet: string,
  callType: number // 0 = Audio, 1 = Video
) {
  const serverWallet = getServerWallet();
  const callsContract = getCallsContract(serverWallet);

  return executeServerTransaction(() =>
    callsContract.initiateCall(receiverWallet, callType)
  );
}

/**
 * Create status on-chain using server wallet
 */
export async function createStatusOnChain(
  text: string,
  imageIpfsHash: string = ''
) {
  const serverWallet = getServerWallet();
  const statusContract = getStatusContract(serverWallet);

  return executeServerTransaction(() =>
    statusContract.createStatus(text, imageIpfsHash)
  );
}

/**
 * Create conversation on-chain using server wallet
 */
export async function createConversationOnChain(
  participant1: string,
  participant2: string
) {
  const serverWallet = getServerWallet();
  const messagingContract = getMessagingContract(serverWallet);

  return executeServerTransaction(() =>
    messagingContract.createConversation(participant1, participant2)
  );
}

