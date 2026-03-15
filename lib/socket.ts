export function getSocketUrl(): string | null {
  const env = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (env && env.trim()) {
    const normalized = env.trim();
    if (typeof window !== 'undefined') {
      // Guard against misconfiguration where the app URL is used as the Socket.io URL
      // (common on Vercel where Socket.io isn't hosted on the same origin).
      if (normalized === window.location.origin) return null;
    }
    return normalized;
  }

  if (typeof window === 'undefined') return null;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3001';

  // In production (e.g. Vercel), Socket.io must be hosted separately.
  return null;
}
