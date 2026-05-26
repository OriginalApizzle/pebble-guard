import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { GuildSelector } from '@/components/dashboard/GuildSelector';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <h1 className="text-xl font-bold">PebbleGuard</h1>
        </div>
        <div className="flex items-center gap-3">
          {session.user?.image && (
            <img src={session.user.image} className="w-8 h-8 rounded-full" alt="avatar" />
          )}
          <span className="text-sm text-slate-300">{session.user?.name}</span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold mb-2">Select a Server</h2>
        <p className="text-slate-400 mb-8">Choose a server to manage with PebbleGuard.</p>
        <GuildSelector accessToken={(session.user as any)?.accessToken} />
      </main>
    </div>
  );
}
