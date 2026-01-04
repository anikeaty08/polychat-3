import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { ethers } from 'ethers';
import { getPaymentEscrowContract } from '@/lib/contracts';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { paymentId } = await req.json();

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // Get provider
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC
    );

    // Get payment from contract
    const contract = getPaymentEscrowContract(provider);
    const payment = await contract.getPayment(paymentId);

    // Verify payment belongs to user
    if (payment.payer.toLowerCase() !== payload.walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Payment does not belong to user' },
        { status: 403 }
      );
    }

    // Verify payment on-chain (server-side)
    if (!payment.verified) {
      // Server verifies the payment
      const serverWallet = new ethers.Wallet(
        process.env.SERVER_PRIVATE_KEY!,
        provider
      );
      const serverContract = getPaymentEscrowContract(serverWallet);
      
      try {
        const tx = await serverContract.verifyPayment(paymentId);
        await tx.wait();
      } catch (error) {
        console.error('Verification transaction failed:', error);
      }
    }

    return NextResponse.json({
      success: true,
      payment: {
        payer: payment.payer,
        amount: payment.amount.toString(),
        timestamp: payment.timestamp.toString(),
        verified: payment.verified,
        metadata: payment.metadata,
      },
    });
  } catch (error: any) {
    console.error('Verify payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    );
  }
}



