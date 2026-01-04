import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { id } = await params;

    // Check if current user has blocked the participant
    const { data: blocked } = await supabaseAdmin
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', payload.userId)
      .eq('blocked_id', id)
      .maybeSingle();

    return NextResponse.json({ isBlocked: !!blocked });
  } catch (error: any) {
    console.error('Check blocked status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check blocked status' },
      { status: 500 }
    );
  }
}

