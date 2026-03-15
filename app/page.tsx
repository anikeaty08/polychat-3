'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import SplashScreen from '@/components/SplashScreen';
import OnChainCoreStatus from '@/components/OnChainCoreStatus';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.username) {
        router.push('/chats');
      } else {
        router.push('/profile/setup');
      }
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className="py-4">
      <SplashScreen />
      <div className="px-4 pb-6 flex justify-center">
        <OnChainCoreStatus compact />
      </div>
    </div>
  );
}



