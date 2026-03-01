import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { Call } from '@/lib/models';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const type = req.nextUrl.searchParams.get('type') || 'all';

    await connectDB();

    const filter: Record<string, unknown> = {
      $or: [
        { caller_id: payload.userId },
        { receiver_id: payload.userId },
      ],
    };
    if (type === 'audio') filter.call_type = 'audio';
    else if (type === 'video') filter.call_type = 'video';
    else if (type === 'missed') filter.status = 'missed';

    const calls = await Call.find(filter)
      .populate('caller_id', 'username display_name profile_picture')
      .populate('receiver_id', 'username display_name profile_picture')
      .sort({ createdAt: -1 })
      .lean();

    const formattedCalls = calls.map((call: any) => {
      const contact =
        String(call.caller_id?._id) === payload.userId
          ? call.receiver_id
          : call.caller_id;
      return {
        ...call,
        id: String(call._id),
        contact: contact
          ? {
              id: String(contact._id),
              username: contact.username,
              display_name: contact.display_name,
              profile_picture: contact.profile_picture,
            }
          : null,
      };
    });

    return NextResponse.json({ calls: formattedCalls });
  } catch (error: any) {
    console.error('Get calls error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load calls' },
      { status: 500 }
    );
  }
}
