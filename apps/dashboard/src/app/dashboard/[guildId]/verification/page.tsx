'use client';
import { useEffect, useState } from 'react';
import { CheckCircle, Save } from 'lucide-react';

export default function VerificationPage({ params }: { params: { guildId: string } }) {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  if (loading) return <div className="p-6"><div className="h-8 w-48 bg-slate-800 rounded animate-pulse" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-teal-400" /> Verification
          </h1>
          <p className="text-slate-400 text-sm mt-1">Configure member verification on join</p>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm disabled:opacity-60">
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Master toggle */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex items-center justify-between">
        <div>
          <p className="font-medium text-white">Verification Enabled</p>
          <p className="text-xs text-slate-500">Require members to verify before accessing the server</p>
        </div>
        <button onClick={() => toggle('verificationEnabled')}
          className={`relative w-11 h-6 rounded-full transition-colors ${config.verificationEnabled ? 'bg-purple-600' : 'bg-slate-700'}`}>
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config.verificationEnabled ? 'left-6' : 'left-1'}`} />
        </button>
      </div>

      {/* Method */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
        <h2 className="font-semibold text-white">Verification Method</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {['BUTTON', 'CAPTCHA', 'ROLE'].map(method => (
            <button key={method} onClick={() => set('verificationMethod', method)}
              className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                config.verificationMethod === method
                  ? 'border-purple-500 bg-purple-600/20 text-purple-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
              }`}>
              {method === 'BUTTON' && '🔘 Button Click'}
              {method === 'CAPTCHA' && '🔤 CAPTCHA Code'}
              {method === 'ROLE' && '🎭 Role Assign'}
            </button>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <h2 className="font-semibold text-white">Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Min Account Age (days)</label>
            <input type="number" min={0}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              value={config.minAccountAge ?? 0} onChange={e => set('minAccountAge', parseInt(e.target.value) || 0)} />
            <p className="text-xs text-slate-600">0 = no minimum age requirement</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Min Alt Account Age (days)</label>
            <input type="number" min={0}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              value={config.minAltAge ?? 7} onChange={e => set('minAltAge', parseInt(e.target.value) || 0)} />
          </div>
        </div>

        {[
          { key: 'captchaEnabled', label: 'CAPTCHA Verification', desc: 'Require users to solve a CAPTCHA' },
          { key: 'antiAltEnabled', label: 'Anti-Alt Detection', desc: 'Flag suspicious new accounts for review' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between py-2 border-t border-slate-800">
            <div><p className="text-sm font-medium text-white">{label}</p><p className="text-xs text-slate-500">{desc}</p></div>
            <button onClick={() => toggle(key)}
              className={`relative w-11 h-6 rounded-full transition-colors ${config[key] ? 'bg-purple-600' : 'bg-slate-700'}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config[key] ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        ))}
      </div>

      {/* Custom message */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
        <h2 className="font-semibold text-white">Verification Message</h2>
        <textarea
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none resize-none"
          rows={4}
          placeholder="Welcome to the server! Click verify below to gain access."
          value={config.verificationMessage ?? ''}
          onChange={e => set('verificationMessage', e.target.value)}
        />
        <p className="text-xs text-slate-500">Shown in the verification panel embed.</p>
      </div>

      {/* Raid mode */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white flex items-center gap-2">
              🚨 Raid Mode
              {config.raidMode && <span className="text-xs px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-600/30">ACTIVE</span>}
            </h2>
            <p className="text-xs text-slate-500">When enabled, new joins are kicked immediately</p>
          </div>
          <button onClick={() => toggle('raidMode')}
            className={`relative w-11 h-6 rounded-full transition-colors ${config.raidMode ? 'bg-red-600' : 'bg-slate-700'}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${config.raidMode ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Auto-enable threshold (joins)</label>
            <input type="number" min={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              value={config.raidModeThreshold ?? 10} onChange={e => set('raidModeThreshold', parseInt(e.target.value) || 10)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Detection window (seconds)</label>
            <input type="number" min={5}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              value={config.raidModeInterval ?? 10} onChange={e => set('raidModeInterval', parseInt(e.target.value) || 10)} />
          </div>
        </div>
      </div>
    </div>
  );
}
