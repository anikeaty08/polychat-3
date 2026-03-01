import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { Conversation, Message, User } from '@/lib/models';
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
    const {
      conversationId,
      receiverWalletAddress,
      content,
      messageType = 'text',
      ipfsHash = '',
    } = await req.json();

    if (!conversationId || !receiverWalletAddress || !content) {
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

    await connectDB();

    const user = await User.findById(payload.userId).select('wallet_address');
    if (!user?.wallet_address) {
      return NextResponse.json(
        { error: 'User wallet address not found' },
        { status: 400 }
      );
    }

    const senderWallet = user.wallet_address.toLowerCase();

    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC
    );
    const messagingContract = getMessagingContract(provider);
    const onChainConversationId = await messagingContract.getConversationId(
      senderWallet,
      receiverWalletAddress.toLowerCase()
    );

    try {
      await createConversationOnChain(
        senderWallet,
        receiverWalletAddress.toLowerCase()
      );
    } catch (error: any) {
      if (!error.message?.includes('already exists')) {
        console.log('Conversation creation:', error);
      }
    }

    const { hash: transactionHash } = await sendMessageOnChain(
      onChainConversationId,
      receiverWalletAddress.toLowerCase(),
      content,
      messageType,
      ipfsHash
    );

    const message = await Message.create({
      conversation_id: conversationId,
      sender_id: payload.userId,
      content,
      message_type: messageType,
      ipfs_hash: ipfsHash || null,
      transaction_hash: transactionHash,
      on_chain: true,
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      last_message_at: new Date(),
    });

    const m = toApi(message)!;
    return NextResponse.json({
      message: {
        ...m,
        is_read: false,
      },
    });
  } catch (error: any) {
    console.error('Server send message error:', error);
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
