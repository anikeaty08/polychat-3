import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getMessagingContract } from '@/lib/contracts';
import { ethers } from 'ethers';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { 
      conversationId, 
      receiverWalletAddress, 
      content, 
      messageType = 'text',
      ipfsHash = '',
      transactionHash 
    } = await req.json();

    if (!conversationId || !receiverWalletAddress || !content || !transactionHash) {
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

      // Verify it's a message transaction
      const messagingContract = getMessagingContract(provider);
      const contractAddress = String(messagingContract.target);
      const receiptTo = receipt.to ? String(receipt.to) : '';
      
      if (receiptTo && contractAddress && receiptTo.toLowerCase() !== contractAddress.toLowerCase()) {
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
    } catch (error) {
      console.error('Transaction verification error:', error);
      return NextResponse.json(
        { error: 'Failed to verify transaction' },
        { status: 500 }
      );
    }

    // Create message in database
    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: payload.userId,
        content,
        message_type: messageType,
        ipfs_hash: ipfsHash,
        transaction_hash: transactionHash,
        on_chain: true,
      })
      .select()
      .single();

    if (messageError) {
      throw messageError;
    }

    // Mark as read by sender
    await supabaseAdmin.from('message_read_receipts').insert({
      message_id: message.id,
      user_id: payload.userId,
    });

    // Update conversation
    await supabaseAdmin
      .from('conversations')
      .update({
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    return NextResponse.json({ 
      message: {
        ...message,
        is_read: false,
        read_at: null,
      }
    });
  } catch (error: any) {
    console.error('On-chain message error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process on-chain message' },
      { status: 500 }
    );
  }
}

