import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { Call } from '@/lib/models';
import { initiateCallOnChain } from '@/lib/server-wallet';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const {
      conversationId,
      receiverId,
      receiverWalletAddress,
      callType,
    } = await req.json();

    if (!conversationId || !receiverId || !receiverWalletAddress || callType === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!process.env.SERVER_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Server wallet not configured' },
        { status: 500 }
      );
    }

    const callTypeNumber = callType === 'video' ? 1 : 0;
    const { hash: transactionHash } = await initiateCallOnChain(
      receiverWalletAddress.toLowerCase(),
      callTypeNumber
    );

    await connectDB();

    const call = await Call.create({
      conversation_id: conversationId,
      caller_id: payload.userId,
      receiver_id: receiverId,
      call_type: callType,
      status: 'initiated',
      transaction_hash: transactionHash,
      on_chain: true,
      started_at: new Date(),
    });

    const c = toApi(call)!;
    return NextResponse.json({ call: c });
  } catch (error: any) {
    console.error('Server initiate call error:', error);
    const errorMessage = error.message?.includes('Failed to process')
      ? 'Failed to initiate call. Please try again.'
      : error.message?.includes('not configured')
      ? 'Service temporarily unavailable'
      : 'Failed to initiate call. Please try again.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
