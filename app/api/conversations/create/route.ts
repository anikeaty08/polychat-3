import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { Conversation, ConversationParticipant } from '@/lib/models';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const existingParticipations = await ConversationParticipant.find({
      user_id: payload.userId,
    }).distinct('conversation_id');

    if (existingParticipations.length > 0) {
      const existingWithOther = await ConversationParticipant.findOne({
        user_id: userId,
        conversation_id: { $in: existingParticipations },
      });

      if (existingWithOther) {
        const conv = await Conversation.findById(existingWithOther.conversation_id);
        if (conv) {
          const c = toApi(conv)!;
          return NextResponse.json({ conversation: c });
        }
      }
    }

    const newConversation = await Conversation.create({ type: 'direct' });

    await ConversationParticipant.insertMany([
      { conversation_id: newConversation._id, user_id: payload.userId },
      { conversation_id: newConversation._id, user_id: userId },
    ]);

    const c = toApi(newConversation)!;
    return NextResponse.json({ conversation: c });
  } catch (error: any) {
    console.error('Create conversation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
