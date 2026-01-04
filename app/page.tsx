'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import SplashScreen from '@/components/SplashScreen';

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

  return <SplashScreen />;
}



