import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Charity } from '../types';

const CATEGORIES = ['All', 'Youth', 'Medical', 'Environment', 'Community', 'Veterans'];

export function CharityDirectory() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const { data, isLoading } = useQuery({
    queryKey: ['charities', search, selectedCategory],
    queryFn: async () =>
      (
        await api.get<{ charities: Charity[] }>('/charities', {
          params: {
            search: search || undefined,
            category: selectedCategory !== 'All' ? selectedCategory : undefined,
          },
        })
      ).data.charities,
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-display text-4xl">Charities</h1>
      <p className="mt-2 text-mist">Every subscription supports one of these causes.</p>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <input
          className="input w-full max-w-sm"
          placeholder="Search charities…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                selectedCategory === cat
                  ? 'border-ember-500 bg-ember-500/10 text-ember-500'
                  : 'border-mist/20 text-mist hover:border-mist hover:text-parchment'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="mt-12 text-mist">Loading charities…</p>}

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((c) => (
          <Link key={c.id} to={`/charities/${c.id}`} className="card group relative overflow-hidden transition-all hover:-translate-y-1 hover:border-ember-500/50 hover:shadow-lg hover:shadow-ember-500/10 flex flex-col">
            {c.imageUrl && (
              <div className="absolute inset-0 -z-10 opacity-10 transition-opacity group-hover:opacity-20">
                <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950 to-transparent" />
              </div>
            )}
            
            <div className="flex-1">
              <div className="mb-4 flex flex-wrap gap-2">
                {c.isFeatured && (
                  <span className="inline-block rounded-full bg-ember-500/10 px-3 py-1 text-xs text-ember-500 ring-1 ring-ember-500/20">
                    Featured
                  </span>
                )}
                {c.categories?.map(cat => (
                  <span key={cat} className="inline-block rounded-full bg-mist/5 px-2 py-1 text-xs text-mist ring-1 ring-mist/10">
                    {cat}
                  </span>
                ))}
              </div>
              <h3 className="font-display text-xl text-parchment group-hover:text-ember-400 transition-colors">{c.name}</h3>
              <p className="mt-2 text-sm text-mist line-clamp-3">{c.description}</p>
            </div>
            <div className="mt-6 text-sm font-medium text-ember-500 flex items-center gap-1 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0">
              View Profile &rarr;
            </div>
          </Link>
        ))}
      </div>
        {data?.length === 0 && <p className="mt-12 text-center text-mist">No charities match your search.</p>}
    </div>
  );
}
