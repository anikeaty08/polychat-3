import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { Payment } from '@/lib/models';
import { ethers } from 'ethers';
import { verifyErc20Transfer, verifyTransaction } from '@/lib/polygon';

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
      tokenAddress,
      tokenSymbol,
      chainId,
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

    if (!ethers.isAddress(recipientAddress)) {
      return NextResponse.json({ error: 'Invalid recipient address' }, { status: 400 });
    }

    const expectedChainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '80002');
    if (chainId && Number(chainId) !== expectedChainId) {
      return NextResponse.json({ error: 'Unsupported network' }, { status: 400 });
    }

    await connectDB();

    const payment = await Payment.create({
      user_id: payload.userId,
      transaction_hash: transactionHash,
      amount: amount.toString(),
      status: 'pending',
      recipient_address: recipientAddress,
      payment_platform: paymentPlatform || 'metamask',
      from_address: payload.walletAddress,
      chain_id: expectedChainId,
      token_address: tokenAddress || null,
      token_symbol: tokenSymbol || (tokenAddress ? 'ERC20' : (process.env.NEXT_PUBLIC_NATIVE_SYMBOL || 'MATIC')),
    });

    let isValid = false;
    try {
      if (tokenAddress) {
        if (!ethers.isAddress(tokenAddress)) {
          return NextResponse.json({ error: 'Invalid token address' }, { status: 400 });
        }
        isValid = await verifyErc20Transfer(
          transactionHash,
          tokenAddress,
          payload.walletAddress,
          recipientAddress,
          BigInt(amount.toString())
        );
      } else {
        isValid = await verifyTransaction(
          transactionHash,
          payload.walletAddress,
          recipientAddress,
          BigInt(amount.toString())
        );
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      isValid = false;
    }

    await Payment.findByIdAndUpdate(payment._id, {
      status: isValid ? 'confirmed' : 'failed',
      verified_at: isValid ? new Date() : null,
    });

    const p = toApi(payment)!;
    return NextResponse.json({
      success: true,
      payment: {
        id: p.id,
        transactionHash,
        amount: amount.toString(),
        status: isValid ? 'confirmed' : 'failed',
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
