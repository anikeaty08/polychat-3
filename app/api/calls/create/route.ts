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
    const { conversationId, receiverId, callType } = await req.json();

    if (!conversationId || !receiverId || !callType) {
      return NextResponse.json(
        { error: 'Conversation ID, receiver ID, and call type are required' },
        { status: 400 }
      );
    }

    if (!['audio', 'video'].includes(callType)) {
      return NextResponse.json(
        { error: 'Invalid call type. Must be audio or video' },
        { status: 400 }
      );
    }

    // Verify user is participant
    const { data: participant } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', payload.userId)
      .single();

    if (!participant) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Create call record
    const { data: call, error: callError } = await supabaseAdmin
      .from('calls')
      .insert({
        conversation_id: conversationId,
        caller_id: payload.userId,
        receiver_id: receiverId,
        call_type: callType,
        status: 'initiated',
      })
      .select()
      .single();

    if (callError) {
      throw callError;
    }

    // Update user's last_seen
    await supabaseAdmin
      .from('users')
      .update({ last_seen: new Date().toISOString(), is_online: true })
      .eq('id', payload.userId);

    return NextResponse.json({ call });
  } catch (error: any) {
    console.error('Create call error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create call' },
      { status: 500 }
    );
  }
}



