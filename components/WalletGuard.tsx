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
    if (!user || !token) {
      router.push('/auth/wallet');
      return;
    }

    // A wallet may be connected via MetaMask extension OR WalletConnect (mobile),
    // so don't hard-require `window.ethereum` here. Token presence is the gate.
    setChecking(false);
  }, [user, token, router]);

  if (checking || !user || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="glass-card rounded-3xl p-8">
            <Wallet className="w-16 h-16 text-emerald-600 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-700 dark:text-gray-300 font-medium">Checking session...</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
