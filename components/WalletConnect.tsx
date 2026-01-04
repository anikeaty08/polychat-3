'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { generateChallenge, verifyWalletSignature } from '@/lib/auth';
import { formatAddress } from '@/lib/polygon';
import { Wallet, ArrowLeft, CheckCircle2, X, MessageCircle, Phone, Shield, Lock, Zap, Globe, Mic, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function WalletConnect() {
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setConnected(true);
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  };

  const connectMetaMask = async () => {
    if (typeof window.ethereum === 'undefined') {
      toast.error('MetaMask is not installed');
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Request account access
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      setAddress(address);
      setConnected(true);
      toast.success('Wallet connected!');
    } catch (error: any) {
      console.error('Connection error:', error);
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const signMessage = async () => {
    if (!address) return;

    try {
      setSigning(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Get challenge from server
      const challengeResponse = await fetch(`/api/auth/wallet?address=${address}`);
      
      if (!challengeResponse.ok) {
        let errorMessage = 'Failed to get challenge';
        try {
          const errorData = await challengeResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error: ${challengeResponse.status}`;
        }
        throw new Error(errorMessage);
      }
      
      let challengeData;
      try {
        challengeData = await challengeResponse.json();
      } catch (error) {
        throw new Error('Invalid response from server');
      }
      
      const message = challengeData?.message;
      if (!message) {
        throw new Error('No challenge message received');
      }

      // Sign message
      const signature = await signer.signMessage(message);

      // Verify and authenticate
      const response = await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, message }),
      });

      if (!response.ok) {
        let errorMessage = 'Authentication failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = await response.json();
      } catch (error) {
        throw new Error('Invalid response from server');
      }

      if (data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
        toast.success('Authentication successful!');
        
        if (data.user.hasProfile) {
          router.push('/chats');
        } else {
          router.push('/profile/setup');
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Signing error:', error);
      toast.error(error.message || 'Failed to sign message');
    } finally {
      setSigning(false);
    }
  };

  const disconnect = () => {
    setAddress('');
    setConnected(false);
  };

  const features = [
    {
      icon: MessageCircle,
      title: 'Secure Messaging',
      description: 'End-to-end encrypted messages on the blockchain',
    },
    {
      icon: Phone,
      title: 'Voice & Video Calls',
      description: 'Make crystal-clear calls directly from the app',
    },
    {
      icon: Mic,
      title: 'Voice Messages',
      description: 'Send quick voice notes to your contacts',
    },
    {
      icon: ImageIcon,
      title: 'Status Updates',
      description: 'Share your moments with 24-hour status posts',
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description: '100% anonymous, no phone numbers required',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Instant messaging powered by Web3 technology',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4 flex items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 dark:bg-primary-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-500/10 dark:bg-primary-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-4xl w-full relative z-10">
        <button
          onClick={() => router.push('/')}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-gray-200/50 dark:border-gray-700/50"
          >
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
              >
                <MessageCircle className="w-10 h-10 text-white" />
              </motion.div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                PolyChat
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Your Web3 messaging platform
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Features
              </h3>
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-start space-x-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {feature.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Wallet Connection Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-gray-200/50 dark:border-gray-700/50"
          >
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                <Wallet className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Connect Wallet
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Connect your Web3 wallet to get started
              </p>
            </div>

            {!connected ? (
              <div className="space-y-4">
                <button
                  onClick={connectMetaMask}
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Wallet className="w-5 h-5" />
                  <span>{loading ? 'Connecting...' : 'Connect MetaMask'}</span>
                </button>

                <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Don't have MetaMask?{' '}
                  <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Download here
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="font-semibold text-green-900 dark:text-green-100">
                      Wallet Connected
                    </span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300 font-mono">
                    {formatAddress(address)}
                  </p>
                </div>

                <button
                  onClick={signMessage}
                  disabled={signing}
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                >
                  {signing ? 'Signing...' : 'Verify Signature & Continue'}
                </button>

                <button
                  onClick={disconnect}
                  className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white py-2"
                >
                  Disconnect
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

