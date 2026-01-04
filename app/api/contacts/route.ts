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
    const { contactId } = await req.json();

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    if (contactId === payload.userId) {
      return NextResponse.json(
        { error: 'Cannot add yourself as a contact' },
        { status: 400 }
      );
    }

    // Check if already a contact
    const { data: existing } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('user_id', payload.userId)
      .eq('contact_id', contactId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'User is already in your contacts' },
        { status: 400 }
      );
    }

    // Add contact
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .insert({
        user_id: payload.userId,
        contact_id: contactId,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, contact: data });
  } catch (error: any) {
    console.error('Add contact error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add contact' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contactId');

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('contacts')
      .delete()
      .eq('user_id', payload.userId)
      .eq('contact_id', contactId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Remove contact error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove contact' },
      { status: 500 }
    );
  }
}



