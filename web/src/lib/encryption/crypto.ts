/**
 * End-to-End Encryption using Web Crypto API
 * - ECDH for key exchange
 * - AES-GCM for message encryption
 */

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface ExportedPublicKey {
  x: string;
  y: string;
}

/**
 * Generate a new ECDH key pair
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true, // extractable
    ["deriveKey"]
  );

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

/**
 * Export public key to JWK format for sharing
 */
export async function exportPublicKey(
  publicKey: CryptoKey
): Promise<ExportedPublicKey> {
  const jwk = await window.crypto.subtle.exportKey("jwk", publicKey);
  return {
    x: jwk.x!,
    y: jwk.y!,
  };
}

/**
 * Import public key from JWK format
 */
export async function importPublicKey(
  exportedKey: ExportedPublicKey
): Promise<CryptoKey> {
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: exportedKey.x,
    y: exportedKey.y,
    ext: true,
  };

  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    []
  );
}

/**
 * Derive a shared AES key from your private key and their public key
 */
export async function deriveSharedKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  return await window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: publicKey,
    },
    privateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false, // not extractable for security
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a message using AES-GCM
 */
export async function encryptMessage(
  message: string,
  sharedKey: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  // Generate a random IV (12 bytes for AES-GCM)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    sharedKey,
    data
  );

  // Convert to base64 for storage/transmission
  const ciphertext = arrayBufferToBase64(encryptedData);
  const ivBase64 = arrayBufferToBase64(iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength));

  return { ciphertext, iv: ivBase64 };
}

/**
 * Decrypt a message using AES-GCM
 */
export async function decryptMessage(
  ciphertext: string,
  iv: string,
  sharedKey: CryptoKey
): Promise<string> {
  const encryptedData = base64ToArrayBuffer(ciphertext);
  const ivArray = base64ToArrayBuffer(iv);

  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivArray,
    },
    sharedKey,
    encryptedData
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

/**
 * Utility: Convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Utility: Convert Base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Store key pair in localStorage (only for demo purposes - in production use more secure storage)
 */
export async function storeKeyPair(address: string, keyPair: KeyPair) {
  const publicKeyJwk = await window.crypto.subtle.exportKey(
    "jwk",
    keyPair.publicKey
  );
  const privateKeyJwk = await window.crypto.subtle.exportKey(
    "jwk",
    keyPair.privateKey
  );

  localStorage.setItem(
    `e2e_keys_${address.toLowerCase()}`,
    JSON.stringify({
      publicKey: publicKeyJwk,
      privateKey: privateKeyJwk,
    })
  );
}

/**
 * Load key pair from localStorage
 */
export async function loadKeyPair(
  address: string
): Promise<KeyPair | null> {
  const stored = localStorage.getItem(`e2e_keys_${address.toLowerCase()}`);
  if (!stored) return null;

  const { publicKey, privateKey } = JSON.parse(stored);

  const publicCryptoKey = await window.crypto.subtle.importKey(
    "jwk",
    publicKey,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    []
  );

  const privateCryptoKey = await window.crypto.subtle.importKey(
    "jwk",
    privateKey,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey"]
  );

  return {
    publicKey: publicCryptoKey,
    privateKey: privateCryptoKey,
  };
}
