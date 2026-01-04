import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
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
        { error: 'Invalid input data' },
        { status: 400 }
      );
    }

    // Check if username is available (use maybeSingle to avoid error when not found)
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle();

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

    // Update user profile
    const { data: user, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        username: username.toLowerCase(),
        display_name: displayName || null,
        status: status || null,
        profile_picture: profilePictureUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.userId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        username: user.username,
        displayName: user.display_name,
        profilePicture: user.profile_picture,
        status: user.status,
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

