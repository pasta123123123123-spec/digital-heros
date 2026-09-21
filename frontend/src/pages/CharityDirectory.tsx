import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Charity } from '../types';

export function CharityDirectory() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['charities', search],
    queryFn: async () =>
      (await api.get<{ charities: Charity[] }>('/charities', { params: { search: search || undefined } }))
        .data.charities,
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-display text-4xl">Charities</h1>
      <p className="mt-2 text-mist">Every subscription supports one of these causes.</p>

      <input
        className="input mt-8 max-w-sm"
        placeholder="Search charities…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {isLoading && <p className="mt-8 text-mist">Loading charities…</p>}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((c) => (
          <div key={c.id} className="card">
            {c.isFeatured && (
              <span className="mb-3 inline-block rounded-full bg-ember-500/10 px-3 py-1 text-xs text-ember-500">
                Featured this month
              </span>
            )}
            <h3 className="font-display text-xl">{c.name}</h3>
            <p className="mt-2 text-sm text-mist">{c.description}</p>
          </div>
        ))}
        {data?.length === 0 && <p className="text-mist">No charities match your search.</p>}
      </div>
    </div>
  );
}
