import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect('/dashboard');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="text-center space-y-8 px-4">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-purple-600 flex items-center justify-center text-3xl shadow-lg shadow-purple-900/50">
            🛡️
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">PebbleGuard</h1>
            <p className="text-purple-300 text-sm">Discord Management Platform</p>
          </div>
        </div>

        {/* Tagline */}
        <div className="space-y-2">
          <p className="text-xl text-slate-300 max-w-lg mx-auto">
            The most powerful Discord moderation, ticketing, and administration bot for your community.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center">
          {['Moderation', 'Ticketing', 'Verification', 'AutoMod', 'Analytics', 'Logging', 'Multi-Server'].map(f => (
            <span key={f} className="px-3 py-1 rounded-full bg-purple-900/50 text-purple-200 text-sm border border-purple-800/50">
              {f}
            </span>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/login"
            className="px-8 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all shadow-lg shadow-purple-900/50 hover:shadow-purple-500/30"
          >
            Login with Discord
          </Link>
          <a
            href={process.env.NEXT_PUBLIC_INVITE_URL ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all border border-slate-700"
          >
            Add to Server
          </a>
        </div>
      </div>

      {/* Stats bar */}
      <div className="mt-20 grid grid-cols-3 gap-12 text-center">
        {[['100+', 'Commands'], ['Real-time', 'Analytics'], ['Multi-Server', 'Support']].map(([val, label]) => (
          <div key={label} className="space-y-1">
            <p className="text-2xl font-bold text-white">{val}</p>
            <p className="text-slate-400 text-sm">{label}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
