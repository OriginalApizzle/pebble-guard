'use client';
import { useEffect, useState } from 'react';
import { Key, Plus, Trash2, Copy, CheckCircle } from 'lucide-react';

interface ApiKey {
  id: string; name: string; keyPrefix: string; permissions: string[];
  createdAt: string; lastUsedAt: string | null; usageCount: number;
}

export default function ApiKeysPage({ params }: { params: { guildId: string } }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = () => {
    fetch(`/api/guilds/${params.guildId}/apikeys`)
      .then(r => r.json()).then(d => { setKeys(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    const res = await fetch(`/api/guilds/${params.guildId}/apikeys`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName, permissions: [] }),
    });
    const data = await res.json();
    setNewRawKey(data.rawKey);
    setNewKeyName('');
    setCreating(false);
    load();
  };

  const deleteKey = async (id: string) => {
    await fetch(`/api/guilds/${params.guildId}/apikeys`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyId: id }),
    });
    load();
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Key className="w-6 h-6 text-yellow-400" /> API Keys
        </h1>
        <p className="text-slate-400 text-sm mt-1">Manage API keys for external integrations</p>
      </div>

      {newRawKey && (
        <div className="rounded-xl border border-green-800 bg-green-900/20 p-5 space-y-3">
          <p className="font-semibold text-green-400 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Key Created!</p>
          <p className="text-xs text-slate-400">⚠️ Copy now — it will never be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-950 text-green-300 text-xs px-3 py-2 rounded-lg font-mono break-all">{newRawKey}</code>
            <button onClick={() => copy(newRawKey)} className="px-3 py-2 bg-slate-800 rounded-lg text-white hover:bg-slate-700">
              {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={() => setNewRawKey(null)} className="text-xs text-slate-500 hover:text-slate-300">Dismiss</button>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
        <h2 className="font-semibold text-white">Create New Key</h2>
        <div className="flex gap-3">
          <input
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none"
            placeholder="Key name (e.g. webhook-server)"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createKey()}
          />
          <button onClick={createKey} disabled={creating || !newKeyName.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm disabled:opacity-60">
            <Plus className="w-4 h-4" /> Create
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
            <tr>{['Name','Prefix','Uses','Last Used','Created',''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? [...Array(3)].map((_,i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-slate-800 rounded animate-pulse"/></td></tr>)
              : keys.map(k => (
              <tr key={k.id} className="hover:bg-slate-900/50">
                <td className="px-4 py-3 font-medium text-white">{k.name}</td>
                <td className="px-4 py-3 font-mono text-yellow-400 text-xs">{k.keyPrefix}...</td>
                <td className="px-4 py-3 text-slate-400">{k.usageCount}</td>
                <td className="px-4 py-3 text-slate-500">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(k.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button onClick={() => deleteKey(k.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !keys.length && <div className="text-center py-8 text-slate-500 text-sm">No API keys yet.</div>}
      </div>
    </div>
  );
}
