import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Report } from '@/lib/models';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { userId, reason, description } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (userId === payload.userId) {
      return NextResponse.json(
        { error: 'Cannot report yourself' },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await Report.findOne({
      reporter_id: payload.userId,
      reported_id: userId,
    });

    if (existing) {
      return NextResponse.json(
        { error: 'You have already reported this user' },
        { status: 400 }
      );
    }

    await Report.create({
      reporter_id: payload.userId,
      reported_id: userId,
      reason,
      description,
    });

    return NextResponse.json({
      success: true,
      message: 'Report submitted successfully. Our team will review it.',
    });
  } catch (error: any) {
    console.error('Report user error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit report' },
      { status: 500 }
    );
  }
}
