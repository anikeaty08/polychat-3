import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { Call } from '@/lib/models';
import { getCallsContract } from '@/lib/contracts';
import { ethers } from 'ethers';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { callId, status, transactionHash } = await req.json();

    if (!callId || !status || !transactionHash) {
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

      await connectDB();

      const call = await Call.findById(callId);
      if (!call) {
        return NextResponse.json(
          { error: 'Call not found' },
          { status: 404 }
        );
      }

      const updateData: Record<string, unknown> = {
        status,
        transaction_hash: transactionHash,
        on_chain: true,
      };
      if (status === 'answered') updateData.started_at = new Date();
      if (['completed', 'missed', 'declined'].includes(status)) {
        updateData.ended_at = new Date();
      }

      const updatedCall = await Call.findByIdAndUpdate(callId, updateData, {
        new: true,
      });

      const c = toApi(updatedCall)!;
      return NextResponse.json({ call: c });
    } catch (error: any) {
      console.error('On-chain call update error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update on-chain call' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('On-chain call update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update on-chain call' },
      { status: 500 }
    );
  }
}
