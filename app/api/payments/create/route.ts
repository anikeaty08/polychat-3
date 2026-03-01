import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { Payment } from '@/lib/models';
import { ethers } from 'ethers';
import { getPaymentEscrowContract } from '@/lib/contracts';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { amount, metadata = '' } = await req.json();

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC
    );

    if (!process.env.SERVER_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Server wallet not configured' },
        { status: 500 }
      );
    }

    const serverWallet = new ethers.Wallet(
      process.env.SERVER_PRIVATE_KEY,
      provider
    );

    const contract = getPaymentEscrowContract(serverWallet);

    const paymentId = ethers.id(
      `${Date.now()}-${payload.userId}-${Math.random()}`
    );

    const amountWei = ethers.parseEther(amount.toString());

    const tx = await contract.createPayment(paymentId, metadata, {
      value: amountWei,
    });

    const receipt = await tx.wait();

    await connectDB();

    const payment = await Payment.create({
      user_id: payload.userId,
      transaction_hash: receipt.hash,
      amount: amountWei.toString(),
      status: 'pending',
    });

    try {
      const verifyTx = await contract.verifyPayment(paymentId);
      await verifyTx.wait();

      await Payment.findByIdAndUpdate(payment._id, {
        status: 'confirmed',
        verified_at: new Date(),
      });
    } catch (verifyError) {
      console.error('Verification error:', verifyError);
    }

    const p = toApi(payment)!;
    return NextResponse.json({
      success: true,
      payment: {
        id: p.id,
        paymentId: paymentId,
        transactionHash: receipt.hash,
        amount: amountWei.toString(),
        status: 'confirmed',
      },
    });
  } catch (error: any) {
    console.error('Create payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment' },
      { status: 500 }
    );
  }
}
