import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client';
import { Score } from '../../types';

interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  subscription: { plan: string; status: string; currentPeriodEnd: string | null } | null;
}

interface AdminUserDetails extends AdminUserRow {
  scores: Score[];
}

export function AdminUsers() {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await api.get<{ users: AdminUserRow[] }>('/admin/users')).data.users,
  });

  if (isLoading) return <p className="text-mist">Loading...</p>;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-mist">
          <tr>
            <th className="pb-3">Name</th>
            <th className="pb-3">Email</th>
            <th className="pb-3">Plan</th>
            <th className="pb-3">Status</th>
            <th className="pb-3">Joined</th>
            <th className="pb-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-mist/10">
          {data?.map((u) => (
            <UserRow 
              key={u.id} 
              user={u} 
              isExpanded={expandedUserId === u.id}
              onToggle={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)}
            />
          ))}
        </tbody>
      </table>
      {data?.length === 0 && <p className="py-4 text-mist">No users yet.</p>}
    </div>
  );
}

function UserRow({ user, isExpanded, onToggle }: { user: AdminUserRow, isExpanded: boolean, onToggle: () => void }) {
  return (
    <>
      <tr className="hover:bg-mist/5">
        <td className="py-3">{user.name}</td>
        <td className="py-3 text-mist">{user.email}</td>
        <td className="py-3">{user.subscription?.plan ?? '—'}</td>
        <td className="py-3">{user.subscription?.status ?? '—'}</td>
        <td className="py-3 text-mist">{new Date(user.createdAt).toLocaleDateString()}</td>
        <td className="py-3">
          <button onClick={onToggle} className="text-ember-500 hover:underline">
            {isExpanded ? 'Close' : 'Manage'}
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="bg-ink-900 p-4 border-b border-mist/10">
            <UserManagePanel userId={user.id} />
          </td>
        </tr>
      )}
    </>
  );
}

