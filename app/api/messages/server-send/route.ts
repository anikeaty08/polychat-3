import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { sendMessageOnChain, createConversationOnChain } from '@/lib/server-wallet';
import { getMessagingContract } from '@/lib/contracts';
import { ethers } from 'ethers';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { conversationId, receiverWalletAddress, content, messageType = 'text', ipfsHash = '' } = await req.json();

    if (!conversationId || !receiverWalletAddress || !content) {
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

    // Get user's wallet address
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', payload.userId)
      .single();

    if (!user?.wallet_address) {
      return NextResponse.json(
        { error: 'User wallet address not found' },
        { status: 400 }
      );
    }

    const senderWallet = user.wallet_address.toLowerCase();

    // Get on-chain conversation ID
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC
    );
    const messagingContract = getMessagingContract(provider);
    const onChainConversationId = await messagingContract.getConversationId(
      senderWallet,
      receiverWalletAddress.toLowerCase()
    );

    // Create conversation if needed
    try {
      await createConversationOnChain(senderWallet, receiverWalletAddress.toLowerCase());
    } catch (error: any) {
      // Conversation might already exist, continue
      if (!error.message?.includes('already exists')) {
        console.log('Conversation creation:', error);
      }
    }

    // Send message on-chain using server wallet
    const { hash: transactionHash } = await sendMessageOnChain(
      onChainConversationId,
      receiverWalletAddress.toLowerCase(),
      content,
      messageType,
      ipfsHash
    );

    // Record message in database
    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: payload.userId,
        content,
        message_type: messageType,
        ipfs_hash: ipfsHash || null,
        transaction_hash: transactionHash,
        on_chain: true,
      })
      .select()
      .single();

    if (messageError) {
      throw messageError;
    }

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
      },
    });
  } catch (error: any) {
    console.error('Server send message error:', error);
    // Return user-friendly error message
    const errorMessage = error.message?.includes('Failed to process') 
      ? 'Failed to send message. Please try again.'
      : error.message?.includes('not configured')
      ? 'Service temporarily unavailable'
      : 'Failed to send message. Please try again.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

