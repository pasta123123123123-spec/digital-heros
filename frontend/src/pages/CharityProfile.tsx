import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Charity } from '../types';

export function CharityProfile() {
  const { id } = useParams<{ id: string }>();

  const { data: charity, isLoading, error } = useQuery({
    queryKey: ['charities', id],
    queryFn: async () => (await api.get<{ charity: Charity }>(`/charities/${id}`)).data.charity,
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

          <div className="mt-10">
            <Link to={`/subscribe?charity=${charity.id}`} className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4 shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:shadow-[0_0_40px_rgba(249,115,22,0.5)] transition-all">
              Support this cause
              <span>&rarr;</span>
            </Link>
          </div>
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
