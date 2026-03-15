'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { ArrowLeft, MessageCircle, UserPlus, Shield, AlertTriangle, Copy, QrCode, Circle, Lock, Wallet } from 'lucide-react';
import { formatAddress, formatTime, formatLastSeen } from '@/lib/utils';
import toast from 'react-hot-toast';
import Image from 'next/image';
import OnChainCoreStatus from '@/components/OnChainCoreStatus';

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
      <div className="flex items-center justify-center h-screen mesh-bg">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mx-auto mb-3" />
          <div className="text-gray-600 dark:text-gray-400 font-medium">Loading profile…</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen mesh-bg">
        <div className="glass-card rounded-3xl p-8 text-center">
          <div className="text-gray-900 dark:text-white font-bold text-lg">Profile not found</div>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 rounded-2xl bg-white/60 dark:bg-gray-900/40 hover:bg-white/80 dark:hover:bg-gray-900/60 text-gray-900 dark:text-white font-semibold transition-all active:scale-95"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-bg">
      <div className="glass-card border-b border-gray-200/30 dark:border-gray-700/30 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4 max-w-2xl mx-auto">
          <div className="flex items-center space-x-3">
          <button
            onClick={() => router.back()}
            className="p-2.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {isOwn ? 'My Profile' : 'Profile'}
          </h1>
          </div>
          {!isOwn && profile?.wallet_address && (
            <button
              onClick={() => router.push(`/payments?to=${profile.wallet_address}`)}
              className="px-3 py-2 rounded-xl bg-white/60 dark:bg-gray-900/40 hover:bg-white/80 dark:hover:bg-gray-900/60 text-gray-900 dark:text-white text-sm font-semibold transition-all active:scale-95 inline-flex items-center gap-2"
              title="Pay"
            >
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Pay</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {/* Profile Picture */}
        <div className="flex justify-center mb-6">
          <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 overflow-hidden shadow-2xl shadow-emerald-500/20 border border-white/20">
            {profile.profile_picture ? (
              <Image
                src={profile.profile_picture}
                alt={profile.username || 'User'}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-white text-4xl font-extrabold">
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
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2 inline-flex items-center gap-2 justify-center">
              <Circle className="w-3 h-3 fill-current" />
              <span>Online</span>
            </p>
          ) : profile.last_seen ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Last seen {formatLastSeen(profile.last_seen)}
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 inline-flex items-center gap-2 justify-center">
              <Circle className="w-3 h-3 fill-current opacity-50" />
              <span>Offline</span>
            </p>
          )}
        </div>

        {/* Status */}
        {profile.status && (
          <div className="glass-card rounded-3xl p-4 mb-4">
            <p className="text-gray-700 dark:text-gray-300">{profile.status}</p>
          </div>
        )}

        {/* Wallet Address */}
        <div className="glass-card rounded-3xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Wallet Address</p>
              <p className="text-sm font-mono text-gray-900 dark:text-white">
                {formatAddress(profile.wallet_address)}
              </p>
            </div>
            <button
              onClick={handleCopyAddress}
              className="p-2.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all active:scale-95"
              title="Copy address"
            >
              <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Join Date */}
        {profile.created_at && (
          <div className="glass-card rounded-3xl p-4 mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Joined</p>
            <p className="text-sm text-gray-900 dark:text-white">
              {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Encryption & On-chain Badges */}
        <div className="glass-card border border-emerald-200/40 dark:border-emerald-900/40 rounded-3xl p-4 mb-4 space-y-2">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-900 dark:text-green-100">
              <span className="inline-flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>E2E Encrypted Connection</span>
              </span>
            </p>
          </div>
          <OnChainCoreStatus compact />
        </div>

        {/* Action Buttons */}
        {!isOwn && (
          <div className="space-y-3">
            <button
              onClick={handleStartChat}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-2xl flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Message</span>
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleAddContact}
                className="bg-white/60 dark:bg-gray-900/40 hover:bg-white/80 dark:hover:bg-gray-900/60 text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-95"
              >
                <UserPlus className="w-5 h-5" />
                <span>Add Contact</span>
              </button>
              <button 
                onClick={handleBlock}
                className="bg-white/60 dark:bg-gray-900/40 hover:bg-red-50/80 dark:hover:bg-red-900/20 text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-95"
              >
                <Shield className="w-5 h-5" />
                <span>Block</span>
              </button>
            </div>
            <button 
              onClick={handleReport}
              className="w-full bg-red-50/80 dark:bg-red-900/20 hover:bg-red-100/80 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold py-3 px-6 rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-95"
            >
              <AlertTriangle className="w-5 h-5" />
              <span>Report</span>
            </button>
          </div>
        )}

        {isOwn && (
          <button
            onClick={() => router.push('/settings')}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            Go to Settings
          </button>
        )}
      </div>
    </div>
  );
}

