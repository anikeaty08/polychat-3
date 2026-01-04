'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useChatStore } from '@/lib/store';
import { MessageCircle, Phone, Settings, Search, Plus, MoreVertical, User, LogOut, Wallet, Circle, Shield, Lock, X } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import Image from 'next/image';
import StatusTab from './StatusTab';
import { io, Socket } from 'socket.io-client';

export default function ChatList() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const { conversations, setConversations, setActiveConversation } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'status' | 'calls'>('chats');
  const [filteredConversations, setFilteredConversations] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!user || !token) {
      router.push('/auth/wallet');
      return;
    }

    if (!user.username) {
      router.push('/profile/setup');
      return;
    }

    loadConversations();

    // Initialize socket for real-time updates
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    newSocket.on('connect', () => {
      console.log('ChatList socket connected');
    });

    newSocket.on('new_message', (data: any) => {
      loadConversations();
    });

    newSocket.on('user_status_change', (data: any) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        if (data.isOnline) {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
      loadConversations();
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, token]);

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/conversations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
        setFilteredConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
      return;
    }

    const searchLower = searchQuery.toLowerCase().trim();

    const filtered = conversations.filter((conv) => {
      const participant = conv.participant;

      // Search in username
      const usernameMatch = participant?.username
        ? participant.username.toLowerCase().includes(searchLower)
        : false;

      // Search in display name
      const displayNameMatch = participant?.display_name
        ? participant.display_name.toLowerCase().includes(searchLower)
        : false;

      // Search in wallet address (partial match)
      const walletMatch = participant?.wallet_address
        ? participant.wallet_address.toLowerCase().includes(searchLower)
        : false;

      // Search in last message content (only for text messages)
      let messageMatch = false;
      if (conv.last_message) {
        if (conv.last_message.message_type === 'text' && conv.last_message.content) {
          messageMatch = conv.last_message.content.toLowerCase().includes(searchLower);
        } else {
          // For non-text messages, search in the message type description
          const messageTypeDescriptions: Record<string, string> = {
            'audio': 'voice message',
            'image': 'photo',
            'video': 'video',
            'file': 'file',
          };
          const description = messageTypeDescriptions[conv.last_message.message_type] || '';
          messageMatch = description.includes(searchLower);
        }
      }

      return usernameMatch || displayNameMatch || walletMatch || messageMatch;
    });

    setFilteredConversations(filtered);
  }, [searchQuery, conversations]);

  const handleChatClick = (conversationId: string) => {
    setActiveConversation(conversationId);
    router.push(`/chats/${conversationId}`);
  };

  if (!user || !user.username) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen mesh-bg">
      {/* Header */}
      <div className="glass-card border-b border-gray-200/30 dark:border-gray-700/30">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">
              PolyChat
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => router.push('/search')}
              className="p-2.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all active:scale-95"
              title="Search"
            >
              <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="relative">
              <button
                className="p-2.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
              >
                <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 glass-card rounded-2xl shadow-2xl z-50 animate-scale-in overflow-hidden">
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          router.push('/profile');
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-100/80 dark:hover:bg-gray-700/80 text-gray-900 dark:text-white transition-all"
                      >
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          router.push('/payments');
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-100/80 dark:hover:bg-gray-700/80 text-gray-900 dark:text-white transition-all"
                      >
                        <Wallet className="w-4 h-4" />
                        <span>Payments</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          router.push('/settings');
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-100/80 dark:hover:bg-gray-700/80 text-gray-900 dark:text-white transition-all"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </button>
                      <div className="border-t border-gray-200/50 dark:border-gray-700/50 my-1" />
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          logout();
                          router.push('/');
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-red-50/80 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-all"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-violet-500 transition-colors" />
            <input
              type="text"
              placeholder="Search conversations by name, username, or message..."
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
              }}
              onKeyDown={(e) => {
                // Allow escape to clear search
                if (e.key === 'Escape') {
                  setSearchQuery('');
                }
              }}
              className="w-full pl-12 pr-10 py-3.5 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:bg-white dark:focus:bg-gray-900 transition-all shadow-sm hover:shadow-md"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Encryption Badge */}
        <div className="flex justify-center pb-3">
          <div className="encrypted-badge">
            <Lock className="w-3 h-3" />
            <span>End-to-end encrypted</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 py-4 text-center font-semibold transition-all duration-300 relative ${activeTab === 'chats'
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <div className="flex items-center justify-center gap-2">
              <MessageCircle className={`w-5 h-5 ${activeTab === 'chats' ? 'scale-110' : ''} transition-transform`} />
              <span>Chats</span>
            </div>
            {activeTab === 'chats' && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-violet-600 to-purple-500 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 py-4 text-center font-semibold transition-all duration-300 relative ${activeTab === 'status'
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Circle className={`w-5 h-5 ${activeTab === 'status' ? 'scale-110' : ''} transition-transform`} />
              <span>Status</span>
            </div>
            {activeTab === 'status' && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-violet-600 to-purple-500 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('calls');
              router.push('/calls');
            }}
            className={`flex-1 py-4 text-center font-semibold transition-all duration-300 relative ${activeTab === 'calls'
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Phone className={`w-5 h-5 ${activeTab === 'calls' ? 'scale-110' : ''} transition-transform`} />
              <span>Calls</span>
            </div>
            {activeTab === 'calls' && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-violet-600 to-purple-500 rounded-t-full" />
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'status' ? (
          <StatusTab />
        ) : activeTab === 'chats' ? (
          filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mb-6">
                <MessageCircle className="w-12 h-12 text-violet-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-xs">
                {searchQuery
                  ? `No conversations match "${searchQuery}". Try searching by username, display name, or message content.`
                  : 'Start a new chat to begin secure messaging'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => router.push('/search')}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95"
                >
                  Start New Chat
                </button>
              )}
            </div>
          ) : (
            <div className="p-2">
              {searchQuery && (
                <div className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Found {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''} matching "{searchQuery}"
                </div>
              )}
              {filteredConversations.map((conversation, index) => (
                <div
                  key={conversation.id}
                  onClick={() => handleChatClick(conversation.id)}
                  className="flex items-center space-x-4 p-4 mx-2 my-1 hover:bg-white/50 dark:hover:bg-gray-800/50 cursor-pointer transition-all duration-200 rounded-2xl group animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 flex-shrink-0 overflow-hidden shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/30 transition-all group-hover:scale-105">
                    {conversation.participant?.profile_picture && conversation.participant.profile_picture !== null ? (
                      <Image
                        src={conversation.participant.profile_picture}
                        alt={conversation.participant.username || 'User'}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-white text-xl font-bold">
                          {conversation.participant?.username?.[0]?.toUpperCase() || conversation.participant?.display_name?.[0]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                    {conversation.participant?.is_online !== null && conversation.participant?.is_online && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900 shadow-lg" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                        {conversation.participant?.display_name || conversation.participant?.username || 'Unknown'}
                      </h3>
                      {conversation.last_message && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                          {formatTime(conversation.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1">
                        {conversation.last_message?.message_type === 'audio' ? '🎤 Voice message' :
                          conversation.last_message?.message_type === 'image' ? '📷 Photo' :
                            conversation.last_message?.message_type === 'video' ? '🎥 Video' :
                              conversation.last_message?.message_type === 'file' ? '📎 File' :
                                conversation.last_message?.content || 'Start chatting...'}
                      </p>
                      {conversation.unread_count > 0 && (
                        <span className="flex-shrink-0 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg animate-pulse">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : null}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => router.push('/search')}
        className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-br from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-2xl shadow-2xl shadow-violet-500/40 flex items-center justify-center z-10 transition-all duration-300 hover:scale-110 active:scale-95 group"
      >
        <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
        <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    </div>
  );
}
