'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
  owner: boolean;
}

export function GuildSelector({ accessToken }: { accessToken?: string }) {
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then((data: DiscordGuild[]) => {
        const manageable = data.filter(g => {
          const perms = BigInt(g.permissions);
          return g.owner || (perms & BigInt(0x20)) !== BigInt(0); // MANAGE_GUILD
        });
        setGuilds(manageable);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [accessToken]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-800/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!guilds.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p className="text-lg">No servers found where you have Manage Server permission.</p>
        <a
          href={process.env.NEXT_PUBLIC_INVITE_URL ?? '#'}
          className="mt-4 inline-block px-6 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500"
        >
          Add PebbleGuard to a Server
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {guilds.map(guild => (
        <Link
          key={guild.id}
          href={`/dashboard/${guild.id}`}
          className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-purple-600 hover:bg-slate-800/60 transition-all group"
        >
          {guild.icon ? (
            <img
              src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`}
              className="w-12 h-12 rounded-full"
              alt={guild.name}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-xl font-bold">
              {guild.name[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate group-hover:text-purple-300">{guild.name}</p>
            <p className="text-xs text-slate-500">{guild.owner ? 'Owner' : 'Manager'}</p>
          </div>
          <span className="text-slate-600 group-hover:text-purple-400">→</span>
        </Link>
      ))}
    </div>
  );
}
