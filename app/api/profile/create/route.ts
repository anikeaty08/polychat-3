import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { User } from '@/lib/models';
import { uploadToPinata } from '@/lib/pinata';
import { createProfileSchema } from '@/lib/validators';

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

    const username = formData.get('username') as string;
    const displayName = formData.get('displayName') as string;
    const status = formData.get('status') as string;
    const profilePicture = formData.get('profilePicture') as File | null;

    const validation = createProfileSchema.safeParse({ username, displayName, status });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues?.[0]?.message || 'Invalid input data' },
        { status: 400 }
      );
    }

    await connectDB();

    const normalizedUsername = validation.data.username.toLowerCase();

    const existingUser = await User.findOne({ username: normalizedUsername });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 400 }
      );
    }

    let profilePictureUrl = null;
    if (profilePicture) {
      try {
        const ipfsHash = await uploadToPinata(profilePicture, `profile-${payload.userId}`);
        profilePictureUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      } catch (error) {
        console.error('Failed to upload profile picture:', error);
      }
    }

    const user = await User.findByIdAndUpdate(
      payload.userId,
      {
        username: normalizedUsername,
        display_name: displayName || null,
        status: status || null,
        profile_picture: profilePictureUrl,
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to create profile' },
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
    console.error('Profile creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create profile' },
      { status: 500 }
    );
  }
}
