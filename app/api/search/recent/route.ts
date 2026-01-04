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

    const { data: searches, error } = await supabaseAdmin
      .from('search_history')
      .select('search_term')
      .eq('user_id', payload.userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    const uniqueSearches = Array.from(
      new Set(searches?.map((s) => s.search_term) || [])
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



