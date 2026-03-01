import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { User } from '@/lib/models';
import { uploadToPinata } from '@/lib/pinata';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    const formData = await req.formData();

    const displayName = formData.get('displayName') as string;
    const status = formData.get('status') as string;
    const profilePicture = formData.get('profilePicture') as File | null;

    if (displayName !== null && displayName !== undefined && displayName.trim()) {
      if (displayName.length > 50) {
        return NextResponse.json(
          { error: 'Display name must be at most 50 characters' },
          { status: 400 }
        );
      }
    }

    if (status !== null && status !== undefined && status.trim()) {
      if (status.length > 150) {
        return NextResponse.json(
          { error: 'Status must be at most 150 characters' },
          { status: 400 }
        );
      }
    }

    let profilePictureUrl: string | null = null;
    if (profilePicture) {
      try {
        const ipfsHash = await uploadToPinata(profilePicture, `profile-${payload.userId}`);
        profilePictureUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      } catch (error) {
        console.error('Failed to upload profile picture:', error);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (displayName !== null && displayName !== undefined) {
      updateData.display_name = displayName.trim() || null;
    }
    if (status !== null && status !== undefined) {
      updateData.status = status.trim() || null;
    }
    if (profilePictureUrl) {
      updateData.profile_picture = profilePictureUrl;
    }

    await connectDB();

    const user = await User.findByIdAndUpdate(
      payload.userId,
      updateData,
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    const u = toApi(user)!;
    return NextResponse.json({
      success: true,
      user: {
        id: u.id,
        walletAddress: u.wallet_address,
        username: u.username,
        displayName: u.display_name,
        profilePicture: u.profile_picture,
        status: u.status,
      },
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
