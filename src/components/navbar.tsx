'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useAppStore } from '@/store';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const unreadNotifications = useAppStore((s) => s.unreadNotifications);

  useEffect(() => {
    if (session?.user) {
      fetch('/api/notifications').then(r => r.json()).then(d => {
        if (d.notifications) {
          setNotifications(d.notifications);
          setNotifCount(d.unreadCount);
          useAppStore.getState().setUnreadNotifications(d.unreadCount);
        }
      }).catch(() => {});
    }
  }, [session]);

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PUT' });
    setNotifCount(0);
    setNotifications(n => n.map(n => ({ ...n, read: true })));
    useAppStore.getState().setUnreadNotifications(0);
  };

  if (!session?.user) return null;

  const navLinks = [
    { href: '/dashboard', label: 'Discover' },
    { href: '/map', label: 'Map' },
    { href: '/connections', label: 'Connections' },
    { href: '/chat', label: 'Chat' },
    { href: '/chat/global', label: 'Global Chat' },
  ];

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CC</span>
            </div>
            <span className="font-bold text-lg text-gray-900 dark:text-white hidden sm:block">CampusConnect</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname.startsWith(link.href) ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'}`}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {notifCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{notifCount > 9 ? '9+' : notifCount}</span>}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="font-semibold text-sm">Notifications</span>
                    {notifCount > 0 && <button onClick={markAllRead} className="text-xs text-indigo-600 hover:text-indigo-800">Mark all read</button>}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">No notifications yet</div>
                  ) : (
                    notifications.slice(0, 20).map((n) => (
                      <div key={n.id} className={`p-3 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${!n.read ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <Link href="/profile" className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-800 rounded-full overflow-hidden">
                {session.user.image ? (
                  <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-indigo-600 font-semibold text-sm">
                    {session.user.name?.[0] || 'U'}
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden lg:block">{session.user.name}</span>
            </Link>

            <button onClick={() => signOut()} className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Sign out
            </button>

            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex flex-col gap-1 pt-2">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className={`px-3 py-2 rounded-lg text-sm font-medium ${pathname.startsWith(link.href) ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'}`}>
                  {link.label}
                </Link>
              ))}
              <Link href="/settings" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-300">Settings</Link>
              <button onClick={() => signOut()} className="px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 text-left">Sign out</button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
