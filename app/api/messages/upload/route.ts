import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { uploadToPinata, getIPFSUrl } from '@/lib/pinata';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const formData = await req.formData();

    const conversationId = formData.get('conversationId') as string;
    const file = formData.get('file') as File;
    const messageType = formData.get('messageType') as string || 'file';

    if (!conversationId || !file) {
      return NextResponse.json(
        { error: 'Conversation ID and file are required' },
        { status: 400 }
      );
    }

    // Verify user is participant
    const { data: participant } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', payload.userId)
      .single();

    if (!participant) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Upload file to Pinata
    let ipfsHash = null;
    let fileUrl = null;
    try {
      ipfsHash = await uploadToPinata(file, file.name);
      fileUrl = getIPFSUrl(ipfsHash);
    } catch (error) {
      console.error('Failed to upload file to IPFS:', error);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Create message with file URL
    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: payload.userId,
        content: fileUrl, // Store IPFS URL as content
        message_type: messageType,
        ipfs_hash: ipfsHash,
      })
      .select()
      .single();

    if (messageError) {
      throw messageError;
    }

    // Mark as read by sender immediately
    await supabaseAdmin.from('message_read_receipts').insert({
      message_id: message.id,
      user_id: payload.userId,
    });

    // Update conversation
    await supabaseAdmin
      .from('conversations')
      .update({
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    // Update user's last_seen
    await supabaseAdmin
      .from('users')
      .update({ last_seen: new Date().toISOString(), is_online: true })
      .eq('id', payload.userId);

    return NextResponse.json({ 
      message: {
        ...message,
        is_read: false,
        read_at: null,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
      }
    });
  } catch (error: any) {
    console.error('Upload message error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}



