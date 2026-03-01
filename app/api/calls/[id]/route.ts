import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { Call, User } from '@/lib/models';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { status, duration } = await req.json();

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const call = await Call.findById(params.id);
    if (!call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    if (
      String(call.caller_id) !== payload.userId &&
      String(call.receiver_id) !== payload.userId
    ) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = { status };

    if (status === 'answered') {
      updateData.started_at = new Date();
    }

    if (
      ['completed', 'missed', 'declined', 'cancelled'].includes(status)
    ) {
      updateData.ended_at = new Date();
      if (duration) updateData.duration = duration;
    }

    const updatedCall = await Call.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    );

    await User.findByIdAndUpdate(payload.userId, {
      last_seen: new Date(),
      is_online: true,
    });

    const c = toApi(updatedCall)!;
    return NextResponse.json({ call: c });
  } catch (error: any) {
    console.error('Update call error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update call' },
      { status: 500 }
    );
  }
}
