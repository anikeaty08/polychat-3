import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    // Verify user is participant
    const { data: participant } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('conversation_id', params.conversationId)
      .eq('user_id', payload.userId)
      .single();

    if (!participant) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get messages
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', params.conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Get other participant ID
    const { data: otherParticipant } = await supabaseAdmin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', params.conversationId)
      .neq('user_id', payload.userId)
      .single();

    // Get all read receipts for these messages
    const messageIds = messages?.map((m) => m.id) || [];
    const { data: readReceipts } = await supabaseAdmin
      .from('message_read_receipts')
      .select('message_id, user_id, read_at')
      .in('message_id', messageIds);

    // Mark messages as read by current user
    if (messages && messages.length > 0) {
      await supabaseAdmin.from('message_read_receipts').upsert(
        messageIds.map((id) => ({
          message_id: id,
          user_id: payload.userId,
        })),
        { onConflict: 'message_id,user_id' }
      );
    }

    // Get all reactions for these messages
    const { data: messageReactions } = messageIds.length > 0
      ? await supabaseAdmin
          .from('message_reactions')
          .select(`
            *,
            user:users(id, username, display_name, profile_picture)
          `)
          .in('message_id', messageIds)
      : { data: null };

    // Group reactions by message ID
    const reactionsByMessage: Record<string, any[]> = {};
    messageReactions?.forEach((reaction: any) => {
      if (!reactionsByMessage[reaction.message_id]) {
        reactionsByMessage[reaction.message_id] = [];
      }
      reactionsByMessage[reaction.message_id].push(reaction);
    });

    // Add read receipt status and reactions to messages
    const messagesWithStatus = messages?.map((msg) => {
      const receipts = readReceipts?.filter((rr) => rr.message_id === msg.id) || [];
      const isRead = otherParticipant
        ? receipts.some((rr) => rr.user_id === otherParticipant.user_id)
        : false;
      return {
        ...msg,
        is_read: isRead,
        read_at: receipts.find((rr) => rr.user_id === otherParticipant?.user_id)?.read_at || null,
        reactions: reactionsByMessage[msg.id] || [],
      };
    });

    return NextResponse.json({
      messages: messagesWithStatus?.reverse() || [],
      hasMore: (messages?.length || 0) === limit,
    });
  } catch (error: any) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load messages' },
      { status: 500 }
    );
  }
}

