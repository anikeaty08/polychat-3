import { Hex, getAddress, hexToBytes, keccak256, stringToBytes } from "viem";

export function normalizeAddress(address: string) {
  return address.toLowerCase() as `0x${string}`;
}

export function getConversationId(a: string, b: string): Hex {
  const addrA = normalizeAddress(a);
  const addrB = normalizeAddress(b);
  const [low, high] =
    BigInt(addrA) < BigInt(addrB) ? [addrA, addrB] : [addrB, addrA];

  const assembled = new Uint8Array([
    ...hexToBytes(getAddress(low)),
    ...hexToBytes(getAddress(high)),
  ]);

  return keccak256(assembled);
}

export function hashMessageBody(body: string, timestamp: number): Hex {
  return keccak256(
    stringToBytes(`${body}-${timestamp}`)
  );
}

