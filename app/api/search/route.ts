import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

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

    // Search by username or wallet address
    const isWalletAddress = query.startsWith('0x');
    const isUsername = query.startsWith('@');

    let searchQuery = query;
    if (isUsername) {
      searchQuery = query.slice(1);
    }

    let usersQuery = supabaseAdmin
      .from('users')
      .select('id, username, display_name, profile_picture, wallet_address, is_online, last_seen')
      .neq('id', payload.userId)
      .limit(20);

    if (isWalletAddress) {
      usersQuery = usersQuery.ilike('wallet_address', `%${searchQuery}%`);
    } else {
      usersQuery = usersQuery.or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`);
    }

    const { data: users, error } = await usersQuery;

    if (error) {
      throw error;
    }

    // Save search to history
    if (query.trim()) {
      await supabaseAdmin.from('search_history').insert({
        user_id: payload.userId,
        search_term: query,
      });
    }

    return NextResponse.json({ users: users || [] });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}



