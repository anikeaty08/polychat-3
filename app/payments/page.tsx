'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Wallet, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

export default function PaymentsPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [payments, setPayments] = useState<any[]>([]);
  const [amount, setAmount] = useState('0.01');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [paymentPlatform, setPaymentPlatform] = useState<'metamask' | 'walletconnect' | 'privy' | 'magic'>('metamask');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !token) {
      router.push('/auth/wallet');
      return;
    }

    // Check wallet connection
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length === 0) {
            router.push('/auth/wallet');
            return;
          }
          loadPayments();
        })
        .catch(() => {
          router.push('/auth/wallet');
        });
    } else {
      router.push('/auth/wallet');
    }
  }, [user, token]);

  const loadPayments = async () => {
    try {
      const response = await fetch('/api/payments', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error('Failed to load payments:', error);
    }
  };

  const handlePayment = async () => {
    if (!user || !token) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!recipientAddress || !ethers.isAddress(recipientAddress)) {
      toast.error('Please enter a valid wallet address');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      toast.loading('Processing payment...', { id: 'payment' });

      // Get provider based on platform
      let provider: ethers.BrowserProvider | null = null;
      
      if (paymentPlatform === 'metamask') {
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          provider = new ethers.BrowserProvider((window as any).ethereum);
        } else {
          toast.error('MetaMask not found. Please install MetaMask.', { id: 'payment' });
          setLoading(false);
          return;
        }
      } else {
        toast.error(`${paymentPlatform} integration coming soon`, { id: 'payment' });
        setLoading(false);
        return;
      }

      // Request account access
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const senderAddress = await signer.getAddress();

      // Convert amount to wei
      const amountWei = ethers.parseEther(amount);

      // Send transaction
      const tx = await signer.sendTransaction({
        to: recipientAddress,
        value: amountWei,
      });

      toast.loading('Waiting for confirmation...', { id: 'payment' });
      const receipt = await tx.wait();

      if (!receipt) {
        toast.error('Transaction receipt not received', { id: 'payment' });
        setLoading(false);
        return;
      }

      // Record payment in database
      const response = await fetch('/api/payments/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactionHash: receipt.hash,
          amount: amountWei.toString(),
          recipientAddress,
          paymentPlatform,
        }),
      });

      if (response.ok) {
        toast.success('Payment successful!', { id: 'payment' });
        loadPayments();
        setRecipientAddress('');
        setAmount('0.01');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to record payment', { id: 'payment' });
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed. Please try again.', { id: 'payment' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/chats')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Payments</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Payment Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Make a Payment
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recipient Wallet Address
              </label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0x..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount (MATIC)
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Platform
              </label>
              <select
                value={paymentPlatform}
                onChange={(e) => setPaymentPlatform(e.target.value as any)}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="metamask">MetaMask</option>
                <option value="walletconnect">WalletConnect</option>
                <option value="privy">Privy</option>
                <option value="magic">Magic Link</option>
              </select>
            </div>
            <button
              onClick={handlePayment}
              disabled={loading || !user || !recipientAddress || !amount}
              className="w-full flex items-center justify-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wallet className="w-5 h-5" />
              <span>{loading ? 'Processing...' : `Pay ${amount} MATIC`}</span>
            </button>
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Payment History
          </h2>
          {payments.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No payments yet
            </p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {payment.amount ? `${(Number(payment.amount) / 1e18).toFixed(4)} MATIC` : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {payment.status} • {new Date(payment.created_at).toLocaleString()}
                    </p>
                    {payment.transaction_hash && (
                      <a
                        href={`https://amoy.polygonscan.com/tx/${payment.transaction_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        View on PolygonScan
                      </a>
                    )}
                  </div>
                  <Wallet className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

