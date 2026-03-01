import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { Payment } from '@/lib/models';
import { verifyTransaction } from '@/lib/polygon';
import { getPayment } from '@/lib/contracts';
import { ethers } from 'ethers';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { txHash, amount, to, paymentId } = await req.json();

    if (paymentId) {
      try {
        const provider = new ethers.JsonRpcProvider(
          process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC
        );
        const payment = await getPayment(provider, paymentId);

        if (
          payment.payer.toLowerCase() !== payload.walletAddress?.toLowerCase()
        ) {
          return NextResponse.json(
            { error: 'Payment does not belong to user' },
            { status: 403 }
          );
        }

        await connectDB();

        const paymentRecord = await Payment.create({
          user_id: payload.userId,
          transaction_hash: paymentId,
          amount: payment.amount.toString(),
          status: payment.verified ? 'confirmed' : 'pending',
          verified_at: payment.verified ? new Date() : null,
        });

        const p = toApi(paymentRecord)!;
        return NextResponse.json({
          success: true,
          payment: {
            id: p.id,
            transaction_hash: paymentId,
            amount: payment.amount.toString(),
            verified: payment.verified,
          },
        });
      } catch (error: any) {
        console.error('Contract payment verification error:', error);
        return NextResponse.json(
          { error: 'Failed to verify contract payment' },
          { status: 500 }
        );
      }
    }

    if (!txHash) {
      return NextResponse.json(
        { error: 'Transaction hash or payment ID is required' },
        { status: 400 }
      );
    }

    const isValid = await verifyTransaction(
      txHash,
      payload.walletAddress,
      to,
      amount ? BigInt(amount) : undefined
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Transaction verification failed' },
        { status: 400 }
      );
    }

    await connectDB();

    const payment = await Payment.create({
      user_id: payload.userId,
      transaction_hash: txHash,
      amount: amount?.toString() || '0',
      status: 'confirmed',
      verified_at: new Date(),
    });

    const p = toApi(payment)!;
    return NextResponse.json({
      success: true,
      payment: p || { transaction_hash: txHash },
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
