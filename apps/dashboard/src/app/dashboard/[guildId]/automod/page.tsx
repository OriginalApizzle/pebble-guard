'use client';
import { useEffect, useState } from 'react';
import { Bot, Save, CheckCircle, Plus, X } from 'lucide-react';

export default function AutomodPage({ params }: { params: { guildId: string } }) {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newWord, setNewWord] = useState('');

  useEffect(() => {
    fetch(`/api/guilds/${params.guildId}/config`).then(r => r.json()).then(d => { setConfig(d); setLoading(false); });
  }, [params.guildId]);

  const save = async () => {
    setSaving(true);
    await fetch(`/api/guilds/${params.guildId}/config`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config),
    });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const toggle = (key: string) => setConfig(c => ({ ...c, [key]: !c[key] }));
  const set = (key: string, val: any) => setConfig(c => ({ ...c, [key]: val }));

  const addWord = () => {
    if (!newWord.trim()) return;
    const list = [...(config.wordBlacklist ?? []), newWord.toLowerCase().trim()];
    set('wordBlacklist', [...new Set(list)]);
    setNewWord('');
  };

  const removeWord = (word: string) => set('wordBlacklist', (config.wordBlacklist ?? []).filter((w: string) => w !== word));

  if (loading) return <div className="p-6"><div className="h-8 w-48 bg-slate-800 rounded animate-pulse" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Bot className="w-6 h-6 text-green-400" /> AutoMod Configuration</h1>
          <p className="text-slate-400 text-sm mt-1">Automated content moderation settings</p>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all disabled:opacity-60">
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Master Toggle */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex items-center justify-between">
        <div>
          <p className="font-medium text-white">AutoMod Enabled</p>
          <p className="text-xs text-slate-500">Master switch for all automod features</p>
        </div>
        <button onClick={() => toggle('automodEnabled')}
          className={`relative w-11 h-6 rounded-full transition-colors ${config.automodEnabled ? 'bg-purple-600' : 'bg-slate-700'}`}>
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config.automodEnabled ? 'left-6' : 'left-1'}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800">
        <div className="px-5 py-3"><h2 className="font-semibold text-white">Content Filters</h2></div>
        {[
          { key: 'linkFilterEnabled', label: 'Link Filter', desc: 'Block unauthorized links' },
          { key: 'inviteFilterEnabled', label: 'Invite Filter', desc: 'Block Discord invite links' },
          { key: 'capsFilterEnabled', label: 'Caps Filter', desc: 'Block excessive capitalization' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between px-5 py-4">
            <div><p className="text-sm font-medium text-white">{label}</p><p className="text-xs text-slate-500">{desc}</p></div>
            <button onClick={() => toggle(key)}
              className={`relative w-11 h-6 rounded-full transition-colors ${config[key] ? 'bg-purple-600' : 'bg-slate-700'}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config[key] ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        ))}
      </div>

      {/* Thresholds */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <h2 className="font-semibold text-white">Thresholds</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'spamThreshold', label: 'Spam Messages', min: 2, max: 20 },
            { key: 'spamInterval', label: 'Spam Interval (sec)', min: 1, max: 60 },
            { key: 'massMentionLimit', label: 'Mass Mention Limit', min: 2, max: 50 },
            { key: 'capsThreshold', label: 'Caps Threshold (%)', min: 50, max: 100 },
          ].map(({ key, label, min, max }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs text-slate-400">{label}</label>
              <input type="number" min={min} max={max}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                value={config[key] ?? ''} onChange={e => set(key, parseInt(e.target.value))} />
            </div>
          ))}
        </div>
      </div>

      {/* Word Blacklist */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
        <h2 className="font-semibold text-white">Word Blacklist</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none"
            placeholder="Add a word..." value={newWord}
            onChange={e => setNewWord(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addWord()}
          />
          <button onClick={addWord}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(config.wordBlacklist ?? []).map((word: string) => (
            <span key={word} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-900/30 text-red-300 text-sm border border-red-800/30">
              {word}
              <button onClick={() => removeWord(word)} className="hover:text-red-100"><X className="w-3 h-3" /></button>
            </span>
          ))}
          {!(config.wordBlacklist?.length) && <p className="text-slate-500 text-sm">No words blacklisted.</p>}
        </div>
      </div>

      {/* Escalation */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">Warning Escalation</h2>
            <p className="text-xs text-slate-500">Automatically punish users who reach a warning threshold</p>
          </div>
          <button onClick={() => toggle('escalationEnabled')}
            className={`relative w-11 h-6 rounded-full transition-colors ${config.escalationEnabled ? 'bg-purple-600' : 'bg-slate-700'}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config.escalationEnabled ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Warning Threshold</label>
            <input type="number" min={2} max={20}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              value={config.escalationWarnLimit ?? 3} onChange={e => set('escalationWarnLimit', parseInt(e.target.value))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Escalation Action</label>
            <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              value={config.escalationAction ?? 'MUTE'} onChange={e => set('escalationAction', e.target.value)}>
              <option value="MUTE">Mute</option>
              <option value="KICK">Kick</option>
              <option value="BAN">Ban</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
