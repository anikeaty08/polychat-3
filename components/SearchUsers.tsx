'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { ArrowLeft, MessageCircle, Search, User } from 'lucide-react';
import { formatAddress } from '@/lib/polygon';
import Image from 'next/image';
import toast from 'react-hot-toast';

export default function SearchUsers() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !token) {
      router.push('/auth/wallet');
      return;
    }
  }, [user, token, router]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.users || []);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (userId: string) => {
    try {
      const response = await fetch('/api/conversations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/chats/${data.conversation.id}`);
      } else {
        toast.error('Failed to start chat');
      }
    } catch (error) {
      console.error('Start chat error:', error);
      toast.error('Failed to start chat');
    }
  };

  const handleViewProfile = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  return (
    <div className="min-h-screen mesh-bg">
      <div className="glass-card border-b border-gray-200/30 dark:border-gray-700/30 sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4 max-w-2xl mx-auto">
          <button
            onClick={() => router.push('/chats')}
            className="p-2.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all active:scale-95"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by @username or 0x..."
              value={query}
              onChange={(e) => {
                const v = e.target.value;
                setQuery(v);
                handleSearch(v);
              }}
              className="w-full pl-12 pr-4 py-3 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:bg-white dark:focus:bg-gray-900 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {!query && (
          <div className="glass-card rounded-3xl p-6 mb-6">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">Search Tips</h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                @username (e.g., @alice_123)
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                Wallet address (0x...)
              </p>
              <p className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                ENS name (alice.eth) if supported
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-10">
            <div className="inline-block w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {query && !loading && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 px-1">
              Results for "{query}"
            </h3>

            {results.length === 0 ? (
              <div className="glass-card rounded-3xl p-10 text-center">
                <p className="text-gray-600 dark:text-gray-400 font-medium">No users found</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Try @username or a wallet address</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((result) => (
                  <div key={result.id} className="glass-card rounded-3xl p-4 hover:shadow-xl transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 flex-shrink-0 overflow-hidden shadow-lg shadow-violet-500/20">
                        {result.profile_picture ? (
                          <Image src={result.profile_picture} alt={result.username || 'User'} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-white font-bold text-lg">{result.username?.[0]?.toUpperCase() || 'U'}</span>
                          </div>
                        )}
                        <div
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${
                            result.is_online ? 'bg-emerald-500' : 'bg-gray-400'
                          }`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 dark:text-white truncate">
                          {result.display_name || result.username || 'Unknown'}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">@{result.username || 'no_username'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">{formatAddress(result.wallet_address)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartChat(result.id)}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-2.5 px-4 rounded-2xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all active:scale-95"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Message</span>
                      </button>
                      <button
                        onClick={() => handleViewProfile(result.id)}
                        className="flex-1 flex items-center justify-center gap-2 bg-white/60 dark:bg-gray-900/40 hover:bg-white/80 dark:hover:bg-gray-900/60 text-gray-900 dark:text-white py-2.5 px-4 rounded-2xl text-sm font-semibold transition-all active:scale-95"
                      >
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

