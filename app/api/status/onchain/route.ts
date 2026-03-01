import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { Status, User } from '@/lib/models';
import { ethers } from 'ethers';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { text, image_ipfs_hash, transaction_hash } = await req.json();

    if (!transaction_hash) {
      return NextResponse.json(
        { error: 'Transaction hash is required' },
        { status: 400 }
      );
    }

    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC
    );

    try {
      const tx = await provider.getTransaction(transaction_hash);
      if (!tx) {
        return NextResponse.json(
          { error: 'Transaction not found' },
          { status: 400 }
        );
      }

      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) {
        return NextResponse.json(
          { error: 'Transaction failed' },
          { status: 400 }
        );
      }

      await connectDB();

      const user = await User.findById(payload.userId).select('wallet_address');
      if (
        !user ||
        user.wallet_address.toLowerCase() !== tx.from?.toLowerCase()
      ) {
        return NextResponse.json(
          { error: 'Wallet address mismatch' },
          { status: 403 }
        );
      }

      const imageUrl = image_ipfs_hash
        ? `https://gateway.pinata.cloud/ipfs/${image_ipfs_hash}`
        : null;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const status = await Status.create({
        user_id: payload.userId,
        text: text || null,
        image_url: imageUrl,
        transaction_hash: transaction_hash,
        on_chain: true,
        expires_at: expiresAt,
      });

      const s = toApi(status)!;
      return NextResponse.json({ status: s });
    } catch (error: any) {
      console.error('On-chain status error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to process on-chain status' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('On-chain status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process on-chain status' },
      { status: 500 }
    );
  }
}
