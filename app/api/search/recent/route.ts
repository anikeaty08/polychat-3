import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { SearchHistory } from '@/lib/models';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    await connectDB();

    const searches = await SearchHistory.find({ user_id: payload.userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('search_term')
      .lean();

    const uniqueSearches = Array.from(
      new Set(searches.map((s: any) => s.search_term))
    );

    return NextResponse.json({ searches: uniqueSearches });
  } catch (error: any) {
    console.error('Get recent searches error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load recent searches' },
      { status: 500 }
    );
  }
}
