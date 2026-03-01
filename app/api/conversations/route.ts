import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import {
  Conversation,
  ConversationParticipant,
  Message,
  MessageReadReceipt,
  PrivacySettings,
} from '@/lib/models';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    await connectDB();

    const participants = await ConversationParticipant.find({
      user_id: payload.userId,
    }).distinct('conversation_id');

    if (participants.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const conversations = await Conversation.find({ _id: { $in: participants } })
      .sort({ updatedAt: -1 })
      .lean();

    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv: any) => {
        const lastMessage = await Message.findOne({
          conversation_id: conv._id,
        })
          .sort({ createdAt: -1 })
          .lean();

        const fromOthers = await Message.find({
          conversation_id: conv._id,
          sender_id: { $ne: payload.userId },
        }).select('_id');
        const readIds = await MessageReadReceipt.find({
          user_id: payload.userId,
          message_id: { $in: fromOthers.map((m: any) => m._id) },
        }).distinct('message_id');
        const unreadCount = fromOthers.length - readIds.length;

        const participantRecords = await ConversationParticipant.find({
          conversation_id: conv._id,
        })
          .populate('user_id', 'username display_name profile_picture wallet_address is_online')
          .lean();

        let participant = participantRecords.find(
          (p: any) => String(p.user_id?._id) !== payload.userId
        )?.user_id as any;

        if (participant) {
          const privacySettings = await PrivacySettings.findOne({
            user_id: participant._id,
          });
          const isContact = true;
          if (privacySettings) {
            if (privacySettings.online_status_visibility === 'nobody') {
              participant = { ...participant, is_online: null };
            } else if (privacySettings.online_status_visibility === 'contacts' && !isContact) {
              participant = { ...participant, is_online: null };
            }
            if (privacySettings.last_seen_visibility === 'nobody') {
              participant = { ...participant, last_seen: null };
            } else if (privacySettings.last_seen_visibility === 'contacts' && !isContact) {
              participant = { ...participant, last_seen: null };
            }
            if (privacySettings.photo_visibility === 'nobody') {
              participant = { ...participant, profile_picture: null };
            } else if (privacySettings.photo_visibility === 'contacts' && !isContact) {
              participant = { ...participant, profile_picture: null };
            }
          }
          participant = {
            id: String(participant._id),
            username: participant.username,
            display_name: participant.display_name,
            profile_picture: participant.profile_picture,
            wallet_address: participant.wallet_address,
            is_online: participant.is_online,
          };
        }

        return {
          ...conv,
          id: String(conv._id),
          last_message: lastMessage
            ? { ...lastMessage, id: String(lastMessage._id) }
            : null,
          unread_count: unreadCount,
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
