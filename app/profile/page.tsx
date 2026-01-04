'use client';

import UserProfile from '@/components/UserProfile';
import WalletGuard from '@/components/WalletGuard';

export default function ProfilePage() {
  return (
    <WalletGuard>
      <UserProfile isOwn={true} />
    </WalletGuard>
  );
}

