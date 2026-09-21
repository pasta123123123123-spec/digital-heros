import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../api/client';
import { Charity, Subscription } from '../types';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export function CharityProfile() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [customAmount, setCustomAmount] = useState('25');
  const { user } = useAuth();

  useEffect(() => {
    if (searchParams.get('donation') === 'success') {
      toast.success('Thank you for your generous donation!', { duration: 5000 });
      searchParams.delete('donation');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  const donateMutation = useMutation({
    mutationFn: (amount: number) => api.post<{ checkoutUrl: string }>(`/charities/${id}/donate`, { amount }),
    onSuccess: (res) => {
      window.location.href = res.data.checkoutUrl;
    },
  });

  const handleDonate = () => {
    const amt = Number(customAmount);
    if (amt > 0) donateMutation.mutate(amt);
  };

  const { data: charity, isLoading, error } = useQuery({
    queryKey: ['charities', id],
    queryFn: async () => (await api.get<{ charity: Charity }>(`/charities/${id}`)).data.charity,
  });

  const { data: subscription } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: async () => (await api.get<{ subscription: Subscription | null }>('/subscriptions/me')).data.subscription,
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-mist animate-pulse">Loading profile…</p>
      </div>
    );
  }

  if (error || !charity) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-display text-3xl">Charity Not Found</h1>
        <p className="mt-2 text-mist">We couldn't find the charity you're looking for.</p>
        <Link to="/charities" className="mt-8 inline-block btn-secondary">
          &larr; Back to Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-mist/10 bg-ink-900 pt-24 pb-16">
        {charity.imageUrl && (
          <div className="absolute inset-0 -z-10 opacity-30">
            <img src={charity.imageUrl} alt={charity.name} className="h-full w-full object-cover blur-sm" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/80 to-transparent" />
          </div>
        )}
        <div className="mx-auto max-w-4xl px-6">
          <Link to="/charities" className="text-sm text-mist hover:text-ember-500 mb-8 inline-block transition-colors">
            &larr; Back to Directory
          </Link>
          
          <div className="flex flex-wrap gap-3 mb-6">
            {charity.isFeatured && (
              <span className="inline-block rounded-full bg-ember-500/20 px-4 py-1.5 text-sm text-ember-400 ring-1 ring-ember-500/40 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                Featured Cause
              </span>
            )}
            {charity.categories?.map(cat => (
              <span key={cat} className="inline-block rounded-full bg-mist/10 px-4 py-1.5 text-sm text-mist ring-1 ring-mist/20">
                {cat}
              </span>
            ))}
          </div>

          <h1 className="font-display text-5xl sm:text-6xl text-transparent bg-clip-text bg-gradient-to-br from-parchment to-mist pb-2">
            {charity.name}
          </h1>
          
          <p className="mt-6 max-w-2xl text-lg text-mist/90 leading-relaxed">
            {charity.description}
          </p>

          <div className="mt-10 flex flex-wrap gap-4 items-center">
            {subscription === undefined && user ? null : !subscription ? (
              <Link to={`/subscribe?charity=${charity.id}`} className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4 shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:shadow-[0_0_40px_rgba(249,115,22,0.5)] transition-all">
                Support via Subscription
                <span>&rarr;</span>
              </Link>
            ) : subscription.charityId === charity.id ? (
              <div className="px-6 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 font-medium flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                ✓ You are actively supporting this cause through your subscription
              </div>
            ) : (
              <Link to="/dashboard" className="btn-secondary inline-flex items-center gap-2 text-lg px-8 py-4">
                Switch your subscription here in Dashboard
                <span>&rarr;</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Independent Donation Widget */}
      <section className="mx-auto max-w-4xl px-6 -mt-8 relative z-10">
        <div className="card bg-ink-900/90 backdrop-blur-xl border border-mist/10 shadow-2xl p-8 rounded-2xl">
          <h2 className="font-display text-2xl mb-2 text-parchment">Make a One-Time Donation</h2>
          <p className="text-mist mb-6">100% of independent donations go directly to {charity.name}.</p>
          
          <div className="flex flex-wrap gap-4 items-center">
            {user ? (
              <>
                {[10, 25, 50].map(amt => (
                  <button 
                    key={amt}
                    onClick={() => setCustomAmount(amt.toString())}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${customAmount === amt.toString() ? 'bg-ember-500 text-ink-950 ring-2 ring-ember-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-mist/5 text-mist hover:bg-mist/10 ring-1 ring-mist/20'}`}
                  >
                    ${amt}
                  </button>
                ))}
                
                <div className="relative flex-1 min-w-[150px]">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-mist font-medium">$</span>
                  <input 
                    type="number"
                    min="1"
                    placeholder="Custom Amount"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full bg-ink-950/50 border border-mist/20 rounded-lg py-3 pl-8 pr-4 text-parchment focus:border-ember-500 focus:ring-1 focus:ring-ember-500 outline-none transition-all"
                  />
                </div>
                
                <button 
                  onClick={handleDonate}
                  disabled={donateMutation.isPending || !Number(customAmount) || Number(customAmount) < 1}
                  className="btn-primary py-3 px-8 text-base shadow-[0_0_15px_rgba(249,115,22,0.2)] disabled:opacity-50"
                >
                  {donateMutation.isPending ? 'Processing...' : 'Donate Now'}
                </button>
              </>
            ) : (
              <div className="w-full bg-mist/5 border border-mist/10 rounded-lg p-6 text-center">
                <p className="text-mist mb-4">Please log in to make a one-time donation.</p>
                <Link to={`/login?next=/charities/${charity.id}`} className="btn-secondary px-6 py-2">
                  Log in
                </Link>
              </div>
            )}
          </div>
          {donateMutation.isError && (
            <p className="text-red-400 mt-4 text-sm">{apiErrorMessage(donateMutation.error, 'Failed to initiate donation')}</p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6 mt-16 space-y-24">
        
        {/* Gallery Section */}
        {charity.imageUrls && charity.imageUrls.length > 0 && (
          <section>
            <h2 className="font-display text-3xl mb-8 flex items-center gap-4">
              <span className="h-px bg-mist/20 flex-1"></span>
              Gallery
              <span className="h-px bg-mist/20 flex-1"></span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {charity.imageUrls.map((img, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden ring-1 ring-mist/10 group">
                  <img 
                    src={img} 
                    alt={`Gallery image ${i + 1}`} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Events Section */}
        {charity.events && charity.events.length > 0 && (
          <section>
            <h2 className="font-display text-3xl mb-8 flex items-center gap-4">
              <span className="h-px bg-mist/20 flex-1"></span>
              Upcoming Events
              <span className="h-px bg-mist/20 flex-1"></span>
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {charity.events.map(event => (
                <div key={event.id} className="card relative overflow-hidden group">
                  {event.imageUrl && (
                    <div className="absolute inset-0 -z-10 opacity-20">
                      <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 to-transparent" />
                    </div>
                  )}
                  <div className="flex flex-col h-full">
                    <div className="mb-4 inline-block bg-ink-950/80 backdrop-blur-md rounded-lg px-4 py-2 ring-1 ring-mist/20 w-max">
                      <span className="block text-sm font-semibold text-ember-500">
                        {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <h3 className="font-display text-2xl text-parchment group-hover:text-ember-400 transition-colors">
                      {event.title}
                    </h3>
                    {event.description && (
                      <p className="mt-3 text-mist text-sm flex-1">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
