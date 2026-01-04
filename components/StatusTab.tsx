'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Plus, Image as ImageIcon, X, Sparkles, Circle } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
import { getStatusContract, isOnChainEnabled } from '@/lib/contracts';
import StoryViewer from './StoryViewer';

export default function StatusTab() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [statuses, setStatuses] = useState<any[]>([]);
  const [myStatus, setMyStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [statusImage, setStatusImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedStoryUser, setSelectedStoryUser] = useState<string | null>(null);
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !token) return;
    loadStatuses();
  }, [user, token]);

  const loadStatuses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        try {
          const data = await response.json();
          setStatuses(data.statuses || []);
          setMyStatus(data.myStatus || null);
        } catch (error) {
          console.error('Failed to parse status response:', error);
          toast.error('Failed to load statuses');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load statuses' }));
        toast.error(errorData.error || 'Failed to load statuses');
      }
    } catch (error) {
      console.error('Failed to load statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStatus = async () => {
    if (!statusText.trim() && !statusImage) {
      toast.error('Please add text or image to your status');
      return;
    }

    // Check if on-chain is enabled
    if (!isOnChainEnabled() || typeof window === 'undefined' || !window.ethereum) {
      // Fallback to off-chain
      try {
        setUploading(true);
        let imageUrl = null;

        if (statusImage) {
          const formData = new FormData();
          formData.append('file', statusImage);
          formData.append('type', 'status');

          const uploadResponse = await fetch('/api/status/upload', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          if (uploadResponse.ok) {
            try {
              const uploadData = await uploadResponse.json();
              imageUrl = uploadData.url;
            } catch (error) {
              console.error('Failed to parse upload response:', error);
              toast.error('Failed to upload image');
              setUploading(false);
              return;
            }
          } else {
            const errorData = await uploadResponse.json().catch(() => ({ error: 'Failed to upload image' }));
            toast.error(errorData.error || 'Failed to upload image');
            setUploading(false);
            return;
          }
        }

        const response = await fetch('/api/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text: statusText.trim(),
            image_url: imageUrl,
          }),
        });

        if (response.ok) {
          toast.success('Status created!');
          setShowCreateModal(false);
          setStatusText('');
          setStatusImage(null);
          loadStatuses();
        } else {
          toast.error('Failed to create status');
        }
      } catch (error) {
        console.error('Create status error:', error);
        toast.error('Failed to create status');
      } finally {
        setUploading(false);
      }
      return;
    }

    try {
      setUploading(true);
      toast.loading('Creating status on-chain...', { id: 'create-status' });

      let imageIpfsHash = '';
      if (statusImage) {
        const formData = new FormData();
        formData.append('file', statusImage);
        formData.append('type', 'status');

        const uploadResponse = await fetch('/api/status/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (uploadResponse.ok) {
          try {
            const uploadData = await uploadResponse.json();
            // Extract IPFS hash from URL
            const ipfsMatch = uploadData.url?.match(/ipfs\/(.+)/);
            if (ipfsMatch) {
              imageIpfsHash = ipfsMatch[1];
            } else if (uploadData.ipfsHash) {
              imageIpfsHash = uploadData.ipfsHash;
            }
          } catch (error) {
            console.error('Failed to parse upload response:', error);
            toast.error('Failed to upload image', { id: 'create-status' });
            setUploading(false);
            return;
          }
        } else {
          const errorData = await uploadResponse.json().catch(() => ({ error: 'Failed to upload image' }));
          toast.error(errorData.error || 'Failed to upload image', { id: 'create-status' });
          setUploading(false);
          return;
        }
      }

      // Use server-side endpoint
      const response = await fetch('/api/status/server-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: statusText.trim(),
          image_ipfs_hash: imageIpfsHash,
        }),
      });

      if (response.ok) {
        toast.success('Status created on-chain!', { id: 'create-status' });
        setShowCreateModal(false);
        setStatusText('');
        setStatusImage(null);
        loadStatuses();
      } else {
        try {
          const error = await response.json();
          toast.error(error.error || 'Failed to create status', { id: 'create-status' });
        } catch (parseError) {
          toast.error('Failed to create status', { id: 'create-status' });
        }
      }
    } catch (error: any) {
      console.error('Create status error:', error);
      if (error.message?.includes('not configured')) {
        // Fallback to off-chain
        toast.dismiss('create-status');
        handleCreateStatus();
      } else {
        toast.error(error.message || 'Failed to create status', { id: 'create-status' });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB');
        return;
      }
      setStatusImage(file);
    }
  };

  // Group statuses by user
  const storiesByUser = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    
    // Add my status if exists
    if (myStatus) {
      grouped['me'] = [myStatus];
    }
    
    // Group other statuses by user
    statuses.forEach((status) => {
      const userId = status.user_id;
      if (!grouped[userId]) {
        grouped[userId] = [];
      }
      grouped[userId].push(status);
    });
    
    return grouped;
  }, [statuses, myStatus]);

  const handleStoryClick = (userId: string) => {
    setSelectedStoryUser(userId);
  };

  const handleStoryView = async (storyId: string) => {
    if (!viewedStories.has(storyId)) {
      setViewedStories((prev) => new Set([...prev, storyId]));
      // Track view in database
      try {
        await fetch('/api/status/view', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ storyId }),
        });
      } catch (error) {
        console.error('Failed to track story view:', error);
      }
    }
  };

  const selectedStories = selectedStoryUser ? storiesByUser[selectedStoryUser] || [] : [];
  const selectedUser = selectedStories[0]?.user;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 dark:text-gray-400">Loading statuses...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* WhatsApp-style Story Circles */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex space-x-4 pb-2">
          {/* My Status Circle */}
          <div className="flex-shrink-0">
            <button
              onClick={() => myStatus ? handleStoryClick('me') : setShowCreateModal(true)}
              className="relative group"
            >
              <div className={`relative w-20 h-20 rounded-full overflow-hidden border-4 ${
                myStatus 
                  ? 'border-violet-500 dark:border-violet-400' 
                  : 'border-gray-300 dark:border-gray-600 border-dashed'
              } transition-all hover:scale-105`}>
                {myStatus ? (
                  <>
                    {(user as any)?.profile_picture || user.profilePicture ? (
                      <Image
                        src={(user as any)?.profile_picture || user.profilePicture || ''}
                        alt="My Status"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-bold text-xl">
                          {user?.username?.[0]?.toUpperCase() || user?.walletAddress?.[2]?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-6 h-6 bg-violet-500 dark:bg-violet-400 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                    <Plus className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  </div>
                )}
              </div>
              <p className="text-xs text-center mt-2 text-gray-700 dark:text-gray-300 font-medium">
                {myStatus ? 'My Status' : 'Your Status'}
              </p>
            </button>
          </div>

          {/* Other Users' Story Circles */}
          {Object.entries(storiesByUser)
            .filter(([userId]) => userId !== 'me')
            .map(([userId, userStories]) => {
              const storyUser = userStories[0]?.user;
              const hasUnviewed = userStories.some((s) => !viewedStories.has(s.id));
              
              return (
                <div key={userId} className="flex-shrink-0">
                  <button
                    onClick={() => handleStoryClick(userId)}
                    className="relative group"
                  >
                    <div className={`relative w-20 h-20 rounded-full overflow-hidden border-4 transition-all hover:scale-105 ${
                      hasUnviewed 
                        ? 'border-violet-500 dark:border-violet-400' 
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {storyUser?.profile_picture ? (
                        <Image
                          src={storyUser.profile_picture}
                          alt={storyUser.display_name || storyUser.username || 'User'}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-bold text-xl">
                            {storyUser?.username?.[0]?.toUpperCase() || storyUser?.display_name?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-center mt-2 text-gray-700 dark:text-gray-300 truncate max-w-[80px]">
                      {storyUser?.display_name || storyUser?.username || 'Unknown'}
                    </p>
                  </button>
                </div>
              );
            })}
        </div>
      </div>

      {/* Story Viewer Modal */}
      {selectedStoryUser && selectedStories.length > 0 && (
        <StoryViewer
          stories={selectedStories}
          initialIndex={0}
          onClose={() => setSelectedStoryUser(null)}
          onView={handleStoryView}
        />
      )}

      {/* Create Status Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200/50 dark:border-gray-700/50 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Status</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setStatusText('');
                  setStatusImage(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <textarea
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:bg-white dark:focus:bg-gray-800 resize-none transition-all border border-gray-200 dark:border-gray-700"
                rows={4}
                maxLength={500}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Add Image (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="status-image-input"
                />
                <label
                  htmlFor="status-image-input"
                  className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <ImageIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {statusImage ? statusImage.name : 'Choose Image'}
                  </span>
                </label>
                {statusImage && (
                  <div className="mt-2 relative w-full h-32 rounded-lg overflow-hidden">
                    <Image
                      src={URL.createObjectURL(statusImage)}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setStatusText('');
                    setStatusImage(null);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateStatus}
                  disabled={uploading || (!statusText.trim() && !statusImage)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all disabled:hover:shadow-lg"
                >
                  {uploading ? 'Posting...' : 'Post Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

