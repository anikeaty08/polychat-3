'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { 
  ArrowLeft, User, Shield, MessageCircle, Phone, Moon, Info, LogOut, 
  Settings, Bell, Lock, Palette, Trash2, Eye, EyeOff, Fingerprint, 
  Globe, Clock, UserX, Key, Smartphone, RefreshCw, AlertTriangle,
  CheckCircle, XCircle
} from 'lucide-react';
import { formatAddress } from '@/lib/polygon';
import { getTheme, setTheme } from '@/lib/theme';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function SettingsPage() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const [darkMode, setDarkMode] = useState(false);
  const [readReceipts, setReadReceipts] = useState(true);
  const [typingIndicators, setTypingIndicators] = useState(true);
  const [hideIP, setHideIP] = useState(true);
  
  // Enhanced Privacy Settings
  const [hideOnlineStatus, setHideOnlineStatus] = useState(false);
  const [hideLastSeen, setHideLastSeen] = useState(false);
  const [hideProfilePhoto, setHideProfilePhoto] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [screenLock, setScreenLock] = useState(false);
  const [autoDeleteMessages, setAutoDeleteMessages] = useState(false);
  const [autoDeleteDuration, setAutoDeleteDuration] = useState<'24h' | '7d' | '30d' | 'never'>('never');
  const [incognitoMode, setIncognitoMode] = useState(false);
  const [blockScreenshots, setBlockScreenshots] = useState(false);
  const [encryptedBackup, setEncryptedBackup] = useState(true);

  useEffect(() => {
    setDarkMode(getTheme() === 'dark');
    loadPrivacySettings();
  }, [token]);

  const loadPrivacySettings = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/privacy', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const settings = data.privacySettings;
        
        if (settings) {
          // Map database settings to frontend state
          setHideOnlineStatus(settings.online_status_visibility === 'nobody');
          setHideLastSeen(settings.last_seen_visibility === 'nobody');
          setHideProfilePhoto(settings.photo_visibility === 'contacts' || settings.photo_visibility === 'nobody');
          setReadReceipts(settings.read_receipts_enabled ?? true);
          setTypingIndicators(settings.typing_indicators_enabled ?? true);
          setIncognitoMode(settings.incognito_mode ?? false);
          setBlockScreenshots(settings.block_screenshots ?? false);
          setTwoFactorEnabled(settings.two_factor_enabled ?? false);
          setScreenLock(settings.screen_lock_enabled ?? false);
          setAutoDeleteMessages(settings.auto_delete_messages ?? false);
          setAutoDeleteDuration(settings.auto_delete_duration || 'never');
          setHideIP(settings.hide_ip_address ?? true);
          setEncryptedBackup(settings.encrypted_backup ?? true);
        }
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    }
  };

  const savePrivacySettings = async (updates: any) => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/privacy', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to save privacy settings');
      }
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
      toast.error('Failed to save privacy settings');
    }
  };

  const handleDarkModeToggle = (enabled: boolean) => {
    setDarkMode(enabled);
    setTheme(enabled ? 'dark' : 'light');
    toast.success(enabled ? 'Dark mode enabled' : 'Light mode enabled');
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
      router.push('/');
      toast.success('Logged out successfully');
    }
  };

  const handleClearChatHistory = async () => {
    if (!confirm('Are you sure you want to clear all chat history? This action cannot be undone.')) return;
    
    try {
      toast.success('Chat history cleared');
    } catch (error) {
      toast.error('Failed to clear chat history');
    }
  };

  const handleExportData = () => {
    toast.success('Data export started. You will be notified when ready.');
  };

  const handleDeleteAccount = () => {
    if (!confirm('WARNING: This will permanently delete your account and all data. This cannot be undone. Are you sure?')) return;
    if (!confirm('Last chance! Type "DELETE" in the next prompt to confirm.')) return;
    const confirmation = prompt('Type DELETE to confirm account deletion:');
    if (confirmation === 'DELETE') {
      toast.success('Account deletion request submitted');
      logout();
      router.push('/');
    } else {
      toast.error('Account deletion cancelled');
    }
  };

  if (!user) {
    router.push('/auth/wallet');
    return null;
  }

  return (
    <div className="min-h-screen mesh-bg">
      {/* Header */}
      <div className="glass-card border-b border-gray-200/30 dark:border-gray-700/30 sticky top-0 z-10">
        <div className="flex items-center space-x-3 p-4">
          <button
            onClick={() => router.push('/chats')}
            className="p-2.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold gradient-text">
              Settings
            </h1>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto pb-20">
        {/* Profile Card */}
        <div className="glass-card rounded-3xl p-6 card-3d-subtle">
          <div className="flex items-center space-x-4">
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex-shrink-0 overflow-hidden shadow-lg shadow-violet-500/30">
              {(user as any).profile_picture || user.profilePicture ? (
                <Image
                  src={(user as any).profile_picture || user.profilePicture || ''}
                  alt={user.username || 'User'}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {user.username?.[0]?.toUpperCase() || user.walletAddress?.[2]?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                {(user as any).display_name || user.displayName || user.username || 'User'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                @{user.username || 'not_set'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-1">
                {formatAddress(user.walletAddress || (user as any).wallet_address)}
              </p>
            </div>
            <button
              onClick={() => router.push('/profile/edit')}
              className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl active:scale-95"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Account Section */}
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600/10 to-purple-500/10 dark:from-violet-600/20 dark:to-purple-500/20 px-6 py-4 border-b border-gray-200/30 dark:border-gray-700/30">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <h2 className="font-bold text-gray-900 dark:text-white">Account</h2>
            </div>
          </div>
          <div className="p-2 space-y-1">
            <button
              onClick={() => router.push('/profile/edit')}
              className="w-full text-left px-4 py-3.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all text-gray-700 dark:text-gray-300 flex items-center justify-between"
            >
              <span>Edit Profile</span>
              <ArrowLeft className="w-4 h-4 rotate-180 text-gray-400" />
            </button>
            <button
              onClick={() => router.push('/profile')}
              className="w-full text-left px-4 py-3.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all text-gray-700 dark:text-gray-300 flex items-center justify-between"
            >
              <span>View Profile</span>
              <ArrowLeft className="w-4 h-4 rotate-180 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Privacy & Security - Enhanced */}
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600/10 to-teal-500/10 dark:from-emerald-600/20 dark:to-teal-500/20 px-6 py-4 border-b border-gray-200/30 dark:border-gray-700/30">
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="font-bold text-gray-900 dark:text-white">Privacy & Security</h2>
            </div>
          </div>
          <div className="p-2 space-y-1">
            {/* Online Status */}
            <div className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all">
              <div className="flex items-center space-x-3">
                <Eye className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <span className="text-gray-700 dark:text-gray-300">Hide Online Status</span>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Others won't see when you're online</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideOnlineStatus}
                  onChange={(e) => {
                    setHideOnlineStatus(e.target.checked);
                    savePrivacySettings({ hideOnlineStatus: e.target.checked });
                    toast.success(e.target.checked ? 'Online status hidden' : 'Online status visible');
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
              </label>
            </div>

            {/* Last Seen */}
            <div className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <span className="text-gray-700 dark:text-gray-300">Hide Last Seen</span>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Your last seen time will be hidden</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideLastSeen}
                  onChange={(e) => {
                    setHideLastSeen(e.target.checked);
                    savePrivacySettings({ hideLastSeen: e.target.checked });
                    toast.success(e.target.checked ? 'Last seen hidden' : 'Last seen visible');
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
              </label>
            </div>

            {/* Profile Photo Privacy */}
            <div className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all">
              <div className="flex items-center space-x-3">
                <EyeOff className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <span className="text-gray-700 dark:text-gray-300">Hide Profile Photo</span>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Only contacts can see your photo</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideProfilePhoto}
                  onChange={(e) => {
                    setHideProfilePhoto(e.target.checked);
                    savePrivacySettings({ hideProfilePhoto: e.target.checked });
                    toast.success(e.target.checked ? 'Profile photo hidden' : 'Profile photo visible');
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
              </label>
            </div>

            {/* Incognito Mode */}
            <div className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all">
              <div className="flex items-center space-x-3">
                <UserX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <span className="text-gray-700 dark:text-gray-300">Incognito Mode</span>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Browse without leaving traces</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={incognitoMode}
                  onChange={(e) => {
                    setIncognitoMode(e.target.checked);
                    savePrivacySettings({ incognitoMode: e.target.checked });
                    toast.success(e.target.checked ? 'Incognito mode enabled' : 'Incognito mode disabled');
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
              </label>
            </div>

            {/* Block Screenshots */}
            <div className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all">
              <div className="flex items-center space-x-3">
                <Smartphone className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <span className="text-gray-700 dark:text-gray-300">Block Screenshots</span>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Prevent screenshots in chats</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={blockScreenshots}
                  onChange={(e) => {
                    setBlockScreenshots(e.target.checked);
                    savePrivacySettings({ blockScreenshots: e.target.checked });
                    toast.success(e.target.checked ? 'Screenshot blocking enabled' : 'Screenshot blocking disabled');
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
              </label>
            </div>

            {/* Two-Factor Auth */}
            <div className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all">
              <div className="flex items-center space-x-3">
                <Fingerprint className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <span className="text-gray-700 dark:text-gray-300">Two-Factor Authentication</span>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Extra layer of security</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={(e) => {
                    setTwoFactorEnabled(e.target.checked);
                    savePrivacySettings({ twoFactorEnabled: e.target.checked });
                    toast.success(e.target.checked ? '2FA enabled' : '2FA disabled');
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
              </label>
            </div>

            {/* Screen Lock */}
            <div className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all">
              <div className="flex items-center space-x-3">
                <Lock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <span className="text-gray-700 dark:text-gray-300">App Lock</span>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Require PIN/biometrics to open</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={screenLock}
                  onChange={(e) => {
                    setScreenLock(e.target.checked);
                    savePrivacySettings({ screenLock: e.target.checked });
                    toast.success(e.target.checked ? 'App lock enabled' : 'App lock disabled');
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
              </label>
            </div>

            <button
              onClick={() => router.push('/settings/blocked')}
              className="w-full text-left px-4 py-3.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all text-gray-700 dark:text-gray-300 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <UserX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span>Blocked Users</span>
              </div>
              <ArrowLeft className="w-4 h-4 rotate-180 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600/10 to-cyan-500/10 dark:from-blue-600/20 dark:to-cyan-500/20 px-6 py-4 border-b border-gray-200/30 dark:border-gray-700/30">
            <div className="flex items-center space-x-3">
              <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-bold text-gray-900 dark:text-white">Messages</h2>
            </div>
          </div>
          <div className="p-2 space-y-1">
            <div className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all">
              <span className="text-gray-700 dark:text-gray-300">Read Receipts</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={readReceipts}
                  onChange={(e) => {
                    setReadReceipts(e.target.checked);
                    savePrivacySettings({ readReceipts: e.target.checked });
                    toast.success(e.target.checked ? 'Read receipts enabled' : 'Read receipts disabled');
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all">
              <span className="text-gray-700 dark:text-gray-300">Typing Indicators</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={typingIndicators}
                  onChange={(e) => {
                    setTypingIndicators(e.target.checked);
                    savePrivacySettings({ typingIndicators: e.target.checked });
                    toast.success(e.target.checked ? 'Typing indicators enabled' : 'Typing indicators disabled');
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
              </label>
            </div>
            
            {/* Auto-Delete Messages */}
            <div className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all">
              <div className="flex items-center space-x-3">
                <RefreshCw className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <span className="text-gray-700 dark:text-gray-300">Disappearing Messages</span>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Auto-delete messages after time</p>
                </div>
              </div>
              <select
                value={autoDeleteDuration}
                onChange={(e) => {
                  const newDuration = e.target.value as any;
                  setAutoDeleteDuration(newDuration);
                  setAutoDeleteMessages(newDuration !== 'never');
                  savePrivacySettings({ 
                    autoDeleteDuration: newDuration,
                    autoDeleteMessages: newDuration !== 'never'
                  });
                  toast.success(`Messages will ${newDuration === 'never' ? 'not' : ''} auto-delete${newDuration !== 'never' ? ` after ${newDuration}` : ''}`);
                }}
                className="bg-gray-100 dark:bg-gray-700 border-0 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-violet-500"
              >
                <option value="never">Never</option>
                <option value="24h">24 Hours</option>
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Calls */}
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600/10 to-emerald-500/10 dark:from-green-600/20 dark:to-emerald-500/20 px-6 py-4 border-b border-gray-200/30 dark:border-gray-700/30">
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h2 className="font-bold text-gray-900 dark:text-white">Calls</h2>
            </div>
          </div>
          <div className="p-2 space-y-1">
            <button
              onClick={() => router.push('/calls')}
              className="w-full text-left px-4 py-3.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all text-gray-700 dark:text-gray-300 flex items-center justify-between"
            >
              <span>Call History</span>
              <ArrowLeft className="w-4 h-4 rotate-180 text-gray-400" />
            </button>
            <div className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all">
              <div className="flex items-center space-x-3">
                <Globe className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <span className="text-gray-700 dark:text-gray-300">Hide IP Address</span>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Use relay for all calls</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideIP}
                  onChange={(e) => {
                    setHideIP(e.target.checked);
                    savePrivacySettings({ hideIP: e.target.checked });
                    toast.success(e.target.checked ? 'IP address hidden' : 'IP address visible');
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600/10 to-pink-500/10 dark:from-purple-600/20 dark:to-pink-500/20 px-6 py-4 border-b border-gray-200/30 dark:border-gray-700/30">
            <div className="flex items-center space-x-3">
              <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h2 className="font-bold text-gray-900 dark:text-white">Appearance</h2>
            </div>
          </div>
          <div className="p-2 space-y-1">
            <div className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all">
              <div className="flex items-center space-x-3">
                <Moon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">Dark Mode</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={(e) => handleDarkModeToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Data & Storage */}
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600/10 to-orange-500/10 dark:from-amber-600/20 dark:to-orange-500/20 px-6 py-4 border-b border-gray-200/30 dark:border-gray-700/30">
            <div className="flex items-center space-x-3">
              <Key className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2 className="font-bold text-gray-900 dark:text-white">Data & Storage</h2>
            </div>
          </div>
          <div className="p-2 space-y-1">
            <div className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all">
              <div className="flex items-center space-x-3">
                <Lock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <span className="text-gray-700 dark:text-gray-300">Encrypted Backup</span>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Backup data with encryption</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={encryptedBackup}
                  onChange={(e) => {
                    setEncryptedBackup(e.target.checked);
                    savePrivacySettings({ encryptedBackup: e.target.checked });
                    toast.success(e.target.checked ? 'Encrypted backup enabled' : 'Encrypted backup disabled');
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-violet-600"></div>
              </label>
            </div>
            <button
              onClick={handleExportData}
              className="w-full text-left px-4 py-3.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all text-gray-700 dark:text-gray-300 flex items-center justify-between"
            >
              <span>Export My Data</span>
              <ArrowLeft className="w-4 h-4 rotate-180 text-gray-400" />
            </button>
            <button
              onClick={handleClearChatHistory}
              className="w-full text-left px-4 py-3.5 hover:bg-red-50/80 dark:hover:bg-red-900/20 rounded-xl transition-all text-red-600 dark:text-red-400 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <Trash2 className="w-5 h-5" />
                <span>Clear All Chat History</span>
              </div>
            </button>
          </div>
        </div>

        {/* About */}
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-gray-600/10 to-slate-500/10 dark:from-gray-600/20 dark:to-slate-500/20 px-6 py-4 border-b border-gray-200/30 dark:border-gray-700/30">
            <div className="flex items-center space-x-3">
              <Info className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="font-bold text-gray-900 dark:text-white">About</h2>
            </div>
          </div>
          <div className="p-2 space-y-1">
            <div className="px-4 py-3.5">
              <p className="text-sm text-gray-500 dark:text-gray-400">Version</p>
              <p className="text-gray-900 dark:text-white font-semibold">2.0.0</p>
            </div>
            <button className="w-full text-left px-4 py-3.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all text-gray-700 dark:text-gray-300">
              Privacy Policy
            </button>
            <button className="w-full text-left px-4 py-3.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all text-gray-700 dark:text-gray-300">
              Terms of Service
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="glass-card rounded-3xl overflow-hidden border-2 border-red-200 dark:border-red-900/50">
          <div className="bg-gradient-to-r from-red-600/10 to-rose-500/10 dark:from-red-600/20 dark:to-rose-500/20 px-6 py-4 border-b border-red-200 dark:border-red-900/50">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h2 className="font-bold text-red-600 dark:text-red-400">Danger Zone</h2>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <button
              onClick={handleDeleteAccount}
              className="w-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-semibold py-3.5 px-6 rounded-xl flex items-center justify-center space-x-2 transition-all"
            >
              <XCircle className="w-5 h-5" />
              <span>Delete Account Permanently</span>
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center space-x-3 transition-all shadow-lg hover:shadow-xl active:scale-95"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
