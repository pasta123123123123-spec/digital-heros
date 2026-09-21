import { useState } from 'react';
import { AdminOverview } from './admin/AdminOverview';
import { AdminUsers } from './admin/AdminUsers';
import { AdminDraws } from './admin/AdminDraws';
import { AdminCharities } from './admin/AdminCharities';
import { AdminWinners } from './admin/AdminWinners';

const TABS = [
  { id: 'overview', label: 'Reports & analytics' },
  { id: 'users', label: 'Users' },
  { id: 'draws', label: 'Draws' },
  { id: 'charities', label: 'Charities' },
  { id: 'winners', label: 'Winners' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function AdminDashboard() {
  const [tab, setTab] = useState<TabId>('overview');

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-4xl">Admin</h1>

      <div className="mt-6 flex gap-2 border-b border-mist/10">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm ${
              tab === t.id
                ? 'border-b-2 border-ember-500 text-parchment'
                : 'text-mist hover:text-parchment'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === 'overview' && <AdminOverview />}
        {tab === 'users' && <AdminUsers />}
        {tab === 'draws' && <AdminDraws />}
        {tab === 'charities' && <AdminCharities />}
        {tab === 'winners' && <AdminWinners />}
      </div>
    </div>
  );
}
