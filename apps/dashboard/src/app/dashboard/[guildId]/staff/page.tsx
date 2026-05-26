'use client';
import { useEffect, useState } from 'react';
import { Users, Plus, Trash2, Save, CheckCircle } from 'lucide-react';
import { prisma } from '@pebble-guard/database';

interface StaffPermission {
  id: string; roleId: string; roleName: string; level: number;
  permissions: string[]; department: string | null; createdAt: string;
}

export default function StaffPage({ params }: { params: { guildId: string } }) {
  const [staff, setStaff] = useState<StaffPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const load = () => {
    fetch(`/api/guilds/${params.guildId}/staff`)
      .then(r => r.json()).then(d => { setStaff(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const LEVELS = [
    { value: 1, label: 'Staff', desc: 'Can view cases & claim tickets' },
    { value: 2, label: 'Moderator', desc: 'Full moderation + ticket management' },
    { value: 3, label: 'Senior Mod / Admin', desc: 'Full access except API keys' },
    { value: 4, label: 'Owner', desc: 'Unrestricted access' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-400" /> Staff Roles
        </h1>
        <p className="text-slate-400 text-sm mt-1">Configure which roles have access to the dashboard and bot commands</p>
      </div>

      {/* Permission levels reference */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="font-semibold text-white text-sm">Permission Levels Reference</h2>
        </div>
        <div className="divide-y divide-slate-800">
          {LEVELS.map(({ value, label, desc }) => (
            <div key={value} className="flex items-center gap-4 px-5 py-3">
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                value === 1 ? 'bg-blue-500/20 text-blue-400' :
                value === 2 ? 'bg-purple-500/20 text-purple-400' :
                value === 3 ? 'bg-orange-500/20 text-orange-400' :
                'bg-red-500/20 text-red-400'
              }`}>{value}</span>
              <div>
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Staff roles */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-white text-sm">Configured Roles</h2>
        </div>
        {loading ? (
          <div className="p-5 space-y-2">{[...Array(3)].map((_,i) => <div key={i} className="h-12 bg-slate-800 rounded animate-pulse"/>)}</div>
        ) : staff.length ? (
          <div className="divide-y divide-slate-800">
            {staff.map(s => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{s.roleName}</p>
                    <span className="text-xs text-slate-500 font-mono">{s.roleId}</span>
                  </div>
                  {s.department && <p className="text-xs text-slate-500">Department: {s.department}</p>}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  s.level === 1 ? 'bg-blue-500/10 text-blue-400' :
                  s.level === 2 ? 'bg-purple-500/10 text-purple-400' :
                  s.level === 3 ? 'bg-orange-500/10 text-orange-400' :
                  'bg-red-500/10 text-red-400'
                }`}>Level {s.level}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-slate-500 text-sm">
            <p>No staff roles configured.</p>
            <p className="text-xs mt-1">Use <code className="bg-slate-800 px-1 rounded">/config staffrole</code> in Discord to set up staff roles.</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-2">
        <h2 className="font-semibold text-white text-sm">💡 How to configure staff roles</h2>
        <p className="text-xs text-slate-400">Use these bot commands in your Discord server:</p>
        <div className="space-y-1">
          {[
            '/config staffrole @role — Set the main staff role',
            '/config modrole @role — Set the moderator role',
            '/config adminrole @role — Set the admin role',
          ].map(cmd => (
            <code key={cmd} className="block bg-slate-800 text-purple-300 text-xs px-3 py-1.5 rounded-lg font-mono">{cmd}</code>
          ))}
        </div>
      </div>
    </div>
  );
}
