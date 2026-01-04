import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);

    const { data: blocked, error } = await supabaseAdmin
      .from('blocked_users')
      .select(
        `
        *,
        user:users!blocked_users_blocked_id_fkey(id, username, display_name, profile_picture, wallet_address)
      `
      )
      .eq('blocker_id', payload.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ users: blocked || [] });
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

    const { data, error } = await supabaseAdmin
      .from('blocked_users')
      .insert({
        blocker_id: payload.userId,
        blocked_id: userId,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, blocked: data });
  } catch (error: any) {
    console.error('Block user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to block user' },
      { status: 500 }
    );
  }
}



