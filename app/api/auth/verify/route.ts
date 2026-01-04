import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

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
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, wallet_address, username, display_name, profile_picture, status, created_at')
      .eq('id', payload.userId)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        username: user.username,
        displayName: user.display_name,
        profilePicture: user.profile_picture,
        status: user.status,
        createdAt: user.created_at,
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
