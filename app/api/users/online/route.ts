import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { isOnline } = await req.json();

    // Update user's online status and last_seen
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        is_online: isOnline !== false,
        last_seen: new Date().toISOString(),
      })
      .eq('id', payload.userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update online status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update online status' },
      { status: 500 }
    );
  }
}



