'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { getNativeToken, getPaymentTokens, type PaymentToken } from '@/lib/tokens';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { ArrowLeft, Coins, Copy, ExternalLink, Plus, ShieldCheck, Wallet } from 'lucide-react';
import NetworkSwitcher, { type SupportedChainId } from '@/components/NetworkSwitcher';

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

function formatAmount(value: bigint, decimals: number, maxFraction = 6) {
  const s = ethers.formatUnits(value, decimals);
  const [i, f = ''] = s.split('.');
  if (!f) return i;
  return `${i}.${f.slice(0, maxFraction)}`.replace(/\.$/, '');
}

function PaymentsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token } = useAuthStore();

  const tokenKey = (t: PaymentToken) => (t.kind === 'native' ? `native:${t.symbol}` : t.address.toLowerCase());

  const [selectedTokenKey, setSelectedTokenKey] = useState<string>('');
  const [customTokens, setCustomTokens] = useState<PaymentToken[]>([]);
  const [customTokenAddress, setCustomTokenAddress] = useState('');
  const [addingToken, setAddingToken] = useState(false);

  const [payments, setPayments] = useState<any[]>([]);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('0.01');
  const [loading, setLoading] = useState(false);
  const [senderAddress, setSenderAddress] = useState<string>('');
  const [nativeBalance, setNativeBalance] = useState<bigint>(0n);
  const [tokenBalance, setTokenBalance] = useState<bigint>(0n);
  const [chainId, setChainId] = useState<number | null>(null);
  const [preferredChainId, setPreferredChainId] = useState<SupportedChainId>(80002);

  const baseTokens = useMemo(() => getPaymentTokens(chainId), [chainId]);

  useEffect(() => {
    const effective = chainId ?? preferredChainId;
    try {
      const raw = window.localStorage.getItem(`polychat-custom-tokens:${effective}`);
      if (!raw) {
        setCustomTokens([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setCustomTokens([]);
        return;
      }
      const safe: PaymentToken[] = parsed
        .filter((t) => t && t.kind === 'erc20' && typeof t.address === 'string' && ethers.isAddress(t.address))
        .map((t) => ({
          kind: 'erc20' as const,
          symbol: String(t.symbol || 'TOKEN').slice(0, 12),
          name: String(t.name || t.symbol || 'Token').slice(0, 48),
          address: ethers.getAddress(t.address) as `0x${string}`,
          decimals: typeof t.decimals === 'number' ? t.decimals : undefined,
        }));
      setCustomTokens(safe);
    } catch {
      setCustomTokens([]);
    }
  }, [chainId, preferredChainId]);

  const tokens = useMemo(() => {
    const merged: PaymentToken[] = [...baseTokens];
    for (const t of customTokens) {
      if (t.kind !== 'erc20') continue;
      const exists = merged.some((m) => m.kind === 'erc20' && m.address.toLowerCase() === t.address.toLowerCase());
      if (!exists) merged.push(t);
    }
    return merged;
  }, [baseTokens, customTokens]);

  useEffect(() => {
    if (!tokens.length) return;
    if (!selectedTokenKey) {
      setSelectedTokenKey(tokenKey(tokens[0]));
      return;
    }

    // Back-compat: if query param provided a symbol, map it to the first matching token option.
    const symbolMatch = tokens.find((t) => t.symbol === selectedTokenKey);
    if (symbolMatch) {
      setSelectedTokenKey(tokenKey(symbolMatch));
      return;
    }

    if (!tokens.some((t) => tokenKey(t) === selectedTokenKey)) setSelectedTokenKey(tokenKey(tokens[0]));
  }, [tokens, selectedTokenKey]);

  const selectedToken: PaymentToken | undefined = useMemo(
    () => tokens.find((t) => tokenKey(t) === selectedTokenKey) || tokens[0],
    [tokens, selectedTokenKey]
  );

  useEffect(() => {
    if (!user || !token) {
      router.push('/auth/wallet');
      return;
    }

    try {
      const saved = window.localStorage.getItem('polychat-preferred-chain');
      if (saved === '137' || saved === '80002') setPreferredChainId(Number(saved) as SupportedChainId);
    } catch {
      // ignore
    }

    const to = searchParams.get('to');
    if (to && ethers.isAddress(to)) setRecipientAddress(to);
    const a = searchParams.get('amount');
    if (a && !Number.isNaN(Number(a))) setAmount(a);
    const sym = searchParams.get('token');
    if (sym) setSelectedTokenKey(sym);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const getProvider = () => {
    const eth = (window as any).ethereum;
    if (!eth) return null;
    return new ethers.BrowserProvider(eth);
  };

  const refreshWalletState = async () => {
    const provider = getProvider();
    if (!provider) return;

    try {
      const accounts: string[] = await provider.send('eth_accounts', []);
      if (!accounts?.length) {
        router.push('/auth/wallet');
        return;
      }
      const addr = ethers.getAddress(accounts[0]);
      setSenderAddress(addr);

      const net = await provider.getNetwork();
      setChainId(Number(net.chainId));

      const bal = await provider.getBalance(addr);
      setNativeBalance(bal);

      if (selectedToken?.kind === 'erc20') {
        const c = new ethers.Contract(selectedToken.address, ERC20_ABI, provider);
        const b: bigint = await c.balanceOf(addr);
        setTokenBalance(b);
      } else {
        setTokenBalance(0n);
      }
    } catch (error) {
      console.error('Failed to refresh wallet state:', error);
    }
  };

  const addCustomToken = async () => {
    if (addingToken) return;
    const provider = getProvider();
    if (!provider) {
      toast.error('Connect a wallet first');
      return;
    }

    const effectiveChainId = chainId ?? preferredChainId;
    const addr = customTokenAddress.trim();
    if (!ethers.isAddress(addr)) {
      toast.error('Enter a valid token address');
      return;
    }

    try {
      setAddingToken(true);
      const checksummed = ethers.getAddress(addr) as `0x${string}`;
      const exists = tokens.some((t) => t.kind === 'erc20' && t.address.toLowerCase() === checksummed.toLowerCase());
      if (exists) {
        toast.success('Token already added');
        setCustomTokenAddress('');
        return;
      }

      const c = new ethers.Contract(checksummed, ERC20_ABI, provider);
      const [symbol, decimals] = await Promise.all([c.symbol(), c.decimals()]);
      const tokenObj: PaymentToken = {
        kind: 'erc20',
        symbol: String(symbol || 'TOKEN').slice(0, 12),
        name: String(symbol || 'Token').slice(0, 48),
        address: checksummed,
        decimals: Number(decimals),
      };

      const next = [...customTokens, tokenObj];
      setCustomTokens(next);
      window.localStorage.setItem(`polychat-custom-tokens:${effectiveChainId}`, JSON.stringify(next));
      setCustomTokenAddress('');
      toast.success(`Added ${tokenObj.symbol}`);
    } catch (error: any) {
      console.error('Add token error:', error);
      toast.error(error?.message || 'Failed to add token');
    } finally {
      setAddingToken(false);
    }
  };

  const loadPayments = async () => {
    try {
      const response = await fetch('/api/payments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error('Failed to load payments:', error);
    }
  };

  useEffect(() => {
    if (!user || !token) return;
    loadPayments();
  }, [user, token]);

  useEffect(() => {
    if (!user || !token) return;
    refreshWalletState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTokenKey]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const getChainLabel = (id: number | null) => {
    if (id === 137) return 'Polygon Mainnet';
    if (id === 80002) return 'Polygon Amoy';
    return id ? `Chain ${id}` : 'Wallet';
  };

  const switchChain = async (targetChainId: number) => {
    const eth = (window as any).ethereum;
    if (!eth?.request) return false;
    const hex = `0x${targetChainId.toString(16)}`;
    try {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] });
      return true;
    } catch (error: any) {
      // If the chain is not added, try to add it (best-effort)
      if (error?.code === 4902) {
        try {
          if (targetChainId === 137) {
            await eth.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: hex,
                  chainName: 'Polygon Mainnet',
                  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
                  rpcUrls: [process.env.NEXT_PUBLIC_POLYGON_MAINNET_RPC || 'https://polygon-rpc.com'],
                  blockExplorerUrls: ['https://polygonscan.com'],
                },
              ],
            });
            return true;
          }
          if (targetChainId === 80002) {
            await eth.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: hex,
                  chainName: 'Polygon Amoy',
                  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                  rpcUrls: [process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC || 'https://rpc-amoy.polygon.technology'],
                  blockExplorerUrls: ['https://amoy.polygonscan.com'],
                },
              ],
            });
            return true;
          }
        } catch (addError) {
          console.error('Add chain failed:', addError);
        }
      }
      console.error('Switch chain failed:', error);
      return false;
    }
  };

  const handleSend = async () => {
    if (!user || !token) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!selectedToken) {
      toast.error('Select a token');
      return;
    }

    if (!recipientAddress || !ethers.isAddress(recipientAddress)) {
      toast.error('Enter a valid recipient address');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    const provider = getProvider();
    if (!provider) {
      toast.error('No wallet detected (MetaMask)');
      return;
    }

    try {
      setLoading(true);
      toast.loading('Preparing transaction…', { id: 'payment' });

      const net = await provider.getNetwork();
      const currentChain = Number(net.chainId);
      if (currentChain !== preferredChainId) {
        toast.loading('Switching network…', { id: 'payment' });
        const switched = await switchChain(preferredChainId);
        if (!switched) {
          toast.error('Network switch failed', { id: 'payment' });
          setLoading(false);
          return;
        }
      }

      const net2 = await provider.getNetwork();
      const currentChain2 = Number(net2.chainId);
      if (currentChain2 !== 137 && currentChain2 !== 80002) {
        toast.error('Unsupported network. Switch to Polygon Mainnet or Amoy.', { id: 'payment' });
        setLoading(false);
        return;
      }

      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const from = await signer.getAddress();

      const to = ethers.getAddress(recipientAddress);

      let txHash: string;
      let amountBaseUnits: bigint;
      let tokenAddress: string | null = null;
      let tokenSymbol: string = selectedToken.symbol;

      if (selectedToken.kind === 'native') {
        amountBaseUnits = ethers.parseEther(amount);
        toast.loading(`Sending ${amount} ${selectedToken.symbol}…`, { id: 'payment' });
        const tx = await signer.sendTransaction({ to, value: amountBaseUnits });
        const receipt = await tx.wait();
        if (!receipt) throw new Error('Transaction not confirmed');
        txHash = receipt.hash;
      } else {
        const c = new ethers.Contract(selectedToken.address, ERC20_ABI, signer);
        const decimals: number = selectedToken.decimals ?? Number(await c.decimals());
        tokenSymbol = (await c.symbol()).toString() || selectedToken.symbol;
        amountBaseUnits = ethers.parseUnits(amount, decimals);
        tokenAddress = selectedToken.address;

        toast.loading(`Sending ${amount} ${tokenSymbol}…`, { id: 'payment' });
        const tx = await c.transfer(to, amountBaseUnits);
        const receipt = await tx.wait();
        if (!receipt) throw new Error('Transaction not confirmed');
        txHash = receipt.hash;
      }

      toast.loading('Verifying on Amoy…', { id: 'payment' });

      const recordResponse = await fetch('/api/payments/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transactionHash: txHash,
          amount: amountBaseUnits.toString(),
          recipientAddress: to,
          paymentPlatform: 'metamask',
          tokenAddress,
          tokenSymbol,
          chainId: currentChain2,
          fromAddress: from,
        }),
      });

      const data = await recordResponse.json().catch(() => ({}));
      if (!recordResponse.ok) {
        throw new Error(data.error || 'Failed to record payment');
      }

      if (data?.payment?.status === 'failed') {
        toast.error('Verification failed', { id: 'payment' });
      } else {
        toast.success('Payment confirmed!', { id: 'payment' });
      }

      setRecipientAddress('');
      setAmount(selectedToken.kind === 'native' ? '0.01' : '1');
      await loadPayments();
      await refreshWalletState();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error?.message || 'Payment failed', { id: 'payment' });
    } finally {
      setLoading(false);
    }
  };

  const explorerBase = chainId === 80002 ? 'https://amoy.polygonscan.com' : 'https://polygonscan.com';

  const balanceLine = useMemo(() => {
    if (!selectedToken) return '';
    if (selectedToken.kind === 'native') {
      return `${formatAmount(nativeBalance, 18, 6)} ${selectedToken.symbol}`;
    }
    const dec = selectedToken.decimals ?? 18;
    return `${formatAmount(tokenBalance, dec, 6)} ${selectedToken.symbol}`;
  }, [selectedToken, nativeBalance, tokenBalance]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="glass-card border-b border-gray-200/30 dark:border-gray-700/30 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/chats')}
              className="p-2.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 rounded-xl transition-all active:scale-95"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">Payments</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {getChainLabel(chainId)}
                  {senderAddress ? ` • ${senderAddress.slice(0, 6)}…${senderAddress.slice(-4)}` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NetworkSwitcher
              value={preferredChainId}
              onChange={(id) => {
                setPreferredChainId(id);
                try {
                  window.localStorage.setItem('polychat-preferred-chain', String(id));
                } catch {
                  // ignore
                }
                switchChain(id).finally(() => refreshWalletState());
              }}
            />
            <button
              onClick={refreshWalletState}
              className="px-3 py-2 rounded-xl bg-white/60 dark:bg-gray-900/40 hover:bg-white/80 dark:hover:bg-gray-900/60 text-sm font-semibold text-gray-800 dark:text-gray-100 transition-all active:scale-95"
              title="Refresh"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Send Card */}
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="px-6 py-5 bg-gradient-to-r from-emerald-600/10 to-teal-600/10 dark:from-emerald-600/20 dark:to-teal-600/10 border-b border-gray-200/30 dark:border-gray-700/30">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Coins className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">Send</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Direct wallet-to-wallet transfer</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{balanceLine}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Token</label>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomTokenAddress('');
                      setAddingToken(false);
                    }}
                    className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white inline-flex items-center gap-1"
                    title="Add custom ERC-20 token"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add token
                  </button>
                </div>
                <select
                  value={selectedTokenKey}
                  onChange={(e) => setSelectedTokenKey(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                >
                  {tokens.map((t) => (
                    <option key={tokenKey(t)} value={tokenKey(t)}>
                      {t.symbol} {t.kind === 'erc20' ? '• ERC-20' : '• Native'}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={customTokenAddress}
                    onChange={(e) => setCustomTokenAddress(e.target.value)}
                    placeholder="Add ERC-20 token address (0x...)"
                    className="flex-1 px-4 py-2.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={addCustomToken}
                    disabled={addingToken || !customTokenAddress.trim()}
                    className="px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-gray-900/40 hover:bg-white/90 dark:hover:bg-gray-900/60 text-gray-900 dark:text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingToken ? 'Adding…' : 'Add'}
                  </button>
                </div>
                {selectedToken?.kind === 'erc20' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-mono">
                    {selectedToken.address.slice(0, 10)}…{selectedToken.address.slice(-8)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Amount</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.000001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                  placeholder="0.00"
                />
                <div className="flex gap-2 mt-2">
                  {['0.01', '0.1', '1'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(v)}
                      className="px-3 py-1.5 rounded-xl bg-white/60 dark:bg-gray-900/40 hover:bg-white/80 dark:hover:bg-gray-900/60 text-xs font-semibold text-gray-800 dark:text-gray-100 transition-all active:scale-95"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Recipient</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value.trim())}
                  className="flex-1 px-4 py-3 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all font-mono text-sm"
                  placeholder="0x..."
                />
                <button
                  type="button"
                  onClick={() => handleCopy(recipientAddress)}
                  disabled={!recipientAddress}
                  className="px-4 py-3 rounded-2xl bg-white/60 dark:bg-gray-900/40 hover:bg-white/80 dark:hover:bg-gray-900/60 text-gray-800 dark:text-gray-100 transition-all active:scale-95 disabled:opacity-50"
                  title="Copy"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Tip: open a contact profile to copy their wallet address.
              </p>
            </div>

            <button
              onClick={handleSend}
              disabled={loading || !recipientAddress || !amount || !selectedToken}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing…' : `Send ${amount} ${selectedToken?.symbol || ''}`}
            </button>

            <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
              <ShieldCheck className="w-4 h-4 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <p>
                Payments are verified against your configured network RPC (default Amoy).
              </p>
            </div>
          </div>
        </div>

        {/* History */}
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="px-6 py-5 bg-gradient-to-r from-emerald-600/10 to-cyan-600/10 dark:from-emerald-600/20 dark:to-cyan-600/10 border-b border-gray-200/30 dark:border-gray-700/30">
            <p className="font-bold text-gray-900 dark:text-white">History</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Last 50 payments</p>
          </div>

          <div className="p-3">
            {payments.length === 0 ? (
              <div className="p-8 text-center text-gray-600 dark:text-gray-400 font-medium">No payments yet</div>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => {
                  const sym = p.token_symbol || getNativeToken(p.chain_id).symbol;
                  const isErc20 = !!p.token_address;
                  const dec =
                    sym === 'USDC' || sym === 'USDT' ? 6 : 18;
                  const txExplorerBase = Number(p.chain_id) === 80002 ? 'https://amoy.polygonscan.com' : 'https://polygonscan.com';
                  const amt = (() => {
                    try {
                      return formatAmount(BigInt(p.amount || '0'), dec, 6);
                    } catch {
                      return '0';
                    }
                  })();

                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl hover:bg-white/40 dark:hover:bg-gray-900/30 transition-all"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {amt} {sym}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono">
                          to {String(p.recipient_address || '').slice(0, 10)}…{String(p.recipient_address || '').slice(-8)}
                          {isErc20 ? ' • ERC-20' : ''}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {p.status} • {p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}
                        </p>
                      </div>
                      {p.transaction_hash && (
                        <a
                          className="px-3 py-2 rounded-xl bg-white/60 dark:bg-gray-900/40 hover:bg-white/80 dark:hover:bg-gray-900/60 text-gray-900 dark:text-white text-sm font-semibold transition-all active:scale-95 flex items-center gap-2"
                          href={`${txExplorerBase}/tx/${p.transaction_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span>Tx</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense>
      <PaymentsInner />
    </Suspense>
  );
}
