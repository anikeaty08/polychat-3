import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, toApi } from '@/lib/db';
import {
  ConversationParticipant,
  Contact,
  Status,
  User,
} from '@/lib/models';
import { getStatusContract } from '@/lib/contracts';
import { ethers } from 'ethers';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    await connectDB();

    const participants = await ConversationParticipant.find({
      user_id: payload.userId,
    }).distinct('conversation_id');

    let chatUserIds: string[] = [];
    if (participants.length > 0) {
      const allParticipants = await ConversationParticipant.find({
        conversation_id: { $in: participants },
        user_id: { $ne: payload.userId },
      }).distinct('user_id');
      chatUserIds = allParticipants.map(String);
    }

    const contacts = await Contact.find({ user_id: payload.userId }).distinct(
      'contact_id'
    );
    const contactIds = contacts.map(String);
    const allUserIds = [
      ...new Set([...chatUserIds, ...contactIds, payload.userId]),
    ];

    const now = new Date();

    const statuses = await Status.find({
      user_id: { $in: allUserIds.length > 0 ? allUserIds : [payload.userId] },
      expires_at: { $gte: now },
    })
      .populate('user_id', 'username display_name profile_picture wallet_address')
      .sort({ createdAt: -1 })
      .lean();

    let statusList = statuses.map((s: any) => ({
      ...s,
      id: String(s._id),
      user: s.user_id
        ? {
            id: String(s.user_id._id),
            username: s.user_id.username,
            display_name: s.user_id.display_name,
            profile_picture: s.user_id.profile_picture,
            wallet_address: s.user_id.wallet_address,
          }
        : null,
    }));

    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC
      );
      const statusContract = getStatusContract(provider);

      const currentUser = await User.findById(payload.userId).select(
        'wallet_address'
      );

      if (currentUser?.wallet_address) {
        const onChainStatus = await statusContract.getLatestStatus(
          currentUser.wallet_address
        );
        if (onChainStatus.exists) {
          // Merge logic if needed
        }
      }

      if (contactIds.length > 0) {
        const contactUsers = await User.find({
          _id: { $in: contactIds },
        }).select('username display_name profile_picture wallet_address');

        const currentTimestamp = Math.floor(Date.now() / 1000);

        for (const contact of contactUsers) {
          if (contact.wallet_address) {
            try {
              const onChainStatus = await statusContract.getLatestStatus(
                contact.wallet_address
              );
              if (onChainStatus.exists) {
                const expiresAt = Number(onChainStatus.expiresAt);
                if (expiresAt <= currentTimestamp) continue;

                const exists = statusList.some(
                  (s: any) =>
                    String(s.user_id) === String(contact._id) &&
                    s.on_chain &&
                    s.transaction_hash
                );

                if (!exists) {
                  statusList.push({
                    id: `onchain-${contact._id}`,
                    user_id: String(contact._id),
                    text: onChainStatus.text,
                    image_url: onChainStatus.imageIpfsHash
                      ? `https://gateway.pinata.cloud/ipfs/${onChainStatus.imageIpfsHash}`
                      : null,
                    on_chain: true,
                    created_at: new Date(
                      Number(onChainStatus.timestamp) * 1000
                    ).toISOString(),
                    expires_at: new Date(expiresAt * 1000).toISOString(),
                    user: {
                      id: String(contact._id),
                      username: contact.username,
                      display_name: contact.display_name,
                      profile_picture: contact.profile_picture,
                    },
                  });
                }
              }
            } catch (error) {
              console.log('On-chain status fetch error:', error);
            }
          }
        }
      }
    } catch (error) {
      console.log('On-chain statuses not available, using database only');
    }

    const myStatus = await Status.findOne({
      user_id: payload.userId,
      expires_at: { $gte: now },
    })
      .populate('user_id', 'username display_name profile_picture wallet_address')
      .sort({ createdAt: -1 })
      .lean();

    const myStatusFormatted = myStatus
      ? {
          ...myStatus,
          id: String(myStatus._id),
          user: (myStatus as any).user_id
            ? {
                id: String((myStatus as any).user_id._id),
                username: (myStatus as any).user_id.username,
                display_name: (myStatus as any).user_id.display_name,
                profile_picture: (myStatus as any).user_id.profile_picture,
                wallet_address: (myStatus as any).user_id.wallet_address,
              }
            : null,
        }
      : null;

    return NextResponse.json({
      statuses: statusList.filter((s: any) => String(s.user_id) !== payload.userId),
      myStatus: myStatusFormatted,
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

    await connectDB();

    const now = new Date();
    await Status.deleteMany({
      user_id: payload.userId,
      expires_at: { $lt: now },
    });

    const status = await Status.create({
      user_id: payload.userId,
      text: text || null,
      image_url: image_url || null,
    });

    const s = toApi(status)!;
    return NextResponse.json({ status: s });
  } catch (error: any) {
    console.error('Create status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create status' },
      { status: 500 }
    );
  }
}
