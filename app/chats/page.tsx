import ChatList from '@/components/ChatList';
import WalletGuard from '@/components/WalletGuard';

export default function ChatsPage() {
  return (
    <WalletGuard>
      <ChatList />
    </WalletGuard>
  );
}

