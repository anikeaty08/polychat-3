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
    const { 
      receiverWalletAddress, 
      callType, 
      transactionHash 
    } = await req.json();

    if (!receiverWalletAddress || !callType || !transactionHash) {
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

      // Verify it's a call transaction
      const callsContract = getCallsContract(provider);
      const contractAddress = callsContract.target;
      
      const receiptTo = receipt.to ? String(receipt.to) : '';
      const contractAddr = contractAddress ? String(contractAddress) : '';
      if (receiptTo && contractAddr && receiptTo.toLowerCase() !== contractAddr.toLowerCase()) {
        return NextResponse.json(
          { error: 'Invalid contract address' },
          { status: 400 }
        );
      }

      // Get user wallet address
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('wallet_address')
        .eq('id', payload.userId)
        .single();

      if (!user || user.wallet_address.toLowerCase() !== tx.from?.toLowerCase()) {
        return NextResponse.json(
          { error: 'Wallet address mismatch' },
          { status: 403 }
        );
      }

      // Get receiver user ID
      const { data: receiver } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('wallet_address', receiverWalletAddress.toLowerCase())
        .single();

      if (!receiver) {
        return NextResponse.json(
          { error: 'Receiver not found' },
          { status: 404 }
        );
      }

      // Create call record in database
      const { data: call, error: callError } = await supabaseAdmin
        .from('calls')
        .insert({
          caller_id: payload.userId,
          receiver_id: receiver.id,
          call_type: callType,
          status: 'initiated',
          transaction_hash: transactionHash,
          on_chain: true,
        })
        .select()
        .single();

      if (callError) {
        throw callError;
      }

      return NextResponse.json({ call });
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

