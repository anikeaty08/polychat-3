import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { uploadEncryptedMessage } from '@/lib/pinata';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { conversationId, content, messageType = 'text', replyToId } = await req.json();

    if (!conversationId || !content) {
      return NextResponse.json(
        { error: 'Conversation ID and content are required' },
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

    // Upload encrypted message to IPFS
    let ipfsHash = null;
    try {
      ipfsHash = await uploadEncryptedMessage(content, {
        conversationId,
        senderId: payload.userId,
        messageType,
      });
    } catch (error) {
      console.error('Failed to upload to IPFS:', error);
      // Continue without IPFS hash for now
    }

    // Create message
    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: payload.userId,
        content,
        message_type: messageType,
        ipfs_hash: ipfsHash,
        reply_to_id: replyToId || null,
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
      }
    });
  } catch (error: any) {
    console.error('Create message error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}

