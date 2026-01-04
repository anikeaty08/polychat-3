import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { messageIds } = await req.json();

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: 'Message IDs are required' },
        { status: 400 }
      );
    }

    // Verify user owns all messages
    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('id, sender_id')
      .in('id', messageIds);

    const unauthorizedMessages = messages?.filter((msg) => msg.sender_id !== payload.userId);
    if (unauthorizedMessages && unauthorizedMessages.length > 0) {
      return NextResponse.json(
        { error: 'You can only delete your own messages' },
        { status: 403 }
      );
    }

    // Delete messages
    const { error: deleteError } = await supabaseAdmin
      .from('messages')
      .delete()
      .in('id', messageIds);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true, deletedCount: messageIds.length });
  } catch (error: any) {
    console.error('Delete messages error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete messages' },
      { status: 500 }
    );
  }
}



