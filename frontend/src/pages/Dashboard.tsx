import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../api/client';
import { Score, Subscription, WinnerClaim, Charity } from '../types';

export function Dashboard() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 py-12">
      <h1 className="font-display text-4xl">Your dashboard</h1>
      <SubscriptionCard />
      <ScoresCard />
      <ParticipationCard />
      <WinningsCard />
    </div>
  );
}

function SubscriptionCard() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [charityId, setCharityId] = useState('');
  const [pct, setPct] = useState(10);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: async () => (await api.get<{ subscription: Subscription | null }>('/subscriptions/me')).data.subscription,
  });

  const { data: charities } = useQuery({
    queryKey: ['charities'],
    queryFn: async () => (await api.get<{ charities: Charity[] }>('/charities')).data.charities,
  });

  const updateSubscription = useMutation({
    mutationFn: () => api.patch('/subscriptions/me', { charityId, charityContributionPct: pct }),
    onSuccess: () => {
      setIsEditing(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not update subscription')),
  });

  if (isLoading) return <SectionSkeleton title="Subscription" />;

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Subscription</h2>
        {data && !isEditing && (
          <button onClick={() => {
            setCharityId(data.charityId || '');
            setPct(data.charityContributionPct || 10);
            setIsEditing(true);
          }} className="text-sm text-ember-500 hover:underline">
            Edit Charity
          </button>
        )}
      </div>

      {!data ? (
        <p className="mt-2 text-mist">
          You don't have a subscription yet. <a href="/subscribe" className="text-ember-500">Subscribe now</a>.
        </p>
      ) : isEditing ? (
        <div className="mt-4 space-y-4">
          <div>
            <label className="label" htmlFor="charity">Support a charity</label>
            <select
              id="charity"
              className="input"
              value={charityId}
              onChange={(e) => setCharityId(e.target.value)}
            >
              <option value="">Select a charity...</option>
              {charities?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pct">
              Contribution percentage ({pct}% of your subscription)
            </label>
            <input
              id="pct"
              type="range"
              min={10}
              max={100}
              step={5}
              value={pct}
              onChange={(e) => setPct(Number(e.target.value))}
              className="w-full accent-ember-500"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => updateSubscription.mutate()} disabled={updateSubscription.isPending} className="btn-primary py-1.5 text-sm">
              Save
            </button>
            <button onClick={() => setIsEditing(false)} className="btn-secondary py-1.5 text-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
          <Field label="Plan" value={data.plan} />
          <Field label="Status" value={data.status} />
          <Field
            label="Renews"
            value={data.currentPeriodEnd ? new Date(data.currentPeriodEnd).toLocaleDateString() : '—'}
          />
          <Field label="Charity" value={data.charity?.name ?? '—'} />
          <Field label="Contribution" value={`${data.charityContributionPct || 10}%`} />
        </dl>
      )}
    </section>
  );
}

