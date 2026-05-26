import { getServerSession } from 'next-auth';
import { authOptions } from '../../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';

export default async function GuildLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { guildId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <Sidebar guildId={params.guildId} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
