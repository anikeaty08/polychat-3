'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { ArrowLeft, Search, MessageCircle, UserPlus, Shield, User } from 'lucide-react';
import { formatAddress } from '@/lib/polygon';
import Image from 'next/image';
import toast from 'react-hot-toast';

export default function SearchUsers() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    if (!user || !token) {
      router.push('/auth/wallet');
      return;
    }
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const response = await fetch('/api/search/recent', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRecentSearches(data.searches || []);
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  };

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 p-4">
          <button
            onClick={() => router.push('/chats')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by @username or 0x..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      <div className="p-4">
        {!query && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Search Tips
            </h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>• @username (e.g., @alice_123)</p>
              <p>• Wallet address (0x...)</p>
              <p>• ENS name (alice.eth)</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {query && !loading && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Results for "{query}"
            </h3>
            {results.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No users found
              </p>
            ) : (
              <div className="space-y-2">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="relative w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0 overflow-hidden">
                        {result.profile_picture ? (
                          <Image
                            src={result.profile_picture}
                            alt={result.username || 'User'}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {result.display_name || result.username || 'Unknown'}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          @{result.username || 'no_username'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                          {formatAddress(result.wallet_address)}
                        </p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${result.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleStartChat(result.id)}
                        className="flex-1 flex items-center justify-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg text-sm font-medium"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Message</span>
                      </button>
                      <button
                        onClick={() => handleViewProfile(result.id)}
                        className="flex-1 flex items-center justify-center space-x-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white py-2 px-4 rounded-lg text-sm font-medium"
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



