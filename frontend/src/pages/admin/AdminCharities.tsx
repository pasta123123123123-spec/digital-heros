import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client';
import { Charity } from '../../types';

export function AdminCharities() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUrls, setImageUrls] = useState('');

  const { data: charities } = useQuery({
    queryKey: ['charities'],
    queryFn: async () => (await api.get<{ charities: Charity[] }>('/charities')).data.charities,
  });

  const create = useMutation({
    mutationFn: () => api.post('/charities', { 
      name, 
      description,
      categories: categories.split(',').map(s => s.trim()).filter(Boolean),
      imageUrl: imageUrl.trim() || undefined,
      imageUrls: imageUrls.split(',').map(s => s.trim()).filter(Boolean)
    }),
    onSuccess: () => {
      setName('');
      setDescription('');
      setCategories('');
      setImageUrl('');
      setImageUrls('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['charities'] });
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not create charity')),
  });

  const toggleFeatured = useMutation({
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) =>
      api.patch(`/charities/${id}`, { isFeatured }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['charities'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/charities/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['charities'] }),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      setError('Name and description are required');
      return;
    }
    create.mutate();
  }

  return (
    <div className="space-y-8">
      <section className="card">
        <h2 className="font-display text-xl">Add a charity</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="label" htmlFor="c-name">Name</label>
            <input id="c-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="c-desc">Description</label>
            <textarea
              id="c-desc"
              className="input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="c-cat">Categories (comma-separated)</label>
            <input id="c-cat" className="input" placeholder="e.g. Youth, Education" value={categories} onChange={(e) => setCategories(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="c-img">Primary Image URL</label>
            <input id="c-img" type="url" className="input" placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="c-imgs">Gallery Image URLs (comma-separated)</label>
            <input id="c-imgs" className="input" placeholder="https://..., https://..." value={imageUrls} onChange={(e) => setImageUrls(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={create.isPending} className="btn-primary">
            {create.isPending ? 'Adding…' : 'Add charity'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="font-display text-xl">Manage charities</h2>
        <ul className="mt-4 divide-y divide-mist/10">
          {charities?.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-mist">{c.description}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => toggleFeatured.mutate({ id: c.id, isFeatured: !c.isFeatured })}
                  className="btn-secondary !px-3 !py-1.5 text-xs"
                >
                  {c.isFeatured ? 'Unfeature' : 'Feature'}
                </button>
                <button
                  onClick={() => remove.mutate(c.id)}
                  className="btn-secondary !px-3 !py-1.5 text-xs hover:!border-red-400 hover:!text-red-400"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
