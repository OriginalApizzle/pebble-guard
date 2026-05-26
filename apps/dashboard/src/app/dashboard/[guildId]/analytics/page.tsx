'use client';
import { useEffect, useState } from 'react';
import { BarChart2, TrendingUp, Users, Shield, Ticket } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function AnalyticsPage({ params }: { params: { guildId: string } }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/guilds/${params.guildId}/analytics`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.guildId]);

  const COLORS = ['#8b5cf6', '#f97316', '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1'];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><BarChart2 className="w-6 h-6 text-purple-400" /> Analytics</h1>
        <p className="text-slate-400 text-sm mt-1">Server statistics and performance metrics</p>
      </div>

      {/* Growth Chart */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-400" /> Member Growth (30 Days)</h2>
        {loading ? <div className="h-48 bg-slate-800 rounded animate-pulse" /> : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.dailyStats ?? []}>
              <defs>
                <linearGradient id="joins" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="leaves" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={d => d?.slice(5) ?? ''} />
              <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="joins" stroke="#8b5cf6" fill="url(#joins)" name="Joins" />
              <Area type="monotone" dataKey="leaves" stroke="#ef4444" fill="url(#leaves)" name="Leaves" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Case Types */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-orange-400" /> Cases by Type</h2>
          {loading ? <div className="h-40 bg-slate-800 rounded animate-pulse" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.caseStats?.map((s: any) => ({ name: s.type, count: s._count })) ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 10 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#f97316" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Ticket Status */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Ticket className="w-4 h-4 text-purple-400" /> Tickets by Status</h2>
          {loading ? <div className="h-40 bg-slate-800 rounded animate-pulse" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data?.ticketStats?.map((s: any) => ({ name: s.status, value: s._count })) ?? []}
                  cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" paddingAngle={3}
                >
                  {(data?.ticketStats ?? []).map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Staff Performance */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-blue-400" /> Staff Performance (30 Days)</h2>
        {loading ? <div className="h-8 bg-slate-800 rounded animate-pulse" /> : (
          <div className="space-y-3">
            {(data?.staffPerformance ?? []).map((s: any, i: number) => {
              const max = data.staffPerformance[0]?._count?.action ?? 1;
              const pct = Math.round((s._count.action / max) * 100);
              return (
                <div key={s.userTag} className="flex items-center gap-4">
                  <span className="text-slate-500 text-sm w-5">#{i + 1}</span>
                  <span className="text-white text-sm w-48 truncate">{s.userTag}</span>
                  <div className="flex-1 bg-slate-800 rounded-full h-2">
                    <div className="h-2 rounded-full bg-purple-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-purple-400 text-sm font-semibold w-20 text-right">{s._count.action} actions</span>
                </div>
              );
            })}
            {!data?.staffPerformance?.length && <p className="text-slate-500 text-sm">No staff activity recorded.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
