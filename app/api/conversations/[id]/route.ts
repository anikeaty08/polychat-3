import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);

    const { data: conversation, error } = await supabaseAdmin
      .from('conversations')
      .select(
        `
        *,
        participants:conversation_participants(
          user_id,
          role,
          user:users(*)
        )
      `
      )
      .eq('id', params.id)
      .single();

    if (error || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Check if user is participant
    const isParticipant = conversation.participants?.some(
      (p: any) => p.user_id === payload.userId
    );

    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Apply privacy settings for participants
    const participantsWithPrivacy = await Promise.all(
      (conversation.participants || []).map(async (p: any) => {
        if (!p.user || p.user.id === payload.userId) {
          return p; // Don't apply privacy to self
        }

        const { data: privacySettings } = await supabaseAdmin
          .from('privacy_settings')
          .select('*')
          .eq('user_id', p.user.id)
          .maybeSingle();

        // Check if users are contacts (have a conversation together)
        const isContact = true; // Since they have a conversation, they're effectively contacts

        let user = { ...p.user };

        if (privacySettings) {
          // Apply online status privacy
          if (privacySettings.online_status_visibility === 'contacts' && !isContact) {
            user.is_online = null;
          } else if (privacySettings.online_status_visibility === 'nobody') {
            user.is_online = null;
          }

          // Apply last seen privacy
          if (privacySettings.last_seen_visibility === 'contacts' && !isContact) {
            user.last_seen = null;
          } else if (privacySettings.last_seen_visibility === 'nobody') {
            user.last_seen = null;
          }

          // Apply profile photo privacy
          // If photo_visibility is 'contacts', show only if they have a conversation (are contacts)
          // If photo_visibility is 'nobody', always hide
          if (privacySettings.photo_visibility === 'nobody') {
            user.profile_picture = null;
          } else if (privacySettings.photo_visibility === 'contacts' && !isContact) {
            user.profile_picture = null;
          }
          // If 'everyone' or 'contacts' with isContact=true, show the photo
        }

        return {
          ...p,
          user,
        };
      })
    );

    return NextResponse.json({
      conversation: {
        ...conversation,
        participants: participantsWithPrivacy,
      },
    });
  } catch (error: any) {
    console.error('Get conversation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load conversation' },
      { status: 500 }
    );
  }
}



