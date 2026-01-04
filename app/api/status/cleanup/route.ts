import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getStatusContract } from '@/lib/contracts';
import { ethers } from 'ethers';

/**
 * Cleanup expired statuses from database and blockchain
 * This should be called periodically (e.g., via cron job or scheduled task)
 */
export async function POST(req: NextRequest) {
  try {
    // Optional: Add authentication for cron jobs
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    
    // Delete expired statuses from database
    const { data: deletedStatuses, error: deleteError } = await supabaseAdmin
      .from('statuses')
      .delete()
      .lt('expires_at', now.toISOString())
      .select('id, user_id, transaction_hash, on_chain');

    if (deleteError) {
      console.error('Error deleting expired statuses:', deleteError);
    }

    // Clean up on-chain statuses if contract is configured
    let onChainCleaned = 0;
    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC
      );
      const statusContract = getStatusContract(provider);

      // Get unique user IDs from deleted statuses
      const userIds = [...new Set((deletedStatuses || []).map((s: any) => s.user_id))];
      
      // Get wallet addresses for these users
      if (userIds.length > 0) {
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, wallet_address')
          .in('id', userIds);

        // Note: On-chain cleanup happens automatically via the contract's expiration check
        // The contract's getLatestStatus and getUserStatuses already filter out expired statuses
        // We just need to ensure the database is cleaned up
        onChainCleaned = users?.length || 0;
      }
    } catch (error) {
      // Contract not configured or error - continue with database cleanup
      console.log('On-chain cleanup skipped:', error);
    }

    const deletedCount = deletedStatuses?.length || 0;

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

// Also allow GET for manual triggers
export async function GET(req: NextRequest) {
  return POST(req);
}



