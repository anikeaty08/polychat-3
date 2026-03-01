import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { Conversation, ConversationParticipant, PrivacySettings } from '@/lib/models';

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

    const conversation = await Conversation.findById(params.id);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const participants = await ConversationParticipant.find({
      conversation_id: params.id,
    })
      .populate('user_id')
      .lean();

    const isParticipant = participants.some(
      (p: any) => String(p.user_id?._id) === payload.userId
    );

    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const participantsWithPrivacy = await Promise.all(
      participants.map(async (p: any) => {
        if (!p.user_id || String(p.user_id._id) === payload.userId) {
          return { ...p, user: p.user_id };
        }

        const privacySettings = await PrivacySettings.findOne({
          user_id: p.user_id._id,
        });
        const isContact = true; // have conversation

        let user: any = p.user_id && typeof p.user_id === 'object'
          ? (p.user_id as any).toObject?.() || { ...p.user_id }
          : p.user_id;

        if (privacySettings) {
          if (privacySettings.online_status_visibility === 'contacts' && !isContact) {
            user.is_online = null;
          } else if (privacySettings.online_status_visibility === 'nobody') {
            user.is_online = null;
          }
          if (privacySettings.last_seen_visibility === 'contacts' && !isContact) {
            user.last_seen = null;
          } else if (privacySettings.last_seen_visibility === 'nobody') {
            user.last_seen = null;
          }
          if (privacySettings.photo_visibility === 'nobody') {
            user.profile_picture = null;
          } else if (privacySettings.photo_visibility === 'contacts' && !isContact) {
            user.profile_picture = null;
          }
        }

        return {
          ...p,
          user: { ...user, id: String(user._id) },
        };
      })
    );

    const c = toApi(conversation)!;
    return NextResponse.json({
      conversation: {
        ...c,
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
