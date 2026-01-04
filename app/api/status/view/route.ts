import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { storyId } = await req.json();

    if (!storyId) {
      return NextResponse.json({ error: 'Story ID is required' }, { status: 400 });
    }

    // Update views count
    const { data: status } = await supabaseAdmin
      .from('statuses')
      .select('views_count')
      .eq('id', storyId)
      .single();

    if (status) {
      await supabaseAdmin
        .from('statuses')
        .update({ views_count: (status.views_count || 0) + 1 })
        .eq('id', storyId);
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

