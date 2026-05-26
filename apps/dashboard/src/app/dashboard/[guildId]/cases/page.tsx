'use client';
import { useEffect, useState } from 'react';
import { Shield, Search, Filter } from 'lucide-react';

interface Case {
  id: string; caseNumber: number; type: string; userId: string; userTag: string;
  moderatorTag: string; reason: string | null; active: boolean; createdAt: string; expiresAt: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  WARN: 'text-yellow-400 bg-yellow-500/10', MUTE: 'text-orange-400 bg-orange-500/10',
  KICK: 'text-red-400 bg-red-500/10', BAN: 'text-red-600 bg-red-600/10',
  SOFTBAN: 'text-red-500 bg-red-500/10', UNBAN: 'text-green-400 bg-green-500/10',
  TIMEOUT: 'text-orange-300 bg-orange-300/10', NOTE: 'text-blue-400 bg-blue-500/10',
};

export default function CasesPage({ params }: { params: { guildId: string } }) {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const limit = 20;

  const load = () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: String(limit), ...(typeFilter ? { type: typeFilter } : {}) });
    fetch(`/api/guilds/${params.guildId}/cases?${qs}`)
      .then(r => r.json())
      .then(d => { setCases(d.cases ?? []); setTotal(d.total ?? 0); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, [page, typeFilter]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Shield className="w-6 h-6 text-orange-400" /> Moderation Cases</h1>
          <p className="text-slate-400 text-sm mt-1">{total.toLocaleString()} total cases</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            placeholder="Search by user ID or tag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Types</option>
          {['WARN','MUTE','TIMEOUT','KICK','BAN','SOFTBAN','UNBAN','NOTE'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
            <tr>
              {['Case', 'Type', 'User', 'Moderator', 'Reason', 'Date', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              [...Array(10)].map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td></tr>
              ))
            ) : cases.map(c => (
              <tr key={c.id} className="hover:bg-slate-900/50 transition-colors">
                <td className="px-4 py-3 font-mono text-purple-400">#{c.caseNumber}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[c.type] ?? 'text-slate-400 bg-slate-700'}`}>{c.type}</span>
                </td>
                <td className="px-4 py-3 text-white">{c.userTag}</td>
                <td className="px-4 py-3 text-slate-400">{c.moderatorTag}</td>
                <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{c.reason ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${c.active ? 'bg-green-500/10 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                    {c.active ? 'Active' : 'Resolved'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !cases.length && (
          <div className="text-center py-12 text-slate-500">No cases found.</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-40 hover:bg-slate-700">
              Previous
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-40 hover:bg-slate-700">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
