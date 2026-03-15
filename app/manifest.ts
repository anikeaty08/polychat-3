import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PolyChat',
    short_name: 'PolyChat',
    description: 'Private Web3 messaging with payments.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0b12',
    theme_color: '#7c3aed',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
