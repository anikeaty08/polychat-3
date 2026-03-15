'use client';

import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MessageCircle, Phone, Search, Settings, Wallet, User } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export default function AppFrame({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();

  const navItems: NavItem[] = useMemo(
    () => [
      { href: '/chats', label: 'Chats', icon: MessageCircle },
      { href: '/calls', label: 'Calls', icon: Phone },
      { href: '/search', label: 'Search', icon: Search },
      { href: '/payments', label: 'Payments', icon: Wallet },
      { href: '/settings', label: 'Settings', icon: Settings },
    ],
    []
  );

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen mesh-bg">
      <div className="mx-auto w-full max-w-[1400px] min-h-screen flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-20 px-3 py-4">
          <button
            onClick={() => router.push('/')}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 flex items-center justify-center mx-auto mb-6 active:scale-95 transition-all"
            title="Home"
          >
            <MessageCircle className="w-6 h-6 text-white" />
          </button>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
                    active ? 'bg-white/70 dark:bg-gray-900/40 shadow-sm' : 'hover:bg-white/50 dark:hover:bg-gray-900/30'
                  }`}
                  title={item.label}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`} />
                </button>
              );
            })}
          </nav>

          <button
            onClick={() => router.push('/profile')}
            className="w-full h-12 rounded-2xl flex items-center justify-center hover:bg-white/50 dark:hover:bg-gray-900/30 transition-all active:scale-95"
            title="Profile"
          >
            {user?.profilePicture || (user as any)?.profile_picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={(user as any)?.profile_picture || user?.profilePicture || ''}
                alt="Profile"
                className="w-9 h-9 rounded-2xl object-cover border border-white/30"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-white/70 dark:bg-gray-900/40 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
            )}
          </button>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-0 md:px-2 py-0 md:py-4 pb-20 md:pb-4">
          <div className="min-h-[calc(100vh-0px)]">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-card border-t border-gray-200/30 dark:border-gray-700/30">
        <div className="mx-auto w-full max-w-[1400px] px-3 py-2 grid grid-cols-5 gap-2">
          {navItems.slice(0, 5).map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
                  active ? 'bg-white/70 dark:bg-gray-900/40' : 'hover:bg-white/50 dark:hover:bg-gray-900/30'
                }`}
                title={item.label}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
