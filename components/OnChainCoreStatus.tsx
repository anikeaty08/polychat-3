'use client';

import { CheckCircle, AlertTriangle, Shield } from 'lucide-react';

interface OnChainCoreStatusProps {
  compact?: boolean;
}

export default function OnChainCoreStatus({ compact = false }: OnChainCoreStatusProps) {
  const paymentEscrowAddress = process.env.NEXT_PUBLIC_PAYMENT_ESCROW_ADDRESS;
  const userRegistryAddress = process.env.NEXT_PUBLIC_USER_REGISTRY_ADDRESS;
  const messagingContractAddress = process.env.NEXT_PUBLIC_MESSAGING_CONTRACT_ADDRESS;
  const callsContractAddress = process.env.NEXT_PUBLIC_CALLS_CONTRACT_ADDRESS;
  const statusContractAddress = process.env.NEXT_PUBLIC_STATUS_CONTRACT_ADDRESS;

  const allConfigured =
    !!paymentEscrowAddress &&
    !!userRegistryAddress &&
    !!messagingContractAddress &&
    !!callsContractAddress &&
    !!statusContractAddress;

  if (compact) {
    return (
      <div className="flex items-center justify-center px-3 py-1.5 rounded-full bg-gray-900/5 dark:bg-gray-100/5 border border-gray-200/40 dark:border-gray-700/60 text-[11px] text-gray-700 dark:text-gray-300 gap-2">
        <Shield className="w-3 h-3 text-violet-500" />
        <span className="uppercase tracking-wide">On‑chain core</span>
        {allConfigured ? (
          <span className="flex items-center gap-1 text-emerald-500">
            <CheckCircle className="w-3 h-3" />
            <span>Healthy</span>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-amber-500">
            <AlertTriangle className="w-3 h-3" />
            <span>Check config</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600/10 to-violet-500/10 dark:from-indigo-600/20 dark:to-violet-500/20 px-6 py-4 border-b border-gray-200/30 dark:border-gray-700/30">
        <div className="flex items-center space-x-3">
          <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="font-bold text-gray-900 dark:text-white">Web3 / On‑Chain Core</h2>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {allConfigured ? (
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                On‑chain core status
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {allConfigured
                  ? 'All contract addresses are configured.'
                  : 'One or more contract addresses are missing.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-500">
              Payment Escrow
            </p>
            <p className="font-mono text-[11px] text-gray-800 break-all dark:text-gray-200">
              {paymentEscrowAddress || 'Not configured'}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-500">
              User Registry
            </p>
            <p className="font-mono text-[11px] text-gray-800 break-all dark:text-gray-200">
              {userRegistryAddress || 'Not configured'}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-500">
              Messaging Contract
            </p>
            <p className="font-mono text-[11px] text-gray-800 break-all dark:text-gray-200">
              {messagingContractAddress || 'Not configured'}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-500">
              Calls Contract
            </p>
            <p className="font-mono text-[11px] text-gray-800 break-all dark:text-gray-200">
              {callsContractAddress || 'Not configured'}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-500">
              Status Contract
            </p>
            <p className="font-mono text-[11px] text-gray-800 break-all dark:text-gray-200">
              {statusContractAddress || 'Not configured'}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
          Never paste private keys here. Only public contract addresses should be visible in the app.
        </p>
      </div>
    </div>
  );
}

