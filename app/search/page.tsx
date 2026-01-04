'use client';

import SearchUsers from '@/components/SearchUsers';
import WalletGuard from '@/components/WalletGuard';

export default function SearchPage() {
  return (
    <WalletGuard>
      <SearchUsers />
    </WalletGuard>
  );
}

