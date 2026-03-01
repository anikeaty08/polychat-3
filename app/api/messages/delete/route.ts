import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Message } from '@/lib/models';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { messageIds } = await req.json();

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: 'Message IDs are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const messages = await Message.find({ _id: { $in: messageIds } }).select(
      'sender_id'
    );

    const unauthorized = messages.filter(
      (m) => String(m.sender_id) !== payload.userId
    );
    if (unauthorized.length > 0) {
      return NextResponse.json(
        { error: 'You can only delete your own messages' },
        { status: 403 }
      );
    }

    await Message.deleteMany({ _id: { $in: messageIds } });

    return NextResponse.json({ success: true, deletedCount: messageIds.length });
  } catch (error: any) {
    console.error('Delete messages error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete messages' },
      { status: 500 }
    );
  }
}
