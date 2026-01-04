'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { ArrowLeft, Camera, Upload, User, CheckCircle2, XCircle, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { usernameSchema } from '@/lib/validators';

export default function ProfileSetup() {
  const router = useRouter();
  const { user, token, setUser } = useAuthStore();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  if (!user || !token) {
    router.push('/auth/wallet');
    return null;
  }

  const checkUsername = async (value: string) => {
    if (!value) {
      setUsernameAvailable(null);
      return;
    }

    try {
      const validation = usernameSchema.safeParse(value);
      if (!validation.success) {
        setUsernameAvailable(false);
        return;
      }

      setCheckingUsername(true);
      const response = await fetch(`/api/profile/check-username?username=${value}`);
      const data = await response.json();
      setUsernameAvailable(data.available);
    } catch (error) {
      setUsernameAvailable(false);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setUsername(value);
    checkUsername(value);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }, // Front camera
        audio: false,
      });
      setStream(mediaStream);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `profile-${Date.now()}.jpg`, {
              type: 'image/jpeg',
            });
            setProfilePicture(file);
            setPreview(URL.createObjectURL(blob));
            stopCamera();
            toast.success('Photo captured!');
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || usernameAvailable !== true) {
      toast.error('Please enter a valid available username');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('username', username);
      if (displayName) formData.append('displayName', displayName);
      if (status) formData.append('status', status);
      if (profilePicture) formData.append('profilePicture', profilePicture);

      const response = await fetch('/api/profile/create', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        // Update user in store with new profile data
        setUser({
          id: data.user.id,
          walletAddress: data.user.walletAddress,
          username: data.user.username,
          displayName: data.user.displayName,
          profilePicture: data.user.profilePicture,
          status: data.user.status,
        });
        
        toast.success('Profile created successfully!');
        // Redirect to chats page (home)
        setTimeout(() => {
          router.push('/chats');
        }, 500);
      } else {
        toast.error(data.error || 'Failed to create profile');
      }
    } catch (error: any) {
      console.error('Profile creation error:', error);
      toast.error('Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => router.push('/auth/wallet')}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Create Profile
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Profile Picture
              </label>
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                  {preview ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <Camera className="w-4 h-4" />
                    <span className="text-sm">Capture</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Upload</span>
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="@username"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  minLength={3}
                  maxLength={20}
                />
                {username && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingUsername ? (
                      <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    ) : usernameAvailable === true ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : usernameAvailable === false ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : null}
                  </div>
                )}
              </div>
              {username && usernameAvailable !== null && (
                <p
                  className={`text-sm mt-1 ${
                    usernameAvailable ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {usernameAvailable
                    ? 'Username available'
                    : 'Username taken or invalid'}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                3-20 characters, alphanumeric and underscore only
              </p>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Display Name (optional)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                maxLength={50}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status (optional)
              </label>
              <textarea
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="What's on your mind?"
                maxLength={150}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {status.length}/150 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || usernameAvailable !== true}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Profile'}
            </button>
          </form>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Take Photo
              </h2>
              <button
                onClick={stopCamera}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="relative bg-black rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-auto max-h-[400px]"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={stopCamera}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium flex items-center justify-center space-x-2"
              >
                <Check className="w-5 h-5" />
                <span>Capture</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

