'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { Wallet } from 'lucide-react';

interface PaymentButtonProps {
  amount: string; // in MATIC/ETH
  metadata?: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
}

export default function PaymentButton({
  amount,
  metadata = '',
  onSuccess,
  onError,
}: PaymentButtonProps) {
  const { user, token } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!user || !token) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);
      toast.loading('Processing payment...', { id: 'payment' });

      // Server handles payment creation and verification
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, metadata }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Payment successful!', { id: 'payment' });
        onSuccess?.(data.payment.paymentId);
      } else {
        toast.error(data.error || 'Payment failed', { id: 'payment' });
        onError?.(data.error || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.', { id: 'payment' });
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
      <span>{loading ? 'Processing...' : `Pay ${amount} MATIC`}</span>
    </button>
  );
}

