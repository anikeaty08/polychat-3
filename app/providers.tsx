'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initTheme } from '@/lib/theme';
import GlobalCallHandler from '@/components/GlobalCallHandler';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const { token, setUser, setToken } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    initTheme();
    
    // Verify token on mount
    if (token) {
      verifyToken();
    }
  }, []);

  // Track online status
  useEffect(() => {
    if (!token) return;

    // Set user as online on mount
    fetch('/api/users/online', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isOnline: true }),
    }).catch(console.error);

    // Update online status periodically
    const interval = setInterval(() => {
      fetch('/api/users/online', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isOnline: true }),
      }).catch(console.error);
    }, 30000); // Every 30 seconds

    // Set offline on page unload
    const handleBeforeUnload = () => {
      fetch('/api/users/online', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isOnline: false }),
      }).catch(console.error);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Set offline on unmount
      fetch('/api/users/online', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isOnline: false }),
      }).catch(console.error);
    };
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch('/api/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const { user } = await response.json();
        setUser(user);
      } else {
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      setToken(null);
      setUser(null);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/90 text-lg">Loading PolyChat...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {children}
      <GlobalCallHandler />
    </ErrorBoundary>
  );
}

