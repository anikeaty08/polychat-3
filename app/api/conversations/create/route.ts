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
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if conversation already exists
    const { data: existingConvs } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', payload.userId);

    const existingConvIds = existingConvs?.map((c) => c.conversation_id) || [];

    if (existingConvIds.length > 0) {
      const { data: existingConv } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId)
        .in('conversation_id', existingConvIds)
        .single();

      if (existingConv) {
        const { data: conv } = await supabaseAdmin
          .from('conversations')
          .select('*')
          .eq('id', existingConv.conversation_id)
          .single();

        if (conv) {
          return NextResponse.json({ conversation: conv });
        }
      }
    }

    // Create new conversation
    const { data: newConversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .insert({
        type: 'direct',
      })
      .select()
      .single();

    if (convError) {
      throw convError;
    }

    // Add participants
    await supabaseAdmin.from('conversation_participants').insert([
      { conversation_id: newConversation.id, user_id: payload.userId },
      { conversation_id: newConversation.id, user_id: userId },
    ]);

    return NextResponse.json({ conversation: newConversation });
  } catch (error: any) {
    console.error('Create conversation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create conversation' },
      { status: 500 }
    );
  }
}



