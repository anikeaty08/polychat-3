export type PaymentToken =
  | {
      kind: 'native';
      symbol: string;
      name: string;
      decimals: 18;
    }
  | {
      kind: 'erc20';
      symbol: string;
      name: string;
      address: `0x${string}`;
      decimals?: number;
    };

function asAddress(val: string | undefined | null): `0x${string}` | null {
  if (!val) return null;
  const v = val.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(v)) return null;
  return v as `0x${string}`;
}

export function getNativeToken(chainId?: number | null): PaymentToken {
  const key =
    chainId === 137 ? 'NEXT_PUBLIC_POLYGON_NATIVE_SYMBOL' : chainId === 80002 ? 'NEXT_PUBLIC_AMOY_NATIVE_SYMBOL' : 'NEXT_PUBLIC_NATIVE_SYMBOL';
  const symbol = (process.env as any)[key] || process.env.NEXT_PUBLIC_NATIVE_SYMBOL || (chainId === 137 ? 'POL' : 'MATIC');
  const normalized = String(symbol).trim() || (chainId === 137 || chainId === 80002 ? 'POL' : 'MATIC');
  return { kind: 'native', symbol: normalized, name: normalized, decimals: 18 };
}

export function getPaymentTokens(chainId?: number | null): PaymentToken[] {
  const tokens: PaymentToken[] = [getNativeToken(chainId)];

  // Polygon mainnet defaults (can be overridden by env)
  const polygonUsdcDefault = '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359';
  const polygonUsdtDefault = '0xc2132d05d31c914a87c6611c10748aeb04b58e8f';
  const polygonDaiDefault = '0x8f3cf7ad23cd3cadbd9735af958023239c6a063';

  const envPrefix = chainId === 137 ? 'NEXT_PUBLIC_POLYGON_TOKEN_' : chainId === 80002 ? 'NEXT_PUBLIC_AMOY_TOKEN_' : 'NEXT_PUBLIC_TOKEN_';

  const usdc =
    asAddress((process.env as any)[`${envPrefix}USDC_ADDRESS`]) ||
    (chainId === 137 ? (polygonUsdcDefault as `0x${string}`) : null);
  if (usdc) tokens.push({ kind: 'erc20', symbol: 'USDC', name: 'USD Coin', address: usdc, decimals: 6 });

  const usdt =
    asAddress((process.env as any)[`${envPrefix}USDT_ADDRESS`]) ||
    (chainId === 137 ? (polygonUsdtDefault as `0x${string}`) : null);
  if (usdt) tokens.push({ kind: 'erc20', symbol: 'USDT', name: 'Tether USD', address: usdt, decimals: 6 });

  const dai =
    asAddress((process.env as any)[`${envPrefix}DAI_ADDRESS`]) ||
    (chainId === 137 ? (polygonDaiDefault as `0x${string}`) : null);
  if (dai) tokens.push({ kind: 'erc20', symbol: 'DAI', name: 'Dai Stablecoin', address: dai, decimals: 18 });

  return tokens;
}
