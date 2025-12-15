"use client";

import { useEffect, useState } from "react";
import { Shield, Lock } from "lucide-react";

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 300);
          return 100;
        }
        return prev + 5;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-black via-[#020617] to-black">
      <div className="relative flex flex-col items-center gap-8 animate-fade-in">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse-slow">
            <div className="h-32 w-32 rounded-full bg-violet-600/30 blur-3xl" />
          </div>
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-2 border-violet-600/50 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 backdrop-blur-xl">
            <Shield className="h-16 w-16 text-violet-400 animate-pulse" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">
            Polygon Chat
          </h1>
          <div className="flex items-center gap-2 rounded-full border border-emerald-600/30 bg-emerald-600/10 px-3 py-1.5">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-300">
              End-to-End Encrypted
            </span>
          </div>
        </div>

        <div className="w-64">
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900/80 backdrop-blur-sm">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-zinc-500">
            Initializing secure connection...
          </p>
        </div>
      </div>
    </div>
  );
}
