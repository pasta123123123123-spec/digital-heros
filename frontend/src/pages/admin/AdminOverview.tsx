import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';

interface Overview {
  totalUsers: number;
  activeSubscribers: number;
  totalPrizePoolPaid: number;
  totalDrawsPublished: number;
  charityContributionCounts: { charityId: string | null; _count: { _all: number } }[];
}

export function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => (await api.get<Overview>('/admin/overview')).data,
  });

  if (isLoading) return <p className="text-mist">Loading…</p>;
  if (!data) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total users" value={data.totalUsers} />
      <StatCard label="Active subscribers" value={data.activeSubscribers} />
      <StatCard label="Prize money paid" value={`$${data.totalPrizePoolPaid}`} />
      <StatCard label="Draws published" value={data.totalDrawsPublished} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <p className="text-sm text-mist">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </div>
  );
}
