import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { uploadToPinata } from '@/lib/pinata';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    verifyToken(token);

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Upload to Pinata
    const ipfsHash = await uploadToPinata(file, file.name);

    const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

    return NextResponse.json({ url, ipfsHash });
  } catch (error: any) {
    console.error('Status upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload status image' },
      { status: 500 }
    );
  }
}

