'use client';
import { useEffect, useState } from 'react';
import { Ticket, Search } from 'lucide-react';

interface TicketRow {
  id: string; ticketNumber: number; status: string; priority: string;
  creatorTag: string; claimedByTag: string | null; createdAt: string;
  category: { name: string; emoji: string | null } | null;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'text-green-400 bg-green-500/10', CLAIMED: 'text-blue-400 bg-blue-500/10',
  PENDING: 'text-yellow-400 bg-yellow-500/10', RESOLVED: 'text-purple-400 bg-purple-500/10',
  CLOSED: 'text-slate-400 bg-slate-700',
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-slate-400', NORMAL: 'text-blue-400', HIGH: 'text-orange-400', URGENT: 'text-red-400',
};

export default function TicketsPage({ params }: { params: { guildId: string } }) {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), ...(statusFilter ? { status: statusFilter } : {}) });
    fetch(`/api/guilds/${params.guildId}/tickets?${qs}`)
      .then(r => r.json())
      .then(d => { setTickets(d.tickets ?? []); setTotal(d.total ?? 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, statusFilter]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Ticket className="w-6 h-6 text-purple-400" /> Tickets</h1>
          <p className="text-slate-400 text-sm mt-1">{total.toLocaleString()} total tickets</p>
        </div>
      </div>

      <div className="flex gap-3">
        <select
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          {['OPEN','CLAIMED','PENDING','RESOLVED','CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
            <tr>
              {['#', 'Category', 'Creator', 'Claimed By', 'Priority', 'Status', 'Opened'].map(h => (
                <th key={h} className="px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td></tr>
              ))
            ) : tickets.map(t => (
              <tr key={t.id} className="hover:bg-slate-900/50">
                <td className="px-4 py-3 font-mono text-purple-400">#{t.ticketNumber}</td>
                <td className="px-4 py-3 text-white">{t.category?.emoji} {t.category?.name ?? '—'}</td>
                <td className="px-4 py-3 text-slate-300">{t.creatorTag}</td>
                <td className="px-4 py-3 text-slate-400">{t.claimedByTag ?? '—'}</td>
                <td className={`px-4 py-3 text-xs font-semibold ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !tickets.length && <div className="text-center py-12 text-slate-500">No tickets found.</div>}
      </div>

      {Math.ceil(total / limit) > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">Page {page} of {Math.ceil(total / limit)}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-40">Previous</button>
            <button onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))} disabled={page >= Math.ceil(total / limit)}
              className="px-3 py-1 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
