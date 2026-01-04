import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { status, duration } = await req.json();

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Get call
    const { data: call, error: callError } = await supabaseAdmin
      .from('calls')
      .select('*')
      .eq('id', params.id)
      .single();

    if (callError || !call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Verify user is caller or receiver
    if (call.caller_id !== payload.userId && call.receiver_id !== payload.userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const updateData: any = { status };

    if (status === 'answered') {
      updateData.started_at = new Date().toISOString();
    }

    if (status === 'completed' || status === 'missed' || status === 'declined' || status === 'cancelled') {
      updateData.ended_at = new Date().toISOString();
      if (duration) {
        updateData.duration = duration;
      }
    }

    // Update call
    const { data: updatedCall, error: updateError } = await supabaseAdmin
      .from('calls')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Update user's last_seen
    await supabaseAdmin
      .from('users')
      .update({ last_seen: new Date().toISOString(), is_online: true })
      .eq('id', payload.userId);

    return NextResponse.json({ call: updatedCall });
  } catch (error: any) {
    console.error('Update call error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update call' },
      { status: 500 }
    );
  }
}



