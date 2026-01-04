import { NextRequest, NextResponse } from 'next/server';
import { generateChallenge, verifyWalletSignature, getOrCreateUser, generateToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const message = generateChallenge(address);
    return NextResponse.json({ message });
  } catch (error: any) {
    console.error('Generate challenge error:', error);
    return NextResponse.json(
      { error: 'Failed to generate challenge' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { address, signature, message } = await req.json();

    if (!address || !signature || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify signature
    const isValid = await verifyWalletSignature(address, message, signature);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Get or create user
    const user = await getOrCreateUser(address);

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      walletAddress: user.wallet_address,
    });

    // Check if user has profile
    const hasProfile = !!(user.username && user.display_name);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        username: user.username,
        displayName: user.display_name,
        profilePicture: user.profile_picture,
        status: user.status,
        hasProfile,
      },
    });
  } catch (error: any) {
    console.error('Wallet auth error:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}
