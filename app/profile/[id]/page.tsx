'use client';

import UserProfile from '@/components/UserProfile';
import WalletGuard from '@/components/WalletGuard';

export default function UserProfilePage({ params }: { params: { id: string } }) {
  return (
    <WalletGuard>
      <UserProfile userId={params.id} isOwn={false} />
    </WalletGuard>
  );
}

