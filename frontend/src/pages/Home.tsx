import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { Charity } from '../types';

export function Home() {
  const { data: charity } = useQuery({
    queryKey: ['featured-charity'],
    queryFn: async () => (await api.get<{ charity: Charity | null }>('/charities/featured')).data.charity,
  });

  return (
    <div className="bg-ink-950 min-h-screen overflow-hidden">
      {/* Hero Section */}
      <section className="relative px-6 py-32 sm:py-48 flex items-center justify-center">
        {/* Ambient Glow Background */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-ember-500/20 rounded-full blur-[120px] animate-pulse-glow" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-mist/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto space-y-8">
          <div className="inline-block px-4 py-1.5 rounded-full border border-mist/20 bg-ink-900/50 backdrop-blur-md mb-4 text-mist text-sm uppercase tracking-wider font-semibold">
            Performance Meets Purpose
          </div>
          
          <h1 className="font-display text-5xl sm:text-7xl leading-[1.1] text-transparent bg-clip-text bg-gradient-to-br from-parchment via-parchment to-mist/50">
            Play your round. <br />
            Back a cause that matters.
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-mist/90 leading-relaxed font-light">
            Subscribe, log your last five scores, and you're automatically entered into
            this month's draw — with part of every subscription going straight to a charity you choose.
          </p>
          
          <div className="pt-8 flex flex-wrap justify-center gap-6">
            <Link to="/signup" className="btn-primary text-lg px-8 py-4 shadow-[0_0_30px_rgba(249,115,22,0.2)] hover:shadow-[0_0_50px_rgba(249,115,22,0.4)]">
              Subscribe &amp; join the draw &rarr;
            </Link>
            <Link to="/charities" className="btn-secondary text-lg px-8 py-4 bg-ink-900/50 backdrop-blur-sm border-mist/20 hover:bg-mist/10">
              Explore charities
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="relative py-32 border-t border-mist/10 bg-ink-900/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="font-display text-4xl sm:text-5xl text-parchment">How it works</h2>
            <p className="mt-4 text-lg text-mist">Three simple steps to combine your play with real impact.</p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-mist/20 to-transparent -translate-y-1/2 z-0" />
            
            <HowItWorksStep
              n="01"
              title="Log your scores"
              body="Enter your latest rounds. We keep track of your most recent five, automatically dropping the oldest as you play more."
            />
            <HowItWorksStep
              n="02"
              title="Get drawn in"
              body="Every active subscriber is issued a digital ticket each month and entered automatically. No picking numbers required."
            />
            <HowItWorksStep
              n="03"
              title="Give back"
              body="A minimum of 10% of your subscription goes directly to the charity you pick, whether you win the draw or not."
            />
          </div>
        </div>
      </section>

      {/* Charity Spotlight Section */}
      {charity && (
        <section className="relative py-40 overflow-hidden border-t border-ember-500/10">
          {charity.imageUrl && (
            <div className="absolute inset-0 -z-10 bg-ink-950">
              <img 
                src={charity.imageUrl} 
                alt={charity.name} 
                className="w-full h-full object-cover opacity-20 scale-105 animate-slow-pan" 
                style={{ objectPosition: 'center' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/60 to-transparent" />
            </div>
          )}
          
          <div className="max-w-5xl mx-auto px-6 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full border border-ember-500/30 bg-ember-500/10 text-ember-400 text-sm uppercase tracking-wider font-semibold mb-6 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
              This Month's Spotlight
            </span>
            
            <h2 className="font-display text-5xl sm:text-6xl text-parchment mb-8">{charity.name}</h2>
            
            <p className="max-w-3xl mx-auto text-xl text-mist leading-relaxed font-light mb-12">
              "{charity.description}"
            </p>
            
            <Link to={`/charities/${charity.id}`} className="inline-flex items-center gap-2 text-lg font-medium text-ember-400 hover:text-ember-300 transition-colors group">
              See their full profile and upcoming events
              <span className="transform group-hover:translate-x-1 transition-transform">&rarr;</span>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function HowItWorksStep({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="card relative z-10 group overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_10_40px_rgba(224,138,60,0.1)] hover:border-ember-500/30 bg-ink-900/80 backdrop-blur-xl">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-ember-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="text-4xl font-display font-light text-mist/30 mb-6 group-hover:text-ember-500/50 transition-colors duration-500">
        {n}
      </div>
      
      <h3 className="text-2xl font-display text-parchment mb-3 group-hover:text-ember-400 transition-colors duration-300">{title}</h3>
      <p className="text-mist/90 leading-relaxed font-light">{body}</p>
    </div>
  );
}
