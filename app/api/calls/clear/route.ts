import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Call } from '@/lib/models';

export async function DELETE(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    await connectDB();

    await Call.deleteMany({
      $or: [
        { caller_id: payload.userId },
        { receiver_id: payload.userId },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Clear call logs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clear call logs' },
      { status: 500 }
    );
  }
}
