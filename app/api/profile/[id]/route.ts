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

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check privacy settings
    const { data: privacySettings } = await supabaseAdmin
      .from('privacy_settings')
      .select('*')
      .eq('user_id', params.id)
      .maybeSingle();

    // Check if blocked
    const { data: blocked } = await supabaseAdmin
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', params.id)
      .eq('blocked_id', payload.userId)
      .maybeSingle();

    if (blocked) {
      return NextResponse.json(
        { error: 'User has blocked you' },
        { status: 403 }
      );
    }

    // Check if viewing own profile
    const isOwnProfile = params.id === payload.userId;

    // Apply privacy settings
    let showOnlineStatus = true;
    let showLastSeen = true;
    let showProfilePicture = true;
    let showStatus = true;

    if (!isOwnProfile && privacySettings) {
      // Check if users are contacts
      const { data: isContact } = await supabaseAdmin
        .from('contacts')
        .select('id')
        .eq('user_id', params.id)
        .eq('contact_id', payload.userId)
        .maybeSingle();

      const isContactUser = !!isContact;

      // Apply privacy rules
      if (privacySettings.online_status_visibility === 'contacts' && !isContactUser) {
        showOnlineStatus = false;
      } else if (privacySettings.online_status_visibility === 'nobody') {
        showOnlineStatus = false;
      }

      if (privacySettings.last_seen_visibility === 'contacts' && !isContactUser) {
        showLastSeen = false;
      } else if (privacySettings.last_seen_visibility === 'nobody') {
        showLastSeen = false;
      }

      if (privacySettings.photo_visibility === 'contacts' && !isContactUser) {
        showProfilePicture = false;
      } else if (privacySettings.photo_visibility === 'nobody') {
        showProfilePicture = false;
      }

      if (privacySettings.status_visibility === 'contacts' && !isContactUser) {
        showStatus = false;
      } else if (privacySettings.status_visibility === 'nobody') {
        showStatus = false;
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        wallet_address: user.wallet_address,
        username: user.username,
        display_name: user.display_name,
        profile_picture: showProfilePicture ? user.profile_picture : null,
        status: showStatus ? user.status : null,
        is_online: showOnlineStatus ? user.is_online : null,
        last_seen: showLastSeen ? user.last_seen : null,
        created_at: user.created_at,
      },
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load profile' },
      { status: 500 }
    );
  }
}

