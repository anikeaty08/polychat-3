import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import {
  Conversation,
  ConversationParticipant,
  Message,
  MessageReadReceipt,
  User,
} from '@/lib/models';
import { uploadEncryptedMessage } from '@/lib/pinata';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { conversationId, content, messageType = 'text', replyToId } = await req.json();

    if (!conversationId || !content) {
      return NextResponse.json(
        { error: 'Conversation ID and content are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const participant = await ConversationParticipant.findOne({
      conversation_id: conversationId,
      user_id: payload.userId,
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    let ipfsHash = null;
    try {
      ipfsHash = await uploadEncryptedMessage(content, {
        conversationId,
        senderId: payload.userId,
        messageType,
      });
    } catch (error) {
      console.error('Failed to upload to IPFS:', error);
    }

    const message = await Message.create({
      conversation_id: conversationId,
      sender_id: payload.userId,
      content,
      message_type: messageType,
      ipfs_hash: ipfsHash,
      reply_to_id: replyToId || null,
    });

    await MessageReadReceipt.create({
      message_id: message._id,
      user_id: payload.userId,
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      last_message_at: new Date(),
    });

    await User.findByIdAndUpdate(payload.userId, {
      last_seen: new Date(),
      is_online: true,
    });

    const m = toApi(message)!;
    return NextResponse.json({
      message: {
        ...m,
        is_read: false,
        read_at: null,
      },
    });
  } catch (error: any) {
    console.error('Create message error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
