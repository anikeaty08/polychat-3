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
    const type = req.nextUrl.searchParams.get('type') || 'all';

    let query = supabaseAdmin
      .from('calls')
      .select(
        `
        *,
        caller:users!calls_caller_id_fkey(id, username, display_name, profile_picture),
        receiver:users!calls_receiver_id_fkey(id, username, display_name, profile_picture)
      `
      )
      .or(`caller_id.eq.${payload.userId},receiver_id.eq.${payload.userId}`)
      .order('created_at', { ascending: false });

    if (type === 'audio') {
      query = query.eq('call_type', 'audio');
    } else if (type === 'video') {
      query = query.eq('call_type', 'video');
    } else if (type === 'missed') {
      query = query.eq('status', 'missed');
    }

    const { data: calls, error } = await query;

    if (error) {
      throw error;
    }

    // Format calls with contact info
    const formattedCalls = calls?.map((call) => {
      const contact = call.caller_id === payload.userId ? call.receiver : call.caller;
      return {
        ...call,
        contact,
      };
    });

    return NextResponse.json({ calls: formattedCalls || [] });
  } catch (error: any) {
    console.error('Get calls error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load calls' },
      { status: 500 }
    );
  }
}



