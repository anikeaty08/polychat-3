import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { ethers } from 'ethers';
import { getPaymentEscrowContract } from '@/lib/contracts';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    const { amount, metadata = '' } = await req.json();

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Server creates the payment on behalf of user
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC
    );

    if (!process.env.SERVER_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Server wallet not configured' },
        { status: 500 }
      );
    }

    const serverWallet = new ethers.Wallet(
      process.env.SERVER_PRIVATE_KEY,
      provider
    );

    const contract = getPaymentEscrowContract(serverWallet);

    // Generate payment ID
    const paymentId = ethers.id(
      `${Date.now()}-${payload.userId}-${Math.random()}`
    );

    // Convert amount to wei
    const amountWei = ethers.parseEther(amount.toString());

    // Create payment transaction (server pays, but records user as payer)
    const tx = await contract.createPayment(paymentId, metadata, {
      value: amountWei,
    });

    // Wait for confirmation
    const receipt = await tx.wait();

    // Record payment in database
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: payload.userId,
        transaction_hash: receipt.hash,
        amount: amountWei.toString(),
        status: 'pending',
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment record error:', paymentError);
    }

    // Verify payment immediately
    try {
      const verifyTx = await contract.verifyPayment(paymentId);
      await verifyTx.wait();

      // Update payment status
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'confirmed',
          verified_at: new Date().toISOString(),
        })
        .eq('id', payment?.id);
    } catch (verifyError) {
      console.error('Verification error:', verifyError);
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: payment?.id,
        paymentId: paymentId,
        transactionHash: receipt.hash,
        amount: amountWei.toString(),
        status: 'confirmed',
      },
    });
  } catch (error: any) {
    console.error('Create payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment' },
      { status: 500 }
    );
  }
}



