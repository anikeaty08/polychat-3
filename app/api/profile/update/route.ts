import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { uploadToPinata } from '@/lib/pinata';
import { displayNameSchema, statusSchema } from '@/lib/validators';

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

    // Validate inputs (only if provided and not empty)
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

    let profilePictureUrl = null;
    if (profilePicture) {
      try {
        const ipfsHash = await uploadToPinata(profilePicture, `profile-${payload.userId}`);
        profilePictureUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      } catch (error) {
        console.error('Failed to upload profile picture:', error);
        // Continue without picture if upload fails
      }
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Update display name (allow empty string to clear it)
    if (displayName !== null && displayName !== undefined) {
      updateData.display_name = displayName.trim() || null;
    }

    // Update status (allow empty string to clear it)
    if (status !== null && status !== undefined) {
      updateData.status = status.trim() || null;
    }

    // Update profile picture if new one was uploaded
    if (profilePictureUrl) {
      updateData.profile_picture = profilePictureUrl;
    }

    // Update user profile
    const { data: user, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', payload.userId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
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
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}

