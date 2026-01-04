import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { usernameSchema } from '@/lib/validators';

export async function GET(req: NextRequest) {
  try {
    const username = req.nextUrl.searchParams.get('username');

    if (!username) {
      return NextResponse.json({ available: false }, { status: 400 });
    }

    const validation = usernameSchema.safeParse(username);
    if (!validation.success) {
      return NextResponse.json({ available: false });
    }

    // Check if username exists - use maybeSingle() to avoid error when not found
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    // If error exists and it's not a "not found" error, username is not available
    if (error && error.code !== 'PGRST116') {
      console.error('Username check error:', error);
      return NextResponse.json({ available: false });
    }

    // If data exists, username is taken. If data is null, username is available
    return NextResponse.json({ available: !data });
  } catch (error) {
    console.error('Username check exception:', error);
    return NextResponse.json({ available: false });
  }
}

