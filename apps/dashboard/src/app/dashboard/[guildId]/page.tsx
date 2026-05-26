import { DashboardOverview } from '@/components/dashboard/DashboardOverview';

export default function GuildDashboardPage({ params }: { params: { guildId: string } }) {
  return <DashboardOverview guildId={params.guildId} />;
}
