import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
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

    // Check if SERVER_PRIVATE_KEY is configured
    if (!process.env.SERVER_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Server wallet not configured' },
        { status: 500 }
      );
    }

    // Create status on-chain using server wallet
    const { hash: transactionHash } = await createStatusOnChain(
      text || '',
      image_ipfs_hash || ''
    );

    // Record status in database
    const imageUrl = image_ipfs_hash ? `https://gateway.pinata.cloud/ipfs/${image_ipfs_hash}` : null;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Delete expired statuses for this user
    const now = new Date();
    await supabaseAdmin
      .from('statuses')
      .delete()
      .eq('user_id', payload.userId)
      .lt('expires_at', now.toISOString());

    const { data: status, error: statusError } = await supabaseAdmin
      .from('statuses')
      .insert({
        user_id: payload.userId,
        text: text || null,
        image_url: imageUrl,
        transaction_hash: transactionHash,
        on_chain: true,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (statusError) {
      throw statusError;
    }

    return NextResponse.json({ status });
  } catch (error: any) {
    console.error('Server create status error:', error);
    // Return user-friendly error message
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

