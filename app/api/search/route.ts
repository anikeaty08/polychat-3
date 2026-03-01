import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApiMany } from '@/lib/db';
import { User, SearchHistory } from '@/lib/models';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const query = req.nextUrl.searchParams.get('q');

    if (!query) {
      return NextResponse.json({ users: [] });
    }

    await connectDB();

    const isWalletAddress = query.startsWith('0x');
    const isUsername = query.startsWith('@');
    let searchQuery = query;
    if (isUsername) searchQuery = query.slice(1);

    const filter: Record<string, unknown> = { _id: { $ne: payload.userId } };
    if (isWalletAddress) {
      filter.wallet_address = new RegExp(searchQuery, 'i');
    } else {
      filter.$or = [
        { username: new RegExp(searchQuery, 'i') },
        { display_name: new RegExp(searchQuery, 'i') },
      ];
    }

    const users = await User.find(filter)
      .select('username display_name profile_picture wallet_address is_online last_seen')
      .limit(20)
      .lean();

    if (query.trim()) {
      await SearchHistory.create({
        user_id: payload.userId,
        search_term: query,
      });
    }

    const mapped = users.map((u: any) => ({
      id: String(u._id),
      username: u.username,
      display_name: u.display_name,
      profile_picture: u.profile_picture,
      wallet_address: u.wallet_address,
      is_online: u.is_online,
      last_seen: u.last_seen,
    }));

    return NextResponse.json({ users: mapped });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}
