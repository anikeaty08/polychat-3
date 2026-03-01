import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { Status } from '@/lib/models';
import { createStatusOnChain } from '@/lib/server-wallet';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { text, image_ipfs_hash } = await req.json();

    if (!text && !image_ipfs_hash) {
      return NextResponse.json(
        { error: 'Text or image is required' },
        { status: 400 }
      );
    }

    if (!process.env.SERVER_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Server wallet not configured' },
        { status: 500 }
      );
    }

    const { hash: transactionHash } = await createStatusOnChain(
      text || '',
      image_ipfs_hash || ''
    );

    const imageUrl = image_ipfs_hash
      ? `https://gateway.pinata.cloud/ipfs/${image_ipfs_hash}`
      : null;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await connectDB();

    await Status.deleteMany({
      user_id: payload.userId,
      expires_at: { $lt: new Date() },
    });

    const status = await Status.create({
      user_id: payload.userId,
      text: text || null,
      image_url: imageUrl,
      transaction_hash: transactionHash,
      on_chain: true,
      expires_at: expiresAt,
    });

    const s = toApi(status)!;
    return NextResponse.json({ status: s });
  } catch (error: any) {
    console.error('Server create status error:', error);
    const errorMessage = error.message?.includes('Failed to process')
      ? 'Failed to create status. Please try again.'
      : error.message?.includes('not configured')
      ? 'Service temporarily unavailable'
      : 'Failed to create status. Please try again.';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
