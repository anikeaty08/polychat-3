import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { Payment } from '@/lib/models';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const {
      transactionHash,
      amount,
      recipientAddress,
      paymentPlatform,
    } = await req.json();

    if (!transactionHash || !amount || !recipientAddress) {
      return NextResponse.json(
        {
          error:
            'Transaction hash, amount, and recipient address are required',
        },
        { status: 400 }
      );
    }

    await connectDB();

    const payment = await Payment.create({
      user_id: payload.userId,
      transaction_hash: transactionHash,
      amount: amount.toString(),
      status: 'confirmed',
      recipient_address: recipientAddress,
      payment_platform: paymentPlatform || 'metamask',
    });

    const p = toApi(payment)!;
    return NextResponse.json({
      success: true,
      payment: {
        id: p.id,
        transactionHash,
        amount: amount.toString(),
        status: 'confirmed',
      },
    });
  } catch (error: any) {
    console.error('Record payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record payment' },
      { status: 500 }
    );
  }
}
