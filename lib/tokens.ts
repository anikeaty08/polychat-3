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

export function getNativeToken(): PaymentToken {
  const symbol = (process.env.NEXT_PUBLIC_NATIVE_SYMBOL || 'MATIC').trim() || 'MATIC';
  return { kind: 'native', symbol, name: symbol, decimals: 18 };
}

export function getPaymentTokens(): PaymentToken[] {
  const tokens: PaymentToken[] = [getNativeToken()];

  const usdc = asAddress(process.env.NEXT_PUBLIC_TOKEN_USDC_ADDRESS);
  if (usdc) tokens.push({ kind: 'erc20', symbol: 'USDC', name: 'USD Coin', address: usdc, decimals: 6 });

  const usdt = asAddress(process.env.NEXT_PUBLIC_TOKEN_USDT_ADDRESS);
  if (usdt) tokens.push({ kind: 'erc20', symbol: 'USDT', name: 'Tether USD', address: usdt, decimals: 6 });

  const dai = asAddress(process.env.NEXT_PUBLIC_TOKEN_DAI_ADDRESS);
  if (dai) tokens.push({ kind: 'erc20', symbol: 'DAI', name: 'Dai Stablecoin', address: dai, decimals: 18 });

  return tokens;
}

