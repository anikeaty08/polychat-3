import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import {
  ConversationParticipant,
  Message,
  MessageReadReceipt,
  MessageReaction,
} from '@/lib/models';

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

    await connectDB();

    const participant = await ConversationParticipant.findOne({
      conversation_id: params.conversationId,
      user_id: payload.userId,
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const messages = await Message.find({
      conversation_id: params.conversationId,
    })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const otherParticipant = await ConversationParticipant.findOne({
      conversation_id: params.conversationId,
      user_id: { $ne: payload.userId },
    }).lean();

    const messageIds = messages.map((m: any) => m._id);
    const readReceipts = await MessageReadReceipt.find({
      message_id: { $in: messageIds },
    }).lean();

    // Mark messages as read by current user (upsert)
    for (const msg of messages) {
      await MessageReadReceipt.findOneAndUpdate(
        { message_id: msg._id, user_id: payload.userId },
        { read_at: new Date() },
        { upsert: true }
      );
    }

    const messageReactions =
      messageIds.length > 0
        ? await MessageReaction.find({ message_id: { $in: messageIds } })
          .populate('user_id', 'username display_name profile_picture')
          .lean()
        : [];

    const reactionsByMessage: Record<string, any[]> = {};
    messageReactions.forEach((r: any) => {
      const mid = String(r.message_id);
      if (!reactionsByMessage[mid]) reactionsByMessage[mid] = [];
      reactionsByMessage[mid].push({
        ...r,
        user: r.user_id
          ? {
              id: String(r.user_id._id),
              username: r.user_id.username,
              display_name: r.user_id.display_name,
              profile_picture: r.user_id.profile_picture,
            }
          : null,
      });
    });

    const messagesWithStatus = messages.map((msg: any) => {
      const receipts = readReceipts.filter(
        (rr: any) => String(rr.message_id) === String(msg._id)
      );
      const isRead = otherParticipant
        ? receipts.some(
            (rr: any) => String(rr.user_id) === String(otherParticipant.user_id)
          )
        : false;
      const otherReceipt = receipts.find(
        (rr: any) => String(rr.user_id) === String(otherParticipant?.user_id)
      );
      return {
        ...msg,
        id: String(msg._id),
        is_read: isRead,
        read_at: otherReceipt?.read_at || null,
        reactions: reactionsByMessage[String(msg._id)] || [],
      };
    });

    return NextResponse.json({
      messages: messagesWithStatus.reverse(),
      hasMore: messages.length === limit,
    });
  } catch (error: any) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load messages' },
      { status: 500 }
    );
  }
}
