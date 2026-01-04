'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Wallet } from 'lucide-react';

interface WalletGuardProps {
  children: React.ReactNode;
}

export default function WalletGuard({ children }: WalletGuardProps) {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    if (!user || !token) {
      router.push('/auth/wallet');
      return;
    }

    // Check if wallet is connected
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length === 0) {
            // No wallet connected
            router.push('/auth/wallet');
            return;
          }
          // Wallet is connected
          setChecking(false);
        })
        .catch(() => {
          router.push('/auth/wallet');
        });
    } else {
      // No wallet extension found
      router.push('/auth/wallet');
    }
  }, [user, token, router]);

  if (checking || !user || !token) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-400">Checking wallet connection...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}



