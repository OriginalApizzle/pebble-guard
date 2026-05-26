'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard, Shield, Ticket, AlertTriangle,
  FileText, BarChart2, Users, Settings, LogOut,
  CheckCircle, Bot, Zap, Key
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '' },
  { icon: Shield, label: 'Moderation', path: '/cases' },
  { icon: Ticket, label: 'Tickets', path: '/tickets' },
  { icon: CheckCircle, label: 'Verification', path: '/verification' },
  { icon: Bot, label: 'AutoMod', path: '/automod' },
  { icon: FileText, label: 'Logs', path: '/logs' },
  { icon: BarChart2, label: 'Analytics', path: '/analytics' },
  { icon: Users, label: 'Staff', path: '/staff' },
  { icon: Key, label: 'API Keys', path: '/apikeys' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar({ guildId }: { guildId: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const base = `/dashboard/${guildId}`;

  return (
    <aside className="w-64 min-h-screen border-r border-slate-800 bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <span className="text-2xl">🛡️</span>
          <div>
            <p className="font-bold text-white">PebbleGuard</p>
            <p className="text-xs text-slate-400">Management Dashboard</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const href = `${base}${path}`;
          const active = path === '' ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={path}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2">
          {session?.user?.image && (
            <img src={session.user.image} className="w-8 h-8 rounded-full" alt="avatar" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{session?.user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{session?.user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-900/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
