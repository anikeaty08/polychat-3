import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { Message, ConversationParticipant, MessageReaction } from '@/lib/models';

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

    await connectDB();

    const message = await Message.findById(messageId).select('conversation_id');
    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    const participant = await ConversationParticipant.findOne({
      conversation_id: message.conversation_id,
      user_id: payload.userId,
    });

    if (!participant) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const existingReaction = await MessageReaction.findOne({
      message_id: messageId,
      user_id: payload.userId,
      emoji,
    });

    if (existingReaction) {
      await MessageReaction.findByIdAndDelete(existingReaction._id);
      return NextResponse.json({
        success: true,
        action: 'removed',
        reaction: null,
      });
    }

    const reaction = await MessageReaction.create({
      message_id: messageId,
      user_id: payload.userId,
      emoji,
    });

    const populated = await MessageReaction.findById(reaction._id)
      .populate('user_id', 'username display_name profile_picture')
      .lean();

    const r = populated
      ? {
          ...populated,
          id: String(populated._id),
          user: (populated as any).user_id
            ? {
                id: String((populated as any).user_id._id),
                username: (populated as any).user_id.username,
                display_name: (populated as any).user_id.display_name,
                profile_picture: (populated as any).user_id.profile_picture,
              }
            : null,
        }
      : toApi(reaction)!;

    return NextResponse.json({
      success: true,
      action: 'added',
      reaction: r,
    });
  } catch (error: any) {
    console.error('Reaction error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update reaction' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const reactions = await MessageReaction.find({ message_id: messageId })
      .populate('user_id', 'username display_name profile_picture')
      .sort({ createdAt: 1 })
      .lean();

    const groupedReactions: Record<string, any[]> = {};
    reactions.forEach((r: any) => {
      if (!groupedReactions[r.emoji]) groupedReactions[r.emoji] = [];
      groupedReactions[r.emoji].push({
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

    return NextResponse.json({
      reactions: reactions.map((r: any) => ({
        ...r,
        id: String(r._id),
        user: r.user_id ? { id: String(r.user_id._id), ...r.user_id } : null,
      })),
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
