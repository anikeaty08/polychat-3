import { ethers } from 'ethers';

const POLYGON_AMOY_RPC = process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC || 'https://rpc-amoy.polygon.technology';
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '80002');

/**
 * Get Polygon Amoy provider
 */
export function getProvider() {
  return new ethers.JsonRpcProvider(POLYGON_AMOY_RPC);
}

/**
 * Verify transaction on Polygon Amoy
 */
export async function verifyTransaction(
  txHash: string,
  expectedFrom: string,
  expectedTo?: string,
  expectedValue?: bigint
): Promise<boolean> {
  try {
    const provider = getProvider();
    const tx = await provider.getTransaction(txHash);

    if (!tx) {
      return false;
    }

    // Wait for confirmation
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      return false;
    }

    // Verify sender
    if (tx.from.toLowerCase() !== expectedFrom.toLowerCase()) {
      return false;
    }

    // Verify recipient if provided
    if (expectedTo && tx.to?.toLowerCase() !== expectedTo.toLowerCase()) {
      return false;
    }

    // Verify value if provided
    if (expectedValue !== undefined && tx.value !== expectedValue) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Transaction verification error:', error);
    return false;
  }
}

/**
 * Get transaction details
 */
export async function getTransactionDetails(txHash: string) {
  try {
    const provider = getProvider();
    const tx = await provider.getTransaction(txHash);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!tx || !receipt) {
      return null;
    }

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value.toString(),
      status: receipt.status === 1 ? 'success' : 'failed',
      blockNumber: receipt.blockNumber,
      timestamp: (await provider.getBlock(receipt.blockNumber))?.timestamp,
    };
  } catch (error) {
    console.error('Get transaction details error:', error);
    return null;
  }
}

/**
 * Format address for display
 */
export function formatAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}



