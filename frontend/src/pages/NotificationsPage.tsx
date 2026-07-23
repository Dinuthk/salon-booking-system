import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../api/endpoints';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationApi.mine,
    refetchInterval: 5000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div className="container">
      <div className="title-row">
        <h1>Notifications</h1>
        <p className="muted">Delivered via push / email / SMS with automatic fallback.</p>
      </div>

      {isLoading && <p className="muted">Loading…</p>}
      {data && data.length === 0 && (
        <div className="card"><p className="muted">No notifications yet.</p></div>
      )}

      <div className="grid">
        {data?.map((n) => (
          <div
            key={n._id}
            className="card row between"
            style={{ padding: '16px 18px', borderColor: n.read ? 'var(--border)' : 'var(--brand)' }}
          >
            <div>
              <div className="row" style={{ gap: 8 }}>
                <strong>{n.title}</strong>
                {!n.read && <span className="tag">new</span>}
              </div>
              <p style={{ margin: '4px 0 0' }}>{n.body}</p>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                via {n.deliveredChannel || 'n/a'} · {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
            {!n.read && (
              <button className="btn ghost sm" onClick={() => markRead.mutate(n._id)}>
                Mark read
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
