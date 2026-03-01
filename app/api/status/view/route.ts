import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Status } from '@/lib/models';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { storyId } = await req.json();

    if (!storyId) {
      return NextResponse.json(
        { error: 'Story ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const status = await Status.findById(storyId);
    if (status) {
      await Status.findByIdAndUpdate(storyId, {
        views_count: (status.views_count || 0) + 1,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Track story view error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to track story view' },
      { status: 500 }
    );
  }
}
