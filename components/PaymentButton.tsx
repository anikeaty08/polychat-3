'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PaymentButtonProps {
  amount: string; // in MATIC/ETH
  metadata?: string;
  recipientAddress?: string;
  tokenSymbol?: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
}

export default function PaymentButton({
  amount,
  metadata = '',
  recipientAddress,
  tokenSymbol,
  onSuccess,
  onError,
}: PaymentButtonProps) {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!user || !token) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('amount', amount);
      if (recipientAddress) params.set('to', recipientAddress);
      if (tokenSymbol) params.set('token', tokenSymbol);
      if (metadata) params.set('metadata', metadata);

      router.push(`/payments?${params.toString()}`);
      toast.success('Open payments to complete the transfer');
      onSuccess?.('redirect');
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error('Unable to open payments');
      onError?.(error.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading || !user}
      className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Wallet className="w-4 h-4" />
      <span>{loading ? 'Opening...' : `Pay ${amount}`}</span>
    </button>
  );
}

