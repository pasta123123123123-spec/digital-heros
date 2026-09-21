import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client';
import { WinnerClaim } from '../../types';

interface AdminClaim extends WinnerClaim {
  user: { id: string; name: string; email: string };
}

const STATUS_FILTERS = ['PENDING', 'APPROVED', 'REJECTED', 'PAID'] as const;

export function AdminWinners() {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('PENDING');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: claims } = useQuery({
    queryKey: ['admin-claims', statusFilter],
    queryFn: async () =>
      (await api.get<{ claims: AdminClaim[] }>('/winners', { params: { status: statusFilter } })).data
        .claims,
  });

  const review = useMutation({
    mutationFn: ({ id, decision, rejectionReason }: { id: string; decision: 'APPROVED' | 'REJECTED'; rejectionReason?: string }) =>
      api.post(`/winners/${id}/review`, { decision, rejectionReason }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-claims'] });
    },
    onError: (err) => setError(apiErrorMessage(err, 'Review failed')),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => api.post(`/winners/${id}/pay`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-claims'] }),
    onError: (err) => setError(apiErrorMessage(err, 'Could not mark as paid')),
  });

  return (
    <div className="card">
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs ${
              statusFilter === s ? 'bg-ember-500 text-ink-950' : 'bg-ink-900 text-mist'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <ul className="mt-6 divide-y divide-mist/10">
        {claims?.map((c) => (
          <li key={c.id} className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{c.user.name} — ${c.amountDue}</p>
                <p className="text-sm text-mist">{c.user.email}</p>
                {c.proofUrl ? (
                  <a
                    href={c.proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm text-ember-500 hover:text-ember-600"
                  >
                    View submitted proof →
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-mist">No proof submitted yet</p>
                )}
              </div>

              <div className="flex gap-2">
                {c.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => review.mutate({ id: c.id, decision: 'APPROVED' })}
                      className="btn-secondary !px-3 !py-1.5 text-xs"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        const reason = window.prompt('Reason for rejection:');
                        if (reason) review.mutate({ id: c.id, decision: 'REJECTED', rejectionReason: reason });
                      }}
                      className="btn-secondary !px-3 !py-1.5 text-xs hover:!border-red-400 hover:!text-red-400"
                    >
                      Reject
                    </button>
                  </>
                )}
                {c.status === 'APPROVED' && (
                  <button onClick={() => markPaid.mutate(c.id)} className="btn-primary !px-3 !py-1.5 text-xs">
                    Mark paid
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
        {claims?.length === 0 && <p className="py-4 text-mist">No claims with this status.</p>}
      </ul>
    </div>
  );
}
