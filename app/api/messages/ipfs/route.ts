import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { uploadEncryptedMessage } from '@/lib/pinata';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { content, conversationId, messageType } = await req.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Upload encrypted message to IPFS
    const ipfsHash = await uploadEncryptedMessage(content, {
      conversationId,
      senderId: payload.userId,
      messageType: messageType || 'text',
    });

    return NextResponse.json({ ipfsHash });
  } catch (error: any) {
    console.error('IPFS upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload to IPFS' },
      { status: 500 }
    );
  }
}



