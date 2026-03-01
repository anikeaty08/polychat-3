import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import { PrivacySettings } from '@/lib/models';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    await connectDB();

    const privacySettings = await PrivacySettings.findOne({ user_id: payload.userId });

    if (!privacySettings) {
      return NextResponse.json({
        privacySettings: {
          profile_visibility: 'everyone',
          photo_visibility: 'everyone',
          status_visibility: 'everyone',
          last_seen_visibility: 'everyone',
          online_status_visibility: 'everyone',
          message_permissions: 'everyone',
          read_receipts_enabled: true,
          typing_indicators_enabled: true,
        },
      });
    }

    const p = toApi(privacySettings)!;
    return NextResponse.json({ privacySettings: p });
  } catch (error: any) {
    console.error('Get privacy settings error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load privacy settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const body = await req.json();

    const updateData: Record<string, unknown> = {};

    if (body.hideOnlineStatus !== undefined) {
      updateData.online_status_visibility = body.hideOnlineStatus ? 'nobody' : 'everyone';
    }
    if (body.hideLastSeen !== undefined) {
      updateData.last_seen_visibility = body.hideLastSeen ? 'nobody' : 'everyone';
    }
    if (body.hideProfilePhoto !== undefined) {
      updateData.photo_visibility = body.hideProfilePhoto ? 'nobody' : 'everyone';
    }
    if (body.readReceipts !== undefined) {
      updateData.read_receipts_enabled = body.readReceipts;
    }
    if (body.typingIndicators !== undefined) {
      updateData.typing_indicators_enabled = body.typingIndicators;
    }
    if (body.incognitoMode !== undefined) {
      updateData.incognito_mode = body.incognitoMode;
    }
    if (body.blockScreenshots !== undefined) {
      updateData.block_screenshots = body.blockScreenshots;
    }
    if (body.twoFactorEnabled !== undefined) {
      updateData.two_factor_enabled = body.twoFactorEnabled;
    }
    if (body.screenLock !== undefined) {
      updateData.screen_lock_enabled = body.screenLock;
    }
    if (body.autoDeleteMessages !== undefined) {
      updateData.auto_delete_messages = body.autoDeleteMessages;
    }
    if (body.autoDeleteDuration !== undefined) {
      updateData.auto_delete_duration = body.autoDeleteDuration;
    }
    if (body.hideIP !== undefined) {
      updateData.hide_ip_address = body.hideIP;
    }
    if (body.encryptedBackup !== undefined) {
      updateData.encrypted_backup = body.encryptedBackup;
    }

    await connectDB();

    const existing = await PrivacySettings.findOne({ user_id: payload.userId });

    let result;
    if (existing) {
      result = await PrivacySettings.findOneAndUpdate(
        { user_id: payload.userId },
        updateData,
        { new: true }
      );
    } else {
      result = await PrivacySettings.create({
        user_id: payload.userId,
        ...updateData,
      });
    }

    const p = toApi(result)!;
    return NextResponse.json({ privacySettings: p });
  } catch (error: any) {
    console.error('Update privacy settings error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update privacy settings' },
      { status: 500 }
    );
  }
}