function ScoresCard() {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(20);
  const [playedOn, setPlayedOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(20);
  const [editPlayedOn, setEditPlayedOn] = useState('');

  const { data: scores } = useQuery({
    queryKey: ['my-scores'],
    queryFn: async () => (await api.get<{ scores: Score[] }>('/scores')).data.scores,
  });

  const addScore = useMutation({
    mutationFn: () => api.post('/scores', { value, playedOn: new Date(playedOn).toISOString() }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['my-scores'] });
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not save score')),
  });

  const updateScore = useMutation({
    mutationFn: () => api.patch(`/scores/${editingScoreId}`, { value: editValue, playedOn: new Date(editPlayedOn).toISOString() }),
    onSuccess: () => {
      setEditingScoreId(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['my-scores'] });
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not update score')),
  });

  const deleteScore = useMutation({
    mutationFn: (id: string) => api.delete(`/scores/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-scores'] }),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    addScore.mutate();
  }

  return (
    <section className="card">
      <h2 className="font-display text-xl">Scores</h2>
      <p className="mt-1 text-sm text-mist">
        Your last 5 rounds. Adding a 6th replaces the oldest automatically.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="score-date">Date</label>
          <input
            id="score-date"
            type="date"
            className="input"
            value={playedOn}
            onChange={(e) => setPlayedOn(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="score-value">Stableford score (1–45)</label>
          <input
            id="score-value"
            type="number"
            min={1}
            max={45}
            className="input w-28"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
          />
        </div>
        <button type="submit" disabled={addScore.isPending} className="btn-primary">
          {addScore.isPending ? 'Saving...' : 'Add score'}
        </button>
      </form>
      {error && !editingScoreId && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <ul className="mt-6 divide-y divide-mist/10">
        {scores?.map((s) => (
          <li key={s.id} className="py-3 text-sm flex flex-col gap-2">
            {editingScoreId === s.id ? (
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="date"
                  className="input py-1 px-2"
                  value={editPlayedOn}
                  onChange={(e) => setEditPlayedOn(e.target.value)}
                />
                <input
                  type="number"
                  min={1}
                  max={45}
                  className="input w-20 py-1 px-2"
                  value={editValue}
                  onChange={(e) => setEditValue(Number(e.target.value))}
                />
                <button onClick={() => updateScore.mutate()} disabled={updateScore.isPending} className="text-ember-500 hover:underline">
                  Save
                </button>
                <button onClick={() => setEditingScoreId(null)} className="text-mist hover:underline">
                  Cancel
                </button>
                {error && <span className="text-xs text-red-400">{error}</span>}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span>{new Date(s.playedOn).toLocaleDateString()}</span>
                <span className="font-semibold">{s.value} pts</span>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setEditingScoreId(s.id);
                      setEditValue(s.value);
                      setEditPlayedOn(s.playedOn.slice(0, 10));
                      setError(null);
                    }}
                    className="text-xs text-mist hover:text-ember-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteScore.mutate(s.id)}
                    className="text-xs text-mist hover:text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
        {scores?.length === 0 && <p className="py-3 text-sm text-mist">No scores logged yet.</p>}
      </ul>
    </section>
  );
}

function ParticipationCard() {
  const { data } = useQuery({
    queryKey: ['my-draws'],
    queryFn: async () => (await api.get('/draws/me')).data as { tickets: any[]; hasUpcomingDraw: boolean },
  });

  return (
    <section className="card">
      <h2 className="font-display text-xl">Draw participation</h2>
      <p className="mt-1 text-sm text-mist">
        {data?.hasUpcomingDraw
          ? "This month's draw hasn't been published yet — check back soon."
          : 'No draw currently in progress.'}
      </p>
      <ul className="mt-4 divide-y divide-mist/10">
        {data?.tickets?.map((t) => (
          <li key={t.id} className="py-3 text-sm">
            <span className="font-semibold">
              {t.draw.month}/{t.draw.year}
            </span>{' '}
            — numbers {t.numbers.join(', ')} — {t.matchTier ? `${t.matchTier}-match!` : 'no match'}
          </li>
        ))}
        {data?.tickets?.length === 0 && (
          <p className="py-3 text-sm text-mist">You haven't been entered into a draw yet.</p>
        )}
      </ul>
    </section>
  );
}

function WinningsCard() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['my-claims'],
    queryFn: async () => (await api.get<{ claims: WinnerClaim[] }>('/winners/me')).data.claims,
  });

  const uploadProof = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const form = new FormData();
      form.append('proof', file);
      return api.post(`/winners/${id}/proof`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['my-claims'] });
    },
    onError: (err) => setError(apiErrorMessage(err, 'Upload failed')),
  });

  return (
    <section className="card">
      <h2 className="font-display text-xl">Winnings</h2>
      <p className="mt-1 text-sm text-mist">
        Won a tier this month? Upload a screenshot of your scores to verify.
      </p>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <ul className="mt-4 divide-y divide-mist/10">
        {data?.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <span>{new Date(c.submittedAt).toLocaleDateString()}</span>
            <span className="font-semibold">${c.amountDue}</span>
            <StatusPill status={c.status} />
            {c.status === 'PENDING' && !c.proofUrl && (
              <label className="btn-secondary cursor-pointer !px-3 !py-1.5 text-xs">
                Upload proof
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadProof.mutate({ id: c.id, file });
                  }}
                />
              </label>
            )}
            {c.status === 'REJECTED' && c.rejectionReason && (
              <span className="w-full text-xs text-red-400">Reason: {c.rejectionReason}</span>
            )}
          </li>
        ))}
        {data?.length === 0 && <p className="py-3 text-sm text-mist">No winnings yet — good luck next draw!</p>}
      </ul>
    </section>
  );
}

function StatusPill({ status }: { status: WinnerClaim['status'] }) {
  const colors: Record<WinnerClaim['status'], string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-400',
    APPROVED: 'bg-blue-500/10 text-blue-400',
    REJECTED: 'bg-red-500/10 text-red-400',
    PAID: 'bg-green-500/10 text-green-400',
  };
  return <span className={`rounded-full px-3 py-1 text-xs ${colors[status]}`}>{status}</span>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-mist">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <section className="card">
      <h2 className="font-display text-xl">{title}</h2>
      <p className="mt-2 text-mist">Loading...</p>
    </section>
  );
}
