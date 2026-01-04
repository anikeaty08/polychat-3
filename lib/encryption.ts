import nacl from 'tweetnacl';
import { decodeUTF8, encodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util';

export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

/**
 * Generate a new key pair for E2E encryption
 */
export function generateKeyPair(): KeyPair {
  return nacl.box.keyPair();
}

/**
 * Convert key pair to base64 strings for storage
 */
export function keyPairToBase64(keyPair: KeyPair): {
  publicKey: string;
  secretKey: string;
} {
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
}

/**
 * Convert base64 strings back to key pair
 */
export function base64ToKeyPair(publicKey: string, secretKey: string): KeyPair {
  return {
    publicKey: decodeBase64(publicKey),
    secretKey: decodeBase64(secretKey),
  };
}

/**
 * Encrypt a message using recipient's public key and sender's secret key
 */
export function encryptMessage(
  message: string,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array
): string {
  const nonce = nacl.randomBytes(24);
  const messageBytes = decodeUTF8(message);
  const encrypted = nacl.box(messageBytes, nonce, recipientPublicKey, senderSecretKey);
  
  if (!encrypted) {
    throw new Error('Encryption failed');
  }

  // Combine nonce and encrypted message
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);

  return encodeBase64(combined);
}

/**
 * Decrypt a message using sender's public key and recipient's secret key
 */
export function decryptMessage(
  encryptedMessage: string,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array
): string {
  try {
    const combined = decodeBase64(encryptedMessage);
    const nonce = combined.slice(0, 24);
    const encrypted = combined.slice(24);

    const decrypted = nacl.box.open(encrypted, nonce, senderPublicKey, recipientSecretKey);
    
    if (!decrypted) {
      throw new Error('Decryption failed');
    }

    return encodeUTF8(decrypted);
  } catch (error) {
    throw new Error('Failed to decrypt message');
  }
}

/**
 * Encrypt file/blob data
 */
export async function encryptFile(
  file: File | Blob,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const fileBytes = new Uint8Array(arrayBuffer);
  const fileString = encodeBase64(fileBytes);
  return encryptMessage(fileString, recipientPublicKey, senderSecretKey);
}

/**
 * Decrypt file/blob data
 */
export function decryptFile(
  encryptedFile: string,
  senderPublicKey: Uint8Array,
  recipientSecretKey: Uint8Array
): Uint8Array {
  const decryptedString = decryptMessage(encryptedFile, senderPublicKey, recipientSecretKey);
  return decodeBase64(decryptedString);
}



