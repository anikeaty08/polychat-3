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

    // Get all conversations for user
    const { data: participants, error: participantsError } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', payload.userId);

    if (participantsError) {
      throw participantsError;
    }

    const conversationIds = participants?.map((p) => p.conversation_id) || [];

    if (conversationIds.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // Get conversations with last message
    const { data: conversations, error: conversationsError } = await supabaseAdmin
      .from('conversations')
      .select(
        `
        *,
        participants:conversation_participants(
          user:users(id, username, display_name, profile_picture, wallet_address, is_online)
        )
      `
      )
      .in('id', conversationIds)
      .order('updated_at', { ascending: false });

    if (conversationsError) {
      throw conversationsError;
    }

    // Get last messages and unread counts
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        const { data: lastMessage } = await supabaseAdmin
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const { count: unreadCount } = await supabaseAdmin
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .is('read_receipts', null);

        let participant = conv.participants?.find(
          (p: any) => p.user?.id !== payload.userId
        )?.user;

        // Apply privacy settings for participant
        if (participant) {
          const { data: privacySettings } = await supabaseAdmin
            .from('privacy_settings')
            .select('*')
            .eq('user_id', participant.id)
            .maybeSingle();

          // Check if users are contacts (have a conversation together)
          const isContact = true; // Since they have a conversation, they're effectively contacts

          if (privacySettings) {
            // Apply online status privacy
            if (privacySettings.online_status_visibility === 'nobody') {
              participant = { ...participant, is_online: null };
            } else if (privacySettings.online_status_visibility === 'contacts' && !isContact) {
              participant = { ...participant, is_online: null };
            }

            // Apply last seen privacy
            if (privacySettings.last_seen_visibility === 'nobody') {
              participant = { ...participant, last_seen: null };
            } else if (privacySettings.last_seen_visibility === 'contacts' && !isContact) {
              participant = { ...participant, last_seen: null };
            }

            // Apply profile photo privacy
            // If photo_visibility is 'nobody', always hide
            // If photo_visibility is 'contacts' and not a contact, hide
            if (privacySettings.photo_visibility === 'nobody') {
              participant = { ...participant, profile_picture: null };
            } else if (privacySettings.photo_visibility === 'contacts' && !isContact) {
              participant = { ...participant, profile_picture: null };
            }
            // If 'everyone' or 'contacts' with isContact=true, show the photo
          }
        }

        return {
          ...conv,
          last_message: lastMessage,
          unread_count: unreadCount || 0,
          participant,
        };
      })
    );

    return NextResponse.json({ conversations: conversationsWithDetails });
  } catch (error: any) {
    console.error('Get conversations error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load conversations' },
      { status: 500 }
    );
  }
}



