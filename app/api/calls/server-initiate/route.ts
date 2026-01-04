import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { initiateCallOnChain } from '@/lib/server-wallet';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { conversationId, receiverId, receiverWalletAddress, callType } = await req.json();

    if (!conversationId || !receiverId || !receiverWalletAddress || callType === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if SERVER_PRIVATE_KEY is configured
    if (!process.env.SERVER_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Server wallet not configured' },
        { status: 500 }
      );
    }

    // Initiate call on-chain using server wallet
    // callType: 0 = Audio, 1 = Video
    const callTypeNumber = callType === 'video' ? 1 : 0;
    const { hash: transactionHash } = await initiateCallOnChain(
      receiverWalletAddress.toLowerCase(),
      callTypeNumber
    );

    // Record call in database
    const { data: call, error: callError } = await supabaseAdmin
      .from('calls')
      .insert({
        conversation_id: conversationId,
        caller_id: payload.userId,
        receiver_id: receiverId,
        call_type: callType,
        status: 'initiated',
        transaction_hash: transactionHash,
        on_chain: true,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (callError) {
      throw callError;
    }

    return NextResponse.json({ call });
  } catch (error: any) {
    console.error('Server initiate call error:', error);
    // Return user-friendly error message
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

