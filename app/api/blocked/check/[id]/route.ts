import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { BlockedUser } from '@/lib/models';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    await connectDB();

    const blocked = await BlockedUser.findOne({
      blocker_id: payload.userId,
      blocked_id: params.id,
    });

    return NextResponse.json({ isBlocked: !!blocked });
  } catch (error: any) {
    console.error('Check blocked status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check blocked status' },
      { status: 500 }
    );
  }
}
