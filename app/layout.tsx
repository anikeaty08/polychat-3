import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'react-hot-toast';
import AppFrame from '@/components/AppFrame';

export const metadata: Metadata = {
  title: 'PolyChat',
  description: 'Connect, Chat, Stay Private - End-to-end encrypted messaging on Polygon',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <AppFrame>{children}</AppFrame>
          <Toaster 
            position="top-center"
            toastOptions={{
              className: 'dark:bg-gray-800 dark:text-white',
            }}
          />
        </Providers>
      </body>
    </html>
  );
}

