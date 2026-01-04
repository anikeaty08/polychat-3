'use client';

import SettingsPage from '@/components/SettingsPage';
import WalletGuard from '@/components/WalletGuard';

export default function Settings() {
  return (
    <WalletGuard>
      <SettingsPage />
    </WalletGuard>
  );
}

