import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../api/client';
import { Charity } from '../types';

export function Subscribe() {
  const [plan, setPlan] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [charityId, setCharityId] = useState<string>('');
  const [pct, setPct] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: charities } = useQuery({
    queryKey: ['charities'],
    queryFn: async () => (await api.get<{ charities: Charity[] }>('/charities')).data.charities,
  });

  async function handleSubscribe() {
    if (!charityId) {
      setError('Please choose a charity to support.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post('/subscriptions/checkout', {
        plan,
        charityId,
        charityContributionPct: pct,
      });
      // Stripe Checkout confirms payment on Stripe's own hosted page; our
      // backend never trusts this redirect itself as proof of payment —
      // the webhook is what actually activates the subscription.
      window.location.href = res.data.checkoutUrl;
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not start checkout'));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-4xl">Choose your plan</h1>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <PlanOption
          label="Monthly"
          price="$15 / month"
          selected={plan === 'MONTHLY'}
          onClick={() => setPlan('MONTHLY')}
        />
        <PlanOption
          label="Yearly"
          price="$150 / year — save ~17%"
          selected={plan === 'YEARLY'}
          onClick={() => setPlan('YEARLY')}
        />
      </div>

      <div className="card mt-8">
        <label className="label" htmlFor="charity">Support a charity</label>
        <select
          id="charity"
          className="input"
          value={charityId}
          onChange={(e) => setCharityId(e.target.value)}
        >
          <option value="">Select a charity…</option>
          {charities?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="mt-4">
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
          <p className="mt-1 text-xs text-mist">Minimum 10% — increase anytime from your dashboard.</p>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <button onClick={handleSubscribe} disabled={submitting} className="btn-primary mt-8 w-full">
        {submitting ? 'Redirecting to checkout…' : 'Continue to payment'}
      </button>
    </div>
  );
}

function PlanOption({
  label,
  price,
  selected,
  onClick,
}: {
  label: string;
  price: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-5 text-left transition-colors ${
        selected ? 'border-ember-500 bg-ember-500/5' : 'border-mist/20 hover:border-mist/40'
      }`}
    >
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-sm text-mist">{price}</p>
    </button>
  );
}
