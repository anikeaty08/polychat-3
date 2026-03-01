import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { User } from '@/lib/models';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    await connectDB();

    const user = await User.findById(payload.userId).select(
      'wallet_address username display_name profile_picture status createdAt'
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const u = toApi(user)!;
    return NextResponse.json({
      user: {
        id: u.id,
        walletAddress: u.wallet_address,
        username: u.username,
        displayName: u.display_name,
        profilePicture: u.profile_picture,
        status: u.status,
        createdAt: u.createdAt,
      },
      valid: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Invalid token', valid: false },
      { status: 401 }
    );
  }
}
