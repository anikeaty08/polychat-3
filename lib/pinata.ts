import axios from 'axios';

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;
const PINATA_JWT = process.env.PINATA_JWT;

const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/**
 * Upload file to Pinata IPFS
 */
export async function uploadToPinata(
  file: File | Blob,
  fileName?: string
): Promise<string> {
  if (!PINATA_JWT && (!PINATA_API_KEY || !PINATA_SECRET_API_KEY)) {
    throw new Error('Pinata credentials not configured');
  }

  const formData = new FormData();
  formData.append('file', file);

  const metadata = JSON.stringify({
    name: fileName || `file-${Date.now()}`,
  });
  formData.append('pinataMetadata', metadata);

  const options = JSON.stringify({
    cidVersion: 0,
  });
  formData.append('pinataOptions', options);

  try {
    const response = await axios.post<PinataResponse>(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          ...(PINATA_JWT
            ? { Authorization: `Bearer ${PINATA_JWT}` }
            : {
                pinata_api_key: PINATA_API_KEY,
                pinata_secret_api_key: PINATA_SECRET_API_KEY,
              }),
          'Content-Type': 'multipart/form-data',
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    return response.data.IpfsHash;
  } catch (error: any) {
    console.error('Pinata upload error:', error);
    throw new Error(`Failed to upload to Pinata: ${error.message}`);
  }
}

/**
 * Upload JSON data to Pinata IPFS
 */
export async function uploadJSONToPinata(data: any): Promise<string> {
  if (!PINATA_JWT && (!PINATA_API_KEY || !PINATA_SECRET_API_KEY)) {
    throw new Error('Pinata credentials not configured');
  }

  try {
    const response = await axios.post<PinataResponse>(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      {
        pinataContent: data,
        pinataMetadata: {
          name: `data-${Date.now()}`,
        },
        pinataOptions: {
          cidVersion: 0,
        },
      },
      {
        headers: {
          ...(PINATA_JWT
            ? { Authorization: `Bearer ${PINATA_JWT}` }
            : {
                pinata_api_key: PINATA_API_KEY,
                pinata_secret_api_key: PINATA_SECRET_API_KEY,
              }),
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.IpfsHash;
  } catch (error: any) {
    console.error('Pinata JSON upload error:', error);
    throw new Error(`Failed to upload JSON to Pinata: ${error.message}`);
  }
}

/**
 * Get IPFS URL from hash
 */
export function getIPFSUrl(hash: string): string {
  return `${PINATA_GATEWAY}${hash}`;
}

/**
 * Upload encrypted message to Pinata
 */
export async function uploadEncryptedMessage(
  encryptedContent: string,
  metadata?: Record<string, any>
): Promise<string> {
  const data = {
    encryptedContent,
    metadata: metadata || {},
    timestamp: new Date().toISOString(),
  };

  return uploadJSONToPinata(data);
}



