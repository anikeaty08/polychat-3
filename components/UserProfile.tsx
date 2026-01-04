'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { ArrowLeft, MessageCircle, UserPlus, Shield, AlertTriangle, Copy, QrCode } from 'lucide-react';
import { formatAddress, formatTime, formatLastSeen } from '@/lib/utils';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface UserProfileProps {
  userId?: string;
  isOwn?: boolean;
}

export default function UserProfile({ userId, isOwn = false }: UserProfileProps) {
  const router = useRouter();
  const { user: currentUser, token } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || !token) {
      router.push('/auth/wallet');
      return;
    }

    if (isOwn) {
      loadOwnProfile();
    } else if (userId) {
      loadUserProfile(userId);
    }
  }, [userId, isOwn]);

  const loadOwnProfile = async () => {
    try {
      const response = await fetch('/api/profile/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async (id: string) => {
    try {
      const response = await fetch(`/api/profile/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!profile) return;
    try {
      const response = await fetch('/api/conversations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: profile.id }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/chats/${data.conversation.id}`);
      }
    } catch (error) {
      toast.error('Failed to start chat');
    }
  };

  const handleCopyAddress = () => {
    if (profile?.wallet_address) {
      navigator.clipboard.writeText(profile.wallet_address);
      toast.success('Address copied!');
    }
  };

  const handleAddContact = async () => {
    if (!profile || !token) return;
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contactId: profile.id }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Contact added successfully!');
      } else {
        toast.error(data.error || 'Failed to add contact');
      }
    } catch (error) {
      console.error('Add contact error:', error);
      toast.error('Failed to add contact');
    }
  };

  const handleBlock = async () => {
    if (!profile || !token) return;
    if (!confirm('Are you sure you want to block this user?')) return;
    
    try {
      const response = await fetch('/api/blocked', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: profile.id }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('User blocked successfully');
        router.back();
      } else {
        toast.error(data.error || 'Failed to block user');
      }
    } catch (error) {
      console.error('Block user error:', error);
      toast.error('Failed to block user');
    }
  };

  const handleReport = async () => {
    if (!profile || !token) return;
    const reason = prompt('Please provide a reason for reporting this user:');
    if (!reason) return;
    
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          userId: profile.id,
          reason: reason,
          description: reason,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Report submitted successfully. Our team will review it.');
      } else {
        toast.error(data.error || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Report error:', error);
      toast.error('Failed to submit report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600 dark:text-gray-400">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 p-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {isOwn ? 'My Profile' : 'Profile'}
          </h1>
        </div>
      </div>

      <div className="p-4">
        {/* Profile Picture */}
        <div className="flex justify-center mb-6">
          <div className="relative w-32 h-32 rounded-full bg-gray-300 dark:bg-gray-600 overflow-hidden">
            {profile.profile_picture ? (
              <Image
                src={profile.profile_picture}
                alt={profile.username || 'User'}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-600 dark:text-gray-400 text-4xl">
                  {profile.username?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Name and Username */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {profile.display_name || profile.username || 'Unknown'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">@{profile.username || 'no_username'}</p>
          {profile.is_online ? (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">🟢 Online</p>
          ) : profile.last_seen ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Last seen {formatLastSeen(profile.last_seen)}
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">⚫ Offline</p>
          )}
        </div>

        {/* Status */}
        {profile.status && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
            <p className="text-gray-700 dark:text-gray-300">{profile.status}</p>
          </div>
        )}

        {/* Wallet Address */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Wallet Address</p>
              <p className="text-sm font-mono text-gray-900 dark:text-white">
                {formatAddress(profile.wallet_address)}
              </p>
            </div>
            <button
              onClick={handleCopyAddress}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Join Date */}
        {profile.created_at && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Joined</p>
            <p className="text-sm text-gray-900 dark:text-white">
              {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Encryption Badge */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-900 dark:text-green-100">
              🔐 E2E Encrypted Connection
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {!isOwn && (
          <div className="space-y-3">
            <button
              onClick={handleStartChat}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center space-x-2"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Message</span>
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleAddContact}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center space-x-2"
              >
                <UserPlus className="w-5 h-5" />
                <span>Add Contact</span>
              </button>
              <button 
                onClick={handleBlock}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center space-x-2"
              >
                <Shield className="w-5 h-5" />
                <span>Block</span>
              </button>
            </div>
            <button 
              onClick={handleReport}
              className="w-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold py-3 px-6 rounded-lg flex items-center justify-center space-x-2"
            >
              <AlertTriangle className="w-5 h-5" />
              <span>Report</span>
            </button>
          </div>
        )}

        {isOwn && (
          <button
            onClick={() => router.push('/settings')}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg"
          >
            Go to Settings
          </button>
        )}
      </div>
    </div>
  );
}

