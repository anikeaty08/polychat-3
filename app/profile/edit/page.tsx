'use client';

import EditProfile from '@/components/EditProfile';
import WalletGuard from '@/components/WalletGuard';

export default function EditProfilePage() {
  return (
    <WalletGuard>
      <EditProfile />
    </WalletGuard>
  );
}

