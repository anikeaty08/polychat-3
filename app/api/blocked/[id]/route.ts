import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);

    const { error } = await supabaseAdmin
      .from('blocked_users')
      .delete()
      .eq('blocker_id', payload.userId)
      .eq('blocked_id', params.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Unblock user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to unblock user' },
      { status: 500 }
    );
  }
}



