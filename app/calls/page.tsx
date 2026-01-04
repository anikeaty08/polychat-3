'use client';

import CallsPage from '@/components/CallsPage';
import WalletGuard from '@/components/WalletGuard';

export default function Calls() {
  return (
    <WalletGuard>
      <CallsPage />
    </WalletGuard>
  );
}

