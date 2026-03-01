import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { BlockedUser } from '@/lib/models';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    await connectDB();

    const blockedList = await BlockedUser.find({ blocker_id: payload.userId })
      .populate('blocked_id', 'username display_name profile_picture wallet_address')
      .sort({ createdAt: -1 })
      .lean();

    const users = blockedList.map((b: any) => {
      const blockedUser = b.blocked_id;
      const u = toApi({ ...blockedUser, _id: blockedUser?._id });
      return {
        ...toApi(b)!,
        user: blockedUser
          ? {
              id: String(blockedUser._id),
              username: blockedUser.username,
              display_name: blockedUser.display_name,
              profile_picture: blockedUser.profile_picture,
              wallet_address: blockedUser.wallet_address,
            }
          : null,
      };
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Get blocked users error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load blocked users' },
      { status: 500 }
    );
  }
}

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

    const blocked = await BlockedUser.create({
      blocker_id: payload.userId,
      blocked_id: userId,
    });

    const b = toApi(blocked)!;
    return NextResponse.json({ success: true, blocked: b });
  } catch (error: any) {
    console.error('Block user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to block user' },
      { status: 500 }
    );
  }
}
