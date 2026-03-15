import { ethers } from 'ethers';

function getRpcUrl(chainId?: number): string {
  if (chainId === 137) {
    return (
      process.env.POLYGON_MAINNET_RPC ||
      process.env.NEXT_PUBLIC_POLYGON_MAINNET_RPC ||
      ''
    );
  }
  // default to Amoy (80002)
  return process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC || 'https://rpc-amoy.polygon.technology';
}

/**
 * Get provider for a given chain.
 */
export function getProvider(chainId?: number) {
  const url = getRpcUrl(chainId);
  if (!url) {
    throw new Error('RPC URL not configured for selected chain');
  }
  return new ethers.JsonRpcProvider(url);
}

/**
 * Verify transaction on selected chain
 */
export async function verifyTransaction(
  txHash: string,
  expectedFrom: string,
  expectedTo?: string,
  expectedValue?: bigint,
  chainId?: number
): Promise<boolean> {
  try {
    const provider = getProvider(chainId);
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
 * Verify an ERC-20 transfer by decoding receipt logs and finding a matching Transfer event.
 * This verifies receipt success, token contract address, and (from,to,value) of at least one Transfer log.
 */
export async function verifyErc20Transfer(
  txHash: string,
  tokenAddress: string,
  expectedFrom: string,
  expectedTo: string,
  expectedAmount: bigint,
  chainId?: number
): Promise<boolean> {
  try {
    const provider = getProvider(chainId);
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) return false;

    const normalizedToken = tokenAddress.toLowerCase();
    const normalizedFrom = expectedFrom.toLowerCase();
    const normalizedTo = expectedTo.toLowerCase();

    const transferTopic = ethers.id('Transfer(address,address,uint256)');

    for (const log of receipt.logs) {
      if (!log?.topics?.length) continue;
      if (String(log.address).toLowerCase() !== normalizedToken) continue;
      if (log.topics[0] !== transferTopic) continue;

      // topics[1] = from, topics[2] = to (both indexed)
      const from = ethers.getAddress(`0x${log.topics[1].slice(26)}`).toLowerCase();
      const to = ethers.getAddress(`0x${log.topics[2].slice(26)}`).toLowerCase();
      const value = BigInt(log.data);

      if (from === normalizedFrom && to === normalizedTo && value === expectedAmount) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('ERC20 transfer verification error:', error);
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



