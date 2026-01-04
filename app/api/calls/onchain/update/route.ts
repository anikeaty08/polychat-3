import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
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

    // Verify transaction on-chain
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

      // Get call from database
      const { data: call } = await supabaseAdmin
        .from('calls')
        .select('*')
        .eq('id', callId)
        .single();

      if (!call) {
        return NextResponse.json(
          { error: 'Call not found' },
          { status: 404 }
        );
      }

      // Update call status in database
      const { data: updatedCall, error: updateError } = await supabaseAdmin
        .from('calls')
        .update({
          status,
          transaction_hash: transactionHash,
          on_chain: true,
          ...(status === 'answered' && { started_at: new Date().toISOString() }),
          ...((status === 'completed' || status === 'missed' || status === 'declined') && {
            ended_at: new Date().toISOString(),
          }),
        })
        .eq('id', callId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({ call: updatedCall });
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



