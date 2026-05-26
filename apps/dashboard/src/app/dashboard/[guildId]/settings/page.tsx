'use client';
import { useEffect, useState } from 'react';
import { Settings, Save, CheckCircle } from 'lucide-react';

export default function SettingsPage({ params }: { params: { guildId: string } }) {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/guilds/${params.guildId}/config`)
      .then(r => r.json())
      .then(d => { setConfig(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.guildId]);

  const save = async () => {
    setSaving(true);
    await fetch(`/api/guilds/${params.guildId}/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggle = (key: string) => setConfig(c => ({ ...c, [key]: !c[key] }));
  const set = (key: string, val: any) => setConfig(c => ({ ...c, [key]: val }));

  if (loading) return <div className="p-6"><div className="h-8 w-48 bg-slate-800 rounded animate-pulse" /></div>;

  const modules = [
    { key: 'modEnabled', label: 'Moderation', desc: 'Enable moderation system and commands' },
    { key: 'loggingEnabled', label: 'Logging', desc: 'Log server events to channels' },
    { key: 'verificationEnabled', label: 'Verification', desc: 'Member verification on join' },
    { key: 'ticketsEnabled', label: 'Tickets', desc: 'Support ticket system' },
    { key: 'automodEnabled', label: 'AutoMod', desc: 'Automated content moderation' },
    { key: 'welcomeEnabled', label: 'Welcome Messages', desc: 'Welcome/leave messages' },
    { key: 'analyticsEnabled', label: 'Analytics', desc: 'Track server statistics' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Settings className="w-6 h-6 text-purple-400" /> Server Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Configure PebbleGuard for your server</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all disabled:opacity-60"
        >
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Module Toggles */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="font-semibold text-white">Modules</h2>
        </div>
        <div className="divide-y divide-slate-800">
          {modules.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              <button
                onClick={() => toggle(key)}
                className={`relative w-11 h-6 rounded-full transition-colors ${config[key] ? 'bg-purple-600' : 'bg-slate-700'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config[key] ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Channel IDs */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="font-semibold text-white">Log Channels</h2>
          <p className="text-xs text-slate-500">Enter Discord channel IDs (right-click channel → Copy ID)</p>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: 'modLogChannelId', label: 'Mod Log Channel' },
            { key: 'msgLogChannelId', label: 'Message Log Channel' },
            { key: 'joinLeaveChannelId', label: 'Join/Leave Log' },
            { key: 'voiceLogChannelId', label: 'Voice Log Channel' },
            { key: 'boostLogChannelId', label: 'Boost Log Channel' },
            { key: 'verificationChannelId', label: 'Verification Channel' },
            { key: 'welcomeChannelId', label: 'Welcome Channel' },
            { key: 'ticketCategoryId', label: 'Ticket Category ID' },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs text-slate-400">{label}</label>
              <input
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none"
                placeholder="Channel / Category ID"
                value={config[key] ?? ''}
                onChange={e => set(key, e.target.value || null)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Role IDs */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="font-semibold text-white">Role IDs</h2>
          <p className="text-xs text-slate-500">Enter Discord role IDs</p>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: 'mutedRoleId', label: 'Muted Role' },
            { key: 'verifiedRoleId', label: 'Verified Role' },
            { key: 'unverifiedRoleId', label: 'Unverified Role' },
            { key: 'staffRoleId', label: 'Staff Role' },
            { key: 'modRoleId', label: 'Mod Role' },
            { key: 'adminRoleId', label: 'Admin Role' },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs text-slate-400">{label}</label>
              <input
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none"
                placeholder="Role ID"
                value={config[key] ?? ''}
                onChange={e => set(key, e.target.value || null)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Welcome */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
        <h2 className="font-semibold text-white">Welcome Message</h2>
        <p className="text-xs text-slate-500">Use <code className="bg-slate-800 px-1 rounded">{`{user}`}</code>, <code className="bg-slate-800 px-1 rounded">{`{guild}`}</code>, <code className="bg-slate-800 px-1 rounded">{`{count}`}</code></p>
        <textarea
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none resize-none"
          rows={3}
          placeholder="Welcome {user} to **{guild}**!"
          value={config.welcomeMessage ?? ''}
          onChange={e => set('welcomeMessage', e.target.value)}
        />
      </div>
    </div>
  );
}
