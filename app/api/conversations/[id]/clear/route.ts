import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { ConversationParticipant, Message } from '@/lib/models';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const conversationId = params.id;
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

    await Message.deleteMany({ conversation_id: conversationId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Clear chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clear chat' },
      { status: 500 }
    );
  }
}
