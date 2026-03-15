import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models';
import { usernameSchema } from '@/lib/validators';

export async function GET(req: NextRequest) {
  try {
    const username = req.nextUrl.searchParams.get('username');

    if (!username) {
      return NextResponse.json({ available: false, reason: 'Username is required' }, { status: 400 });
    }

    const validation = usernameSchema.safeParse(username);
    if (!validation.success) {
      return NextResponse.json({ available: false, reason: validation.error.issues?.[0]?.message || 'Invalid username' });
    }

    await connectDB();

    const existing = await User.findOne({ username: validation.data.toLowerCase() });

    return NextResponse.json({ available: !existing });
  } catch (error) {
    console.error('Username check exception:', error);
    return NextResponse.json({ available: false });
  }
}
