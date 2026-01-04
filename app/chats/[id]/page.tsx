'use client';

import ChatWindow from '@/components/ChatWindow';
import WalletGuard from '@/components/WalletGuard';

export default function ChatPage({ params }: { params: { id: string } }) {
  return (
    <WalletGuard>
      <ChatWindow conversationId={params.id} />
    </WalletGuard>
  );
}

