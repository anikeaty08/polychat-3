import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Status, User } from '@/lib/models';
import { getStatusContract } from '@/lib/contracts';
import { ethers } from 'ethers';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    await connectDB();

    const deletedStatuses = await Status.find({
      expires_at: { $lt: now },
    }).select('user_id transaction_hash on_chain');

    await Status.deleteMany({ expires_at: { $lt: now } });

    let onChainCleaned = 0;
    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC
      );
      getStatusContract(provider);

      const userIds = [...new Set(deletedStatuses.map((s: any) => String(s.user_id)))];
      if (userIds.length > 0) {
        const users = await User.find({ _id: { $in: userIds } }).select(
          'wallet_address'
        );
        onChainCleaned = users?.length || 0;
      }
    } catch (error) {
      console.log('On-chain cleanup skipped:', error);
    }

    const deletedCount = deletedStatuses.length;

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      onChainCleaned,
      message: `Cleaned up ${deletedCount} expired status(es)`,
    });
  } catch (error: any) {
    console.error('Status cleanup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cleanup statuses' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
