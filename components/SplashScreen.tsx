'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Fingerprint, Lock, MessageCircle, Phone, Shield, Wallet, Zap } from 'lucide-react';

export default function SplashScreen() {
  const router = useRouter();

  const features = [
    { icon: MessageCircle, title: 'Secure Messaging', description: 'End-to-end encrypted messages' },
    { icon: Phone, title: 'Voice & Video Calls', description: 'Encrypted calls (WebRTC)' },
    { icon: Shield, title: 'Privacy First', description: 'No phone numbers required' },
    { icon: Wallet, title: 'Web3 Payments', description: 'Wallet-to-wallet (USDC/USDT/DAI + custom)' },
    { icon: Lock, title: 'Zero Knowledge', description: 'Your data stays yours' },
    { icon: Zap, title: 'Fast UX', description: 'Built for mobile + desktop' },
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [0, -30, 0], x: [0, 20, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-10 right-10 w-72 h-72 bg-gradient-to-br from-emerald-500/15 to-teal-600/15 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 22, 0], x: [0, -16, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-10 left-10 w-96 h-96 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-full blur-3xl"
        />
        <div className="absolute inset-0 dots-pattern opacity-40" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          {/* Left: hero */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 flex items-center justify-center">
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              <div className="encrypted-badge">
                <Lock className="w-3 h-3" />
                <span>End-to-end encrypted</span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="mt-6 text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white"
            >
              PolyChat
              <span className="block text-xl md:text-2xl font-semibold text-gray-600 dark:text-gray-300 mt-3">
                Connect. Chat. Stay Private.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mt-5 text-gray-600 dark:text-gray-300 text-base md:text-lg max-w-xl"
            >
              A WhatsApp-style experience with wallet login, encrypted messaging, calls, and wallet-to-wallet payments on Polygon (Mainnet + Amoy).
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mt-7 flex flex-col sm:flex-row gap-3"
            >
              <button
                onClick={() => router.push('/auth/wallet')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.99]"
              >
                Connect Wallet
              </button>
              <button
                onClick={() => router.push('/auth/wallet')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white/70 dark:bg-gray-900/40 hover:bg-white/90 dark:hover:bg-gray-900/60 text-gray-900 dark:text-white font-semibold transition-all inline-flex items-center justify-center gap-2"
              >
                <Fingerprint className="w-4 h-4" />
                I already have an account
              </button>
            </motion.div>
          </div>

          {/* Right: feature cards */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7 }}
            className="glass-card rounded-[2rem] p-6 md:p-8"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-3xl p-4 bg-white/60 dark:bg-gray-900/30 border border-gray-200/40 dark:border-gray-700/40 hover:bg-white/80 dark:hover:bg-gray-900/45 transition-all"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/15 flex items-center justify-center mb-3">
                    <f.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white">{f.title}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{f.description}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Tip: for production calls, configure TURN in `.env`.</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

