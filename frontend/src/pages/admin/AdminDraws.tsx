import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client';

const now = new Date();

export function AdminDraws() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [type, setType] = useState<'RANDOM' | 'ALGORITHMIC'>('RANDOM');
  const [preview, setPreview] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: draws } = useQuery({
    queryKey: ['admin-draws'],
    queryFn: async () => (await api.get('/draws')).data.draws as any[],
  });

  const simulate = useMutation({
    mutationFn: () => api.post('/draws/simulate', { month, year, type }),
    onSuccess: (res) => {
      setError(null);
      setPreview(res.data);
    },
    onError: (err) => setError(apiErrorMessage(err, 'Simulation failed')),
  });

  const publish = useMutation({
    mutationFn: () => api.post('/draws/publish', { month, year, type }),
    onSuccess: () => {
      setError(null);
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ['admin-draws'] });
    },
    onError: (err) => setError(apiErrorMessage(err, 'Publish failed')),
  });

  return (
    <div className="space-y-8">
      <section className="card">
        <h2 className="font-display text-xl">Run a draw cycle</h2>
        <p className="mt-1 text-sm text-mist">
          Simulate first to review the pool and winners — nothing is written until you publish.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="month">Month</label>
            <input
              id="month"
              type="number"
              min={1}
              max={12}
              className="input w-24"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label" htmlFor="year">Year</label>
            <input
              id="year"
              type="number"
              className="input w-28"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label" htmlFor="type">Draw type</label>
            <select
              id="type"
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value as 'RANDOM' | 'ALGORITHMIC')}
            >
              <option value="RANDOM">Random</option>
              <option value="ALGORITHMIC">Algorithmic (score-weighted)</option>
            </select>
          </div>
          <button onClick={() => simulate.mutate()} disabled={simulate.isPending} className="btn-secondary">
            {simulate.isPending ? 'Simulating…' : 'Simulate'}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        {preview && (
          <div className="mt-6 rounded-md border border-ember-500/30 bg-ember-500/5 p-4">
            <p className="text-sm text-mist">Winning numbers</p>
            <p className="font-display text-2xl">{preview.preview.winningNumbers.join(' — ')}</p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <p>5-match: {preview.preview.winnersByTier.FIVE.length} winner(s)</p>
              <p>4-match: {preview.preview.winnersByTier.FOUR.length} winner(s)</p>
              <p>3-match: {preview.preview.winnersByTier.THREE.length} winner(s)</p>
            </div>
            <p className="mt-2 text-sm text-mist">
              Total pool: ${String(preview.draw.totalPoolAmount)} · Eligible subscribers:{' '}
              {preview.draw.eligibleSubscriberCount}
            </p>
            <button
              onClick={() => publish.mutate()}
              disabled={publish.isPending}
              className="btn-primary mt-4"
            >
              {publish.isPending ? 'Publishing…' : 'Publish this draw'}
            </button>
          </div>
        )}
      </section>

      <section className="card overflow-x-auto">
        <h2 className="font-display text-xl">Draw history</h2>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-mist">
            <tr>
              <th className="pb-2">Cycle</th>
              <th className="pb-2">Type</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Pool</th>
              <th className="pb-2">Rollover out</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist/10">
            {draws?.map((d) => (
              <tr key={d.id}>
                <td className="py-2">{d.month}/{d.year}</td>
                <td className="py-2">{d.type}</td>
                <td className="py-2">{d.status}</td>
                <td className="py-2">${String(d.totalPoolAmount ?? '—')}</td>
                <td className="py-2">${String(d.jackpotRolloverOut ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {draws?.length === 0 && <p className="mt-4 text-mist">No draws run yet.</p>}
      </section>
    </div>
  );
}
