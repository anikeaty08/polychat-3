import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { connectDB, toApi } from './db';
import { User, PrivacySettings } from './models';

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
  await connectDB();

  const existingUser = await User.findOne({ wallet_address: walletAddress.toLowerCase() });

  if (existingUser) {
    existingUser.last_seen = new Date();
    await existingUser.save();
    return toApi(existingUser)!;
  }

  const newUser = await User.create({
    wallet_address: walletAddress.toLowerCase(),
  });

  await PrivacySettings.create({ user_id: newUser._id });

  return toApi(newUser)!;
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
  await connectDB();

  const user = await User.findById(payload.userId);
  return user ? toApi(user) : null;
}
