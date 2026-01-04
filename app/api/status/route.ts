import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getStatusContract } from '@/lib/contracts';
import { ethers } from 'ethers';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);

    // Get users you chat with (from conversations)
    const { data: participants } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', payload.userId);

    const conversationIds = participants?.map((p) => p.conversation_id) || [];

    // Get all participants from these conversations (excluding self)
    let chatUserIds: string[] = [];
    if (conversationIds.length > 0) {
      const { data: allParticipants } = await supabaseAdmin
        .from('conversation_participants')
        .select('user_id')
        .in('conversation_id', conversationIds)
        .neq('user_id', payload.userId);

      chatUserIds = [...new Set(allParticipants?.map((p) => p.user_id) || [])];
    }

    // Also include contacts
    const { data: contacts } = await supabaseAdmin
      .from('contacts')
      .select('contact_id')
      .eq('user_id', payload.userId);

    const contactIds = contacts?.map((c) => c.contact_id) || [];
    const allUserIds = [...new Set([...chatUserIds, ...contactIds, payload.userId])];

    // Get statuses from database (only non-expired)
    const now = new Date();

    const { data: statuses, error } = await supabaseAdmin
      .from('statuses')
      .select(`
        *,
        user:users(id, username, display_name, profile_picture, wallet_address)
      `)
      .in('user_id', allUserIds.length > 0 ? allUserIds : [payload.userId])
      .gte('expires_at', now.toISOString()) // Only get non-expired statuses
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Try to fetch on-chain statuses if contract is configured
    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC
      );
      const statusContract = getStatusContract(provider);

      // Get user's wallet address
      const { data: currentUser } = await supabaseAdmin
        .from('users')
        .select('wallet_address')
        .eq('id', payload.userId)
        .single();

      if (currentUser?.wallet_address) {
        // Get user's on-chain status
        const onChainStatus = await statusContract.getLatestStatus(currentUser.wallet_address);
        if (onChainStatus.exists) {
          // Merge with database status
        }
      }

      // Get contacts' on-chain statuses
      if (contactIds.length > 0) {
        const { data: contactUsers } = await supabaseAdmin
          .from('users')
          .select('id, wallet_address')
          .in('id', contactIds);

        const currentTimestamp = Math.floor(Date.now() / 1000);

        for (const contact of contactUsers || []) {
          if (contact.wallet_address) {
            try {
              const onChainStatus = await statusContract.getLatestStatus(contact.wallet_address);
              if (onChainStatus.exists) {
                // Check if status is expired
                const expiresAt = Number(onChainStatus.expiresAt);
                if (expiresAt <= currentTimestamp) {
                  // Status expired, skip it
                  continue;
                }

                // Check if already in statuses array
                const exists = statuses?.some((s: any) => 
                  s.user_id === contact.id && s.on_chain && s.transaction_hash
                );
                
                if (!exists) {
                  // Add on-chain status to results
                  const { data: contactProfile } = await supabaseAdmin
                    .from('users')
                    .select('id, username, display_name, profile_picture')
                    .eq('id', contact.id)
                    .single();

                  if (contactProfile) {
                    statuses?.push({
                      id: `onchain-${contact.id}`,
                      user_id: contact.id,
                      text: onChainStatus.text,
                      image_url: onChainStatus.imageIpfsHash 
                        ? `https://gateway.pinata.cloud/ipfs/${onChainStatus.imageIpfsHash}` 
                        : null,
                      on_chain: true,
                      created_at: new Date(Number(onChainStatus.timestamp) * 1000).toISOString(),
                      expires_at: new Date(expiresAt * 1000).toISOString(),
                      user: contactProfile,
                    });
                  }
                }
              }
            } catch (error) {
              // Skip if contract not configured or error
              console.log('On-chain status fetch error:', error);
            }
          }
        }
      }
    } catch (error) {
      // Contract not configured, use database only
      console.log('On-chain statuses not available, using database only');
    }

    // Get user's own status (only if not expired)
    const { data: myStatus } = await supabaseAdmin
      .from('statuses')
      .select(`
        *,
        user:users(id, username, display_name, profile_picture, wallet_address)
      `)
      .eq('user_id', payload.userId)
      .gte('expires_at', now.toISOString()) // Only get non-expired status
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      statuses: statuses?.filter((s: any) => s.user_id !== payload.userId) || [],
      myStatus: myStatus || null,
    });
  } catch (error: any) {
    console.error('Get statuses error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load statuses' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { text, image_url } = await req.json();

    if (!text && !image_url) {
      return NextResponse.json(
        { error: 'Text or image is required' },
        { status: 400 }
      );
    }

    // Delete expired statuses for this user
    const now = new Date();
    await supabaseAdmin
      .from('statuses')
      .delete()
      .eq('user_id', payload.userId)
      .lt('expires_at', now.toISOString());

    // Create new status
    const { data: status, error } = await supabaseAdmin
      .from('statuses')
      .insert({
        user_id: payload.userId,
        text: text || null,
        image_url: image_url || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ status });
  } catch (error: any) {
    console.error('Create status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create status' },
      { status: 500 }
    );
  }
}

