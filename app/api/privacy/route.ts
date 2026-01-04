import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// GET privacy settings
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);

    const { data: privacySettings, error } = await supabaseAdmin
      .from('privacy_settings')
      .select('*')
      .eq('user_id', payload.userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Return default settings if none exist
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

    return NextResponse.json({ privacySettings });
  } catch (error: any) {
    console.error('Get privacy settings error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load privacy settings' },
      { status: 500 }
    );
  }
}

// UPDATE privacy settings
export async function PATCH(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const body = await req.json();

    // Map frontend settings to database fields
    const updateData: any = {};

    // Map hideOnlineStatus to online_status_visibility
    if (body.hideOnlineStatus !== undefined) {
      updateData.online_status_visibility = body.hideOnlineStatus ? 'nobody' : 'everyone';
    }

    // Map hideLastSeen to last_seen_visibility
    if (body.hideLastSeen !== undefined) {
      updateData.last_seen_visibility = body.hideLastSeen ? 'nobody' : 'everyone';
    }

    // Map hideProfilePhoto to photo_visibility
    // If hideProfilePhoto is true, set to 'nobody' (hide from everyone)
    // If hideProfilePhoto is false, set to 'everyone' (show to everyone)
    if (body.hideProfilePhoto !== undefined) {
      updateData.photo_visibility = body.hideProfilePhoto ? 'nobody' : 'everyone';
    }

    // Map readReceipts
    if (body.readReceipts !== undefined) {
      updateData.read_receipts_enabled = body.readReceipts;
    }

    // Map typingIndicators
    if (body.typingIndicators !== undefined) {
      updateData.typing_indicators_enabled = body.typingIndicators;
    }

    // Map incognitoMode
    if (body.incognitoMode !== undefined) {
      updateData.incognito_mode = body.incognitoMode;
    }

    // Map blockScreenshots
    if (body.blockScreenshots !== undefined) {
      updateData.block_screenshots = body.blockScreenshots;
    }

    // Map twoFactorEnabled
    if (body.twoFactorEnabled !== undefined) {
      updateData.two_factor_enabled = body.twoFactorEnabled;
    }

    // Map screenLock
    if (body.screenLock !== undefined) {
      updateData.screen_lock_enabled = body.screenLock;
    }

    // Map autoDeleteMessages and autoDeleteDuration
    if (body.autoDeleteMessages !== undefined) {
      updateData.auto_delete_messages = body.autoDeleteMessages;
    }
    if (body.autoDeleteDuration !== undefined) {
      updateData.auto_delete_duration = body.autoDeleteDuration;
    }

    // Map hideIP
    if (body.hideIP !== undefined) {
      updateData.hide_ip_address = body.hideIP;
    }

    // Map encryptedBackup
    if (body.encryptedBackup !== undefined) {
      updateData.encrypted_backup = body.encryptedBackup;
    }

    // Check if privacy settings exist
    const { data: existing } = await supabaseAdmin
      .from('privacy_settings')
      .select('id')
      .eq('user_id', payload.userId)
      .maybeSingle();

    let result;
    if (existing) {
      // Update existing
      result = await supabaseAdmin
        .from('privacy_settings')
        .update(updateData)
        .eq('user_id', payload.userId)
        .select()
        .single();
    } else {
      // Create new
      result = await supabaseAdmin
        .from('privacy_settings')
        .insert({
          user_id: payload.userId,
          ...updateData,
        })
        .select()
        .single();
    }

    if (result.error) {
      throw result.error;
    }

    return NextResponse.json({ privacySettings: result.data });
  } catch (error: any) {
    console.error('Update privacy settings error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update privacy settings' },
      { status: 500 }
    );
  }
}

