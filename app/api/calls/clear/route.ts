import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);

    // Delete all calls for the user (as caller or receiver)
    const { error } = await supabaseAdmin
      .from('calls')
      .delete()
      .or(`caller_id.eq.${payload.userId},receiver_id.eq.${payload.userId}`);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Clear call logs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clear call logs' },
      { status: 500 }
    );
  }
}



