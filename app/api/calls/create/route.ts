import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { Call, ConversationParticipant, User } from '@/lib/models';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { conversationId, receiverId, callType } = await req.json();

    if (!conversationId || !receiverId || !callType) {
      return NextResponse.json(
        { error: 'Conversation ID, receiver ID, and call type are required' },
        { status: 400 }
      );
    }

    if (!['audio', 'video'].includes(callType)) {
      return NextResponse.json(
        { error: 'Invalid call type. Must be audio or video' },
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

    const call = await Call.create({
      conversation_id: conversationId,
      caller_id: payload.userId,
      receiver_id: receiverId,
      call_type: callType,
      status: 'initiated',
    });

    await User.findByIdAndUpdate(payload.userId, {
      last_seen: new Date(),
      is_online: true,
    });

    const c = toApi(call)!;
    return NextResponse.json({ call: c });
  } catch (error: any) {
    console.error('Create call error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create call' },
      { status: 500 }
    );
  }
}
