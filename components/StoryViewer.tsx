'use client';

import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useAuthStore } from '@/lib/store';

interface Story {
  id: string;
  user_id: string;
  text?: string;
  image_url?: string;
  created_at: string;
  expires_at: string;
  user?: {
    id: string;
    username?: string;
    display_name?: string;
    profile_picture?: string;
  };
}

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onView?: (storyId: string) => void;
}

export default function StoryViewer({ stories, initialIndex, onClose, onView }: StoryViewerProps) {
  const { user } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentStory = stories[currentIndex];
  const currentUser = currentStory?.user || {
    id: user?.id || '',
    username: user?.username,
    display_name: (user as any)?.display_name || user?.displayName,
    profile_picture: (user as any)?.profile_picture || user?.profilePicture,
  };

  useEffect(() => {
    if (!currentStory || isPaused) return;

    const duration = 5000; // 5 seconds per story
    const interval = 100; // Update every 100ms
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, isPaused, currentStory]);

  useEffect(() => {
    // Mark story as viewed
    if (currentStory && onView) {
      onView(currentStory.id);
    }
  }, [currentIndex, currentStory, onView]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickPosition = x / rect.width;

    if (clickPosition < 0.33) {
      handlePrevious();
    } else if (clickPosition > 0.66) {
      handleNext();
    } else {
      // Center click - pause/resume
      setIsPaused(!isPaused);
    }
  };

  if (!currentStory) {
    onClose();
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-4 z-10">
        {stories.map((_, index) => (
          <div
            key={index}
            className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
          >
            <div
              className={`h-full bg-white transition-all duration-100 ${
                index < currentIndex ? 'w-full' : index === currentIndex ? 'w-full' : 'w-0'
              }`}
              style={{
                width: index === currentIndex ? `${progress}%` : index < currentIndex ? '100%' : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
            {currentUser?.profile_picture ? (
              <Image
                src={currentUser.profile_picture}
                alt={currentUser.display_name || currentUser.username || 'User'}
                width={40}
                height={40}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold">
                  {currentUser?.username?.[0]?.toUpperCase() || currentUser?.display_name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>
          <div>
            <p className="text-white font-semibold">
              {currentUser?.display_name || currentUser?.username || 'Unknown'}
            </p>
            <p className="text-white/70 text-xs">
              {new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Story content */}
      <div
        className="w-full h-full flex items-center justify-center cursor-pointer"
        onClick={handleClick}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {currentStory.image_url ? (
          <div className="relative w-full h-full">
            <Image
              src={currentStory.image_url}
              alt="Story"
              fill
              className="object-contain"
              priority
            />
            {currentStory.text && (
              <div className="absolute bottom-20 left-0 right-0 px-6">
                <p className="text-white text-lg font-medium text-center drop-shadow-lg">
                  {currentStory.text}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="px-8 max-w-2xl">
            <p className="text-white text-3xl font-medium text-center">
              {currentStory.text}
            </p>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <button
        onClick={handlePrevious}
        disabled={currentIndex === 0}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors disabled:opacity-0 disabled:cursor-not-allowed z-10"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button
        onClick={handleNext}
        disabled={currentIndex === stories.length - 1}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors disabled:opacity-0 disabled:cursor-not-allowed z-10"
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>
    </div>
  );
}

