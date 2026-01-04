'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageCircle, Shield, Wallet, Lock, Phone, Mic, Image as ImageIcon, Zap, Eye, EyeOff, Fingerprint } from 'lucide-react';

export default function SplashScreen() {
  const router = useRouter();

  const features = [
    {
      icon: MessageCircle,
      title: 'Secure Messaging',
      description: 'End-to-end encrypted messages',
      color: 'from-violet-500 to-purple-600',
    },
    {
      icon: Phone,
      title: 'Voice & Video Calls',
      description: 'Crystal-clear encrypted calls',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'No phone numbers required',
      color: 'from-rose-500 to-pink-600',
    },
    {
      icon: Wallet,
      title: 'Web3 Powered',
      description: 'Connect with your crypto wallet',
      color: 'from-amber-500 to-orange-600',
    },
    {
      icon: Lock,
      title: 'Zero Knowledge',
      description: 'Your data stays yours forever',
      color: 'from-cyan-500 to-blue-600',
    },
    {
      icon: EyeOff,
      title: 'Anonymous Mode',
      description: 'Chat without revealing identity',
      color: 'from-indigo-500 to-violet-600',
    },
  ];

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Orbs */}
        <motion.div 
          animate={{ 
            y: [0, -30, 0],
            x: [0, 20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-br from-violet-500/20 to-purple-600/20 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ 
            y: [0, 20, 0],
            x: [0, -15, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-pink-500/15 to-rose-600/15 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ 
            y: [0, -20, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/10 to-cyan-600/10 rounded-full blur-3xl"
        />
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 dots-pattern opacity-50" />
      </div>
      
      {/* Main Card with 3D Effect */}
      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
        className="max-w-md w-full relative z-10"
        style={{ perspective: '1000px' }}
      >
        <div className="glass-card rounded-[2rem] p-8 transform-gpu hover:scale-[1.02] transition-transform duration-500">
          {/* Logo Section */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: 'spring', bounce: 0.5 }}
              className="relative w-24 h-24 mx-auto mb-6"
            >
              {/* Outer Ring Animation */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-dashed border-violet-400/30"
              />
              {/* Inner Glow */}
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-500 shadow-lg shadow-violet-500/50 animate-glow" />
              {/* Icon */}
              <div className="absolute inset-2 rounded-full flex items-center justify-center">
                <MessageCircle className="w-12 h-12 text-white drop-shadow-lg" />
              </div>
              {/* Sparkles */}
              <motion.div 
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50"
              />
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-4xl font-bold mb-3 gradient-text"
            >
              PolyChat
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-gray-600 dark:text-gray-400 text-lg font-medium"
            >
              Connect. Chat. Stay Private.
            </motion.p>
            
            {/* Privacy Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="encrypted-badge mx-auto mt-4"
            >
              <Lock className="w-3 h-3" />
              <span>End-to-End Encrypted</span>
            </motion.div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.08 }}
                whileHover={{ scale: 1.05, y: -2 }}
                className="group relative p-4 rounded-2xl bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-violet-300/50 dark:hover:border-violet-600/50"
              >
                {/* Gradient Overlay on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-2 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-0.5">
                  {feature.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/auth/wallet')}
              className="w-full relative group overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40"
            >
              {/* Button Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <span className="relative flex items-center justify-center gap-2">
                <Wallet className="w-5 h-5" />
                Connect Wallet
              </span>
            </motion.button>
            
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              onClick={() => router.push('/auth/wallet')}
              className="w-full text-violet-600 dark:text-violet-400 font-medium py-3 hover:text-violet-700 dark:hover:text-violet-300 transition-colors flex items-center justify-center gap-2"
            >
              <Fingerprint className="w-4 h-4" />
              Already have an account?
            </motion.button>
          </div>
        </div>

        {/* Bottom Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="text-center mt-6 text-sm text-gray-500 dark:text-gray-500"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>Secured by Polygon Blockchain</span>
          </div>
          <p className="text-xs">No phone number • No email • 100% Anonymous</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
