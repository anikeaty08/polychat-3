import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { Call, User } from '@/lib/models';
import { getCallsContract } from '@/lib/contracts';
import { ethers } from 'ethers';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { receiverWalletAddress, callType, transactionHash } = await req.json();

    if (!receiverWalletAddress || !callType || !transactionHash) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC
    );

    try {
      const tx = await provider.getTransaction(transactionHash);
      if (!tx) {
        return NextResponse.json(
          { error: 'Transaction not found' },
          { status: 400 }
        );
      }

      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) {
        return NextResponse.json(
          { error: 'Transaction failed' },
          { status: 400 }
        );
      }

      const callsContract = getCallsContract(provider);
      const contractAddress = callsContract.target;
      const receiptTo = receipt.to ? String(receipt.to) : '';
      const contractAddr = contractAddress ? String(contractAddress) : '';
      if (
        receiptTo &&
        contractAddr &&
        receiptTo.toLowerCase() !== contractAddr.toLowerCase()
      ) {
        return NextResponse.json(
          { error: 'Invalid contract address' },
          { status: 400 }
        );
      }

      await connectDB();

      const user = await User.findById(payload.userId).select('wallet_address');
      if (
        !user ||
        user.wallet_address.toLowerCase() !== tx.from?.toLowerCase()
      ) {
        return NextResponse.json(
          { error: 'Wallet address mismatch' },
          { status: 403 }
        );
      }

      const receiver = await User.findOne({
        wallet_address: receiverWalletAddress.toLowerCase(),
      }).select('_id');

      if (!receiver) {
        return NextResponse.json(
          { error: 'Receiver not found' },
          { status: 404 }
        );
      }

      const call = await Call.create({
        caller_id: payload.userId,
        receiver_id: receiver._id,
        call_type: callType,
        status: 'initiated',
        transaction_hash: transactionHash,
        on_chain: true,
      });

      const c = toApi(call)!;
      return NextResponse.json({ call: c });
    } catch (error: any) {
      console.error('On-chain call error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to process on-chain call' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('On-chain call error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process on-chain call' },
      { status: 500 }
    );
  }
}
