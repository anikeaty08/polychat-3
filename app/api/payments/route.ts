import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { Payment } from '@/lib/models';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    await connectDB();

    const payments = await Payment.find({ user_id: payload.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const mapped = payments.map((p: any) => ({
      ...p,
      id: String(p._id),
    }));

    return NextResponse.json({ payments: mapped });
  } catch (error: any) {
    console.error('Get payments error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
