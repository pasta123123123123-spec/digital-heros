import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Charity } from '../types';

export function Home() {
  const { data } = useQuery({
    queryKey: ['featured-charity'],
    queryFn: async () => (await api.get<{ charity: Charity | null }>('/charities/featured')).data.charity,
  });

  return (
    <div>
      <section className="mx-auto max-w-4xl px-6 pb-24 pt-20 text-center">
        <p className="text-mist">A monthly prize draw powered by your best round</p>
        <h1 className="mt-4 font-display text-5xl leading-tight sm:text-6xl">
          Play your round.
          <br />
          Back a cause that matters.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-mist">
          Subscribe, log your last five Stableford scores, and you're automatically entered into
          this month's draw — with part of every subscription going straight to a charity you
          choose.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link to="/signup" className="btn-primary">
            Subscribe &amp; join the draw
          </Link>
          <Link to="/charities" className="btn-secondary">
            See the charities
          </Link>
        </div>
      </section>

      <section className="border-t border-mist/10 bg-ink-900">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 py-16 sm:grid-cols-3">
          <HowItWorksStep
            n="1"
            title="Log your scores"
            body="Enter your last five Stableford rounds. Only your most recent five ever count."
          />
          <HowItWorksStep
            n="2"
            title="Get drawn in"
            body="Every active subscriber is issued a ticket each month, entered automatically — nothing to pick."
          />
          <HowItWorksStep
            n="3"
            title="Give back"
            body="At least 10% of your subscription goes to the charity you pick, win or not."
          />
        </div>
      </section>

      {data && (
        <section className="mx-auto max-w-4xl px-6 py-20">
          <p className="text-sm text-mist">This month's spotlight</p>
          <h2 className="mt-2 font-display text-3xl">{data.name}</h2>
          <p className="mt-4 max-w-2xl text-mist">{data.description}</p>
          <Link to={`/charities`} className="mt-6 inline-block text-ember-500 hover:text-ember-600">
            Browse all charities →
          </Link>
        </section>
      )}
    </div>
  );
}

function HowItWorksStep({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-ember-500 text-ember-500">
        {n}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-mist">{body}</p>
    </div>
  );
}
