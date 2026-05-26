'use client';
import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Shield, Ticket, Users, AlertTriangle, TrendingUp, Activity } from 'lucide-react';

interface StatsData {
  totalCases: number;
  openTickets: number;
  totalTickets: number;
  memberCount: number;
  dailyStats: Array<{ date: string; joins: number; leaves: number; punishments: number; ticketsOpened: number }>;
  staffPerformance: Array<{ userTag: string; _count: { action: number } }>;
}

export function DashboardOverview({ guildId }: { guildId: string }) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/guilds/${guildId}/analytics`)
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [guildId]);

  const statCards = [
    { icon: Shield, label: 'Total Cases', value: stats?.totalCases ?? 0, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { icon: Ticket, label: 'Open Tickets', value: stats?.openTickets ?? 0, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { icon: Users, label: 'Members', value: stats?.memberCount ?? 0, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { icon: AlertTriangle, label: 'Total Tickets', value: stats?.totalTickets ?? 0, color: 'text-green-400', bg: 'bg-green-500/10' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
        <p className="text-slate-400 text-sm mt-1">Real-time statistics and server insights</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
                <p className={`text-3xl font-bold mt-1 ${color}`}>
                  {loading ? '—' : value.toLocaleString()}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Growth Chart */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-purple-400" />
          <h2 className="font-semibold text-white">Server Activity (Last 30 Days)</h2>
        </div>
        {loading ? (
          <div className="h-48 animate-pulse bg-slate-800 rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats?.dailyStats ?? []}>
              <defs>
                <linearGradient id="colorJoins" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPunishments" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="joins" stroke="#8b5cf6" fill="url(#colorJoins)" name="Joins" />
              <Area type="monotone" dataKey="punishments" stroke="#f97316" fill="url(#colorPunishments)" name="Punishments" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Staff Leaderboard */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-blue-400" />
          <h2 className="font-semibold text-white">Top Staff Activity</h2>
          <span className="text-xs text-slate-500 ml-auto">Last 30 days</span>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-slate-800 animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {(stats?.staffPerformance ?? []).map((staff, i) => (
              <div key={staff.userTag} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50">
                <span className="text-slate-500 text-sm w-5">#{i + 1}</span>
                <span className="text-white text-sm flex-1">{staff.userTag}</span>
                <span className="text-purple-400 text-sm font-semibold">{staff._count.action} actions</span>
              </div>
            ))}
            {!stats?.staffPerformance?.length && (
              <p className="text-slate-500 text-sm text-center py-4">No staff activity yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
