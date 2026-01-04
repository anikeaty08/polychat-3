import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from './supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthPayload {
  userId: string;
  walletAddress: string;
}

export function generateChallenge(address: string): string {
  const timestamp = Date.now();
  return `Sign this message to authenticate with Polychat.\n\nAddress: ${address}\nTimestamp: ${timestamp}`;
}

export async function verifyWalletSignature(
  address: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

export async function getOrCreateUser(walletAddress: string) {
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress.toLowerCase())
    .maybeSingle();

  if (existingUser) {
    await supabaseAdmin
      .from('users')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', existingUser.id);

    return existingUser;
  }

  const { data: newUser, error } = await supabaseAdmin
    .from('users')
    .insert({
      wallet_address: walletAddress.toLowerCase(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  await supabaseAdmin.from('privacy_settings').insert({
    user_id: newUser.id,
  });

  return newUser;
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): AuthPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export async function getUserFromToken(token: string) {
  const payload = verifyToken(token);
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', payload.userId)
    .single();

  return user;
}
