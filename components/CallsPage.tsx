'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { ArrowLeft, Phone, Video, PhoneMissed, Trash2, PhoneCall, PhoneOutgoing, PhoneIncoming } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatTime, formatDate } from '@/lib/utils';
import Image from 'next/image';

export default function CallsPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [calls, setCalls] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'audio' | 'video' | 'missed'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !token) {
      router.push('/auth/wallet');
      return;
    }
    loadCalls();
  }, [activeTab]);

  const loadCalls = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/calls?type=${activeTab}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCalls(data.calls || []);
      }
    } catch (error) {
      console.error('Failed to load calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCallLogs = async () => {
    if (!confirm('Are you sure you want to clear all call logs? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/calls/clear', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setCalls([]);
        toast.success('Call logs cleared');
      } else {
        toast.error('Failed to clear call logs');
      }
    } catch (error) {
      console.error('Clear call logs error:', error);
      toast.error('Failed to clear call logs');
    }
  };

  const getCallIcon = (call: any) => {
    if (call.status === 'missed' || call.status === 'declined') {
      return <PhoneMissed className="w-5 h-5" />;
    }
    if (call.is_outgoing) {
      return <PhoneOutgoing className="w-5 h-5" />;
    }
    return <PhoneIncoming className="w-5 h-5" />;
  };

  const getCallColor = (call: any) => {
    if (call.status === 'missed' || call.status === 'declined') {
      return 'from-red-500 to-rose-600';
    }
    if (call.status === 'completed') {
      return 'from-emerald-500 to-teal-600';
    }
    return 'from-violet-500 to-purple-600';
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen mesh-bg">
      {/* Header */}
      <div className="glass-card border-b border-gray-200/30 dark:border-gray-700/30 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push('/chats')}
              className="p-2.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold gradient-text">
                Calls
              </h1>
            </div>
          </div>
          {calls.length > 0 && (
            <button
              onClick={handleClearCallLogs}
              className="p-2.5 hover:bg-red-50/80 dark:hover:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400 transition-all active:scale-95"
              title="Clear call logs"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          {[
            { id: 'all', label: 'All', icon: PhoneCall },
            { id: 'audio', label: 'Audio', icon: Phone },
            { id: 'video', label: 'Video', icon: Video },
            { id: 'missed', label: 'Missed', icon: PhoneMissed },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3.5 text-center text-sm font-medium relative transition-all ${
                activeTab === tab.id
                  ? 'text-violet-600 dark:text-violet-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'scale-110' : ''} transition-transform`} />
                <span>{tab.label}</span>
              </div>
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-violet-600 to-purple-500 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">Loading calls...</p>
          </div>
        ) : calls.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mx-auto mb-6 shadow-inner">
              <PhoneMissed className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-gray-900 dark:text-white text-lg font-bold mb-2">No calls yet</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">Your call history will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {calls.map((call, index) => (
              <div
                key={call.id}
                className="glass-card rounded-2xl p-5 transition-all hover:scale-[1.01] animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Avatar */}
                    <div className="relative">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getCallColor(call)} flex items-center justify-center shadow-lg`}>
                        {call.contact?.profile_picture ? (
                          <Image
                            src={call.contact.profile_picture}
                            alt={call.contact.username || 'User'}
                            fill
                            className="object-cover rounded-2xl"
                          />
                        ) : (
                          <span className="text-white text-xl font-bold">
                            {call.contact?.username?.[0]?.toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                      {/* Call type indicator */}
                      <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-lg ${
                        call.status === 'missed' || call.status === 'declined'
                          ? 'bg-red-500'
                          : call.status === 'completed'
                          ? 'bg-emerald-500'
                          : 'bg-violet-500'
                      }`}>
                        {call.call_type === 'video' ? (
                          <Video className="w-3 h-3 text-white" />
                        ) : (
                          <Phone className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>
                    
                    {/* Info */}
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-lg">
                        {call.contact?.display_name || call.contact?.username || 'Unknown'}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-sm font-medium ${
                          call.status === 'missed' || call.status === 'declined'
                            ? 'text-red-500'
                            : call.status === 'completed'
                            ? 'text-emerald-500'
                            : 'text-gray-500'
                        }`}>
                          {getCallIcon(call)}
                        </span>
                        <span className={`text-sm font-medium ${
                          call.status === 'missed' || call.status === 'declined'
                            ? 'text-red-500'
                            : call.status === 'completed'
                            ? 'text-emerald-500'
                            : 'text-gray-500'
                        }`}>
                          {call.status === 'missed' ? 'Missed' : 
                           call.status === 'declined' ? 'Declined' :
                           call.status === 'completed' ? 'Completed' : 
                           call.status === 'answered' ? 'Answered' : call.status}
                        </span>
                        {call.duration && (
                          <>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {Math.floor(call.duration / 60)}:{String(call.duration % 60).padStart(2, '0')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Right side */}
                  <div className="text-right flex items-center space-x-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {formatDate(call.created_at)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {formatTime(call.created_at)}
                      </p>
                    </div>
                    <button 
                      className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95"
                      onClick={() => {
                        // TODO: Initiate call
                        toast.success('Calling...');
                      }}
                    >
                      <Phone className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
