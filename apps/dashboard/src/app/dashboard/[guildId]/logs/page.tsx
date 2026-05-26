'use client';
import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';

interface LogEntry {
  id: string; type: string; userId: string | null; userTag: string | null;
  description: string; channelId: string | null; createdAt: string;
}

export default function LogsPage({ params }: { params: { guildId: string } }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: '50', ...(typeFilter ? { type: typeFilter } : {}) });
    fetch(`/api/guilds/${params.guildId}/logs?${qs}`)
      .then(r => r.json())
      .then(d => { setLogs(d.logs ?? []); setTotal(d.total ?? 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, typeFilter]);

  const LOG_TYPES = ['MESSAGE_DELETE','MESSAGE_EDIT','MEMBER_JOIN','MEMBER_LEAVE','MEMBER_BAN','MEMBER_KICK',
    'MEMBER_WARN','MEMBER_TIMEOUT','VOICE_JOIN','VOICE_LEAVE','TICKET_OPEN','TICKET_CLOSE','AUTOMOD_ACTION'];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><FileText className="w-6 h-6 text-blue-400" /> Audit Logs</h1>
        <p className="text-slate-400 text-sm mt-1">{total.toLocaleString()} log entries</p>
      </div>

      <select
        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
        value={typeFilter}
        onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
      >
        <option value="">All Types</option>
        {LOG_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
      </select>

      <div className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800">
        {loading ? (
          [...Array(15)].map((_, i) => (
            <div key={i} className="px-5 py-3 animate-pulse"><div className="h-4 bg-slate-800 rounded w-3/4" /></div>
          ))
        ) : logs.map(log => (
          <div key={log.id} className="flex items-start gap-4 px-5 py-3 hover:bg-slate-800/30">
            <div className="flex-shrink-0 mt-0.5">
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                {log.type.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white">{log.description}</p>
              {log.userTag && <p className="text-xs text-slate-500 mt-0.5">{log.userTag}</p>}
            </div>
            <span className="text-xs text-slate-600 flex-shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
          </div>
        ))}
        {!loading && !logs.length && <div className="text-center py-12 text-slate-500">No logs found.</div>}
      </div>

      {Math.ceil(total / 50) > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-400">Page {page} of {Math.ceil(total / 50)}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-40">Previous</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 50)}
              className="px-3 py-1 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
