import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { User, PrivacySettings, BlockedUser, Contact } from '@/lib/models';

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
    await connectDB();

    const user = await User.findById(params.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const privacySettings = await PrivacySettings.findOne({ user_id: params.id });

    const blocked = await BlockedUser.findOne({
      blocker_id: params.id,
      blocked_id: payload.userId,
    });

    if (blocked) {
      return NextResponse.json(
        { error: 'User has blocked you' },
        { status: 403 }
      );
    }

    const isOwnProfile = params.id === payload.userId;

    let showOnlineStatus = true;
    let showLastSeen = true;
    let showProfilePicture = true;
    let showStatus = true;

    if (!isOwnProfile && privacySettings) {
      const isContact = await Contact.findOne({
        user_id: params.id,
        contact_id: payload.userId,
      });
      const isContactUser = !!isContact;

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

    const u = toApi(user)!;
    return NextResponse.json({
      user: {
        id: u.id,
        wallet_address: u.wallet_address,
        username: u.username,
        display_name: u.display_name,
        profile_picture: showProfilePicture ? u.profile_picture : null,
        status: showStatus ? u.status : null,
        is_online: showOnlineStatus ? u.is_online : null,
        last_seen: showLastSeen ? u.last_seen : null,
        created_at: u.createdAt,
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
