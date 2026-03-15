'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, Globe, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SupportedChainId = 137 | 80002;

type ChainOption = {
  id: SupportedChainId;
  label: string;
  explorer: string;
};

const CHAINS: ChainOption[] = [
  { id: 137, label: 'Polygon Mainnet', explorer: 'https://polygonscan.com' },
  { id: 80002, label: 'Polygon Amoy', explorer: 'https://amoy.polygonscan.com' },
];

export default function NetworkSwitcher({
  value,
  onChange,
  disabled,
  className,
}: {
  value: SupportedChainId;
  onChange: (chainId: SupportedChainId) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = useMemo(() => CHAINS.find((c) => c.id === value) || CHAINS[0], [value]);

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'px-3 py-2 rounded-xl bg-white/60 dark:bg-gray-900/40 hover:bg-white/80 dark:hover:bg-gray-900/60',
          'text-sm font-semibold text-gray-800 dark:text-gray-100 transition-all active:scale-95',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'inline-flex items-center gap-2'
        )}
        title="Switch network"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{current.label}</span>
        <span className="sm:hidden">{value === 137 ? 'Mainnet' : 'Amoy'}</span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-label="Close"
          />
          <div className="absolute right-0 mt-2 w-64 z-50 glass-card rounded-2xl shadow-2xl overflow-hidden border border-gray-200/30 dark:border-gray-700/30">
            <div className="px-4 py-3 border-b border-gray-200/30 dark:border-gray-700/30">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Network</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Choose where payments are sent</p>
            </div>
            <div className="p-2">
              {CHAINS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full px-3 py-2.5 rounded-xl text-left hover:bg-gray-100/80 dark:hover:bg-gray-700/60',
                    'transition-all flex items-center justify-between gap-3'
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{c.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.explorer}</p>
                  </div>
                  {c.id === value ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      <Check className="w-4 h-4" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs font-semibold">
                      <Shield className="w-4 h-4" />
                      Switch
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