function UserManagePanel({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: userDetails, isLoading } = useQuery({
    queryKey: ['admin-user', userId],
    queryFn: async () => (await api.get<{ user: AdminUserDetails }>(`/admin/users/${userId}`)).data.user,
  });

  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const updateProfile = useMutation({
    mutationFn: () => api.patch(`/admin/users/${userId}`, { name: editName, email: editEmail }),
    onSuccess: () => {
      setIsEditingProfile(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not update profile')),
  });

  const cancelSubscription = useMutation({
    mutationFn: () => api.post(`/admin/users/${userId}/subscription/cancel`),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not cancel subscription')),
  });

  if (isLoading) return <p className="text-sm text-mist">Loading user details...</p>;
  if (!userDetails) return null;

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-400">{error}</p>}
      
      <div>
        <div className="flex items-center gap-4 mb-2">
          <h3 className="font-semibold text-parchment">Profile</h3>
          {!isEditingProfile && (
            <button 
              onClick={() => {
                setEditName(userDetails.name);
                setEditEmail(userDetails.email);
                setIsEditingProfile(true);
              }}
              className="text-xs text-ember-500 hover:underline"
            >
              Edit Profile
            </button>
          )}
        </div>
        
        {isEditingProfile ? (
          <div className="flex items-end gap-3 max-w-lg">
            <div className="flex-1">
              <label className="label">Name</label>
              <input type="text" className="input py-1" value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="label">Email</label>
              <input type="email" className="input py-1" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
            </div>
            <button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} className="btn-primary py-1.5 px-3">
              Save
            </button>
            <button onClick={() => setIsEditingProfile(false)} className="btn-secondary py-1.5 px-3">
              Cancel
            </button>
          </div>
        ) : (
          <div className="text-sm">
            <p><strong>Name:</strong> {userDetails.name}</p>
            <p><strong>Email:</strong> {userDetails.email}</p>
          </div>
        )}
      </div>

      <AdminScoresPanel userId={userId} scores={userDetails.scores} />

      <div>
        <h3 className="font-semibold text-parchment mb-2">Subscription</h3>
        {!userDetails.subscription ? (
          <p className="text-sm text-mist">No subscription active.</p>
        ) : (
          <div className="text-sm flex flex-col gap-2">
            <p><strong>Plan:</strong> {userDetails.subscription.plan} | <strong>Status:</strong> {userDetails.subscription.status}</p>
            {userDetails.subscription.status === 'ACTIVE' && (
              <button 
                onClick={() => {
                  if (confirm('Are you sure you want to cancel this user\'s subscription?')) {
                    cancelSubscription.mutate();
                  }
                }}
                disabled={cancelSubscription.isPending}
                className="self-start text-xs text-red-400 border border-red-400/30 rounded px-2 py-1 hover:bg-red-400/10"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminScoresPanel({ userId, scores }: { userId: string; scores: Score[] }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [addValue, setAddValue] = useState(20);
  const [addPlayedOn, setAddPlayedOn] = useState(() => new Date().toISOString().slice(0, 10));

  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(20);
  const [editPlayedOn, setEditPlayedOn] = useState('');

  const addScore = useMutation({
    mutationFn: () => api.post(`/admin/users/${userId}/scores`, { value: addValue, playedOn: new Date(addPlayedOn).toISOString() }),
    onSuccess: () => {
      setIsAdding(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not add score')),
  });

  const updateScore = useMutation({
    mutationFn: () => api.patch(`/admin/users/${userId}/scores/${editingScoreId}`, { value: editValue, playedOn: new Date(editPlayedOn).toISOString() }),
    onSuccess: () => {
      setEditingScoreId(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not update score')),
  });

  const deleteScore = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${userId}/scores/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-user', userId] }),
  });

  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        <h3 className="font-semibold text-parchment">Scores</h3>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="text-xs text-ember-500 hover:underline">
            + Add Score
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-400 mb-2">{error}</p>}

      {isAdding && (
        <div className="flex flex-wrap items-center gap-3 mb-4 text-sm bg-mist/5 p-2 rounded">
          <input type="date" className="input py-1 px-2 w-auto" value={addPlayedOn} onChange={e => setAddPlayedOn(e.target.value)} />
          <input type="number" min={1} max={45} className="input w-20 py-1 px-2" value={addValue} onChange={e => setAddValue(Number(e.target.value))} />
          <button onClick={() => addScore.mutate()} disabled={addScore.isPending} className="btn-primary py-1 px-2 text-xs">Save</button>
          <button onClick={() => setIsAdding(false)} className="btn-secondary py-1 px-2 text-xs">Cancel</button>
        </div>
      )}

      <ul className="divide-y divide-mist/10 text-sm max-w-lg">
        {scores.map(s => (
          <li key={s.id} className="py-2">
            {editingScoreId === s.id ? (
              <div className="flex flex-wrap items-center gap-3">
                <input type="date" className="input py-1 px-2 w-auto" value={editPlayedOn} onChange={e => setEditPlayedOn(e.target.value)} />
                <input type="number" min={1} max={45} className="input w-20 py-1 px-2" value={editValue} onChange={e => setEditValue(Number(e.target.value))} />
                <button onClick={() => updateScore.mutate()} disabled={updateScore.isPending} className="text-ember-500 hover:underline">Save</button>
                <button onClick={() => setEditingScoreId(null)} className="text-mist hover:underline">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-mist">{new Date(s.playedOn).toLocaleDateString()}</span>
                  <span className="ml-4 font-semibold">{s.value} pts</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => {
                    setEditingScoreId(s.id);
                    setEditValue(s.value);
                    setEditPlayedOn(s.playedOn.slice(0, 10));
                  }} className="text-xs text-mist hover:text-ember-500">Edit</button>
                  <button onClick={() => {
                    if (confirm('Delete this score?')) deleteScore.mutate(s.id);
                  }} className="text-xs text-mist hover:text-red-400">Delete</button>
                </div>
              </div>
            )}
          </li>
        ))}
        {scores.length === 0 && <p className="text-sm text-mist py-2">No scores for this user.</p>}
      </ul>
    </div>
  );
}
