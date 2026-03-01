import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { isOnline } = await req.json();

    await connectDB();

    await User.findByIdAndUpdate(payload.userId, {
      is_online: isOnline !== false,
      last_seen: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update online status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update online status' },
      { status: 500 }
    );
  }
}
