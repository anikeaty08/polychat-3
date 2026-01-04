import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Add or remove a reaction to a message
 * POST: { messageId, emoji } - toggle reaction
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { messageId, emoji } = await req.json();

    if (!messageId || !emoji) {
      return NextResponse.json(
        { error: 'Message ID and emoji are required' },
        { status: 400 }
      );
    }

    // Verify message exists and user has access
    const { data: message } = await supabaseAdmin
      .from('messages')
      .select('id, conversation_id')
      .eq('id', messageId)
      .single();

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Verify user is participant in conversation
    const { data: participant } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('conversation_id', message.conversation_id)
      .eq('user_id', payload.userId)
      .single();

    if (!participant) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if reaction already exists
    const { data: existingReaction } = await supabaseAdmin
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', payload.userId)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existingReaction) {
      // Remove reaction
      await supabaseAdmin
        .from('message_reactions')
        .delete()
        .eq('id', existingReaction.id);

      return NextResponse.json({
        success: true,
        action: 'removed',
        reaction: null,
      });
    } else {
      // Add reaction
      const { data: reaction, error } = await supabaseAdmin
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: payload.userId,
          emoji,
        })
        .select(`
          *,
          user:users(id, username, display_name, profile_picture)
        `)
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        action: 'added',
        reaction,
      });
    }
  } catch (error: any) {
    console.error('Reaction error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update reaction' },
      { status: 500 }
    );
  }
}

/**
 * Get all reactions for a message
 * GET: ?messageId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    // Get all reactions for this message
    const { data: reactions, error } = await supabaseAdmin
      .from('message_reactions')
      .select(`
        *,
        user:users(id, username, display_name, profile_picture)
      `)
      .eq('message_id', messageId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // Group reactions by emoji
    const groupedReactions: Record<string, any[]> = {};
    reactions?.forEach((reaction) => {
      if (!groupedReactions[reaction.emoji]) {
        groupedReactions[reaction.emoji] = [];
      }
      groupedReactions[reaction.emoji].push(reaction);
    });

    return NextResponse.json({
      reactions: reactions || [],
      grouped: groupedReactions,
    });
  } catch (error: any) {
    console.error('Get reactions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get reactions' },
      { status: 500 }
    );
  }
}



