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
import { uploadToPinata, getIPFSUrl } from '@/lib/pinata';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const formData = await req.formData();

    const conversationId = formData.get('conversationId') as string;
    const file = formData.get('file') as File;
    const messageType = (formData.get('messageType') as string) || 'file';

    if (!conversationId || !file) {
      return NextResponse.json(
        { error: 'Conversation ID and file are required' },
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
    let fileUrl = null;
    try {
      ipfsHash = await uploadToPinata(file, file.name);
      fileUrl = getIPFSUrl(ipfsHash);
    } catch (error) {
      console.error('Failed to upload file to IPFS:', error);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    const message = await Message.create({
      conversation_id: conversationId,
      sender_id: payload.userId,
      content: fileUrl,
      message_type: messageType,
      ipfs_hash: ipfsHash,
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
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
      },
    });
  } catch (error: any) {
    console.error('Upload message error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
