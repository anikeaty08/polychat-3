'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { ArrowLeft, Shield, UserX } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function BlockedUsers() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !token) {
      router.push('/auth/wallet');
      return;
    }
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    try {
      const response = await fetch('/api/blocked', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setBlockedUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to load blocked users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId: string) => {
    try {
      const response = await fetch(`/api/blocked/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        toast.success('User unblocked');
        loadBlockedUsers();
      } else {
        toast.error('Failed to unblock user');
      }
    } catch (error) {
      toast.error('Failed to unblock user');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 p-4">
          <button
            onClick={() => router.push('/settings')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Blocked Users</h1>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-2">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Blocked users cannot:
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Send you messages</li>
                <li>• See your profile</li>
                <li>• See your online status</li>
                <li>• Add you to groups</li>
              </ul>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : blockedUsers.length === 0 ? (
          <div className="text-center py-12">
            <UserX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">You haven't blocked anyone yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Blocked users will appear here
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              You have blocked {blockedUsers.length} user{blockedUsers.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-2">
              {blockedUsers.map((blocked) => (
                <div
                  key={blocked.id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="relative w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0 overflow-hidden">
                      {blocked.user?.profile_picture ? (
                        <Image
                          src={blocked.user.profile_picture}
                          alt={blocked.user.username || 'User'}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-gray-600 dark:text-gray-400">
                            {blocked.user?.username?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {blocked.user?.display_name || blocked.user?.username || 'Unknown'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        @{blocked.user?.username || 'no_username'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Blocked {formatTime(blocked.created_at)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnblock(blocked.user.id)}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



