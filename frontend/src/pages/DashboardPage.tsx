import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../api/endpoints';

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>{label}</p>
      <div style={{ fontSize: 28, fontWeight: 800, color: tone || 'var(--ink)' }}>{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['owner-report'], queryFn: reportApi.owner });

  if (isLoading) return <div className="container"><p className="muted">Loading…</p></div>;
  if (!data) return <div className="container"><p className="error">Could not load dashboard.</p></div>;

  const maxRev = Math.max(1, ...data.revenueByDay.map((d) => d.amount));

  return (
    <div className="container">
      <div className="title-row">
        <h1>Business dashboard</h1>
        <p className="muted">Built live from booking &amp; payment events.</p>
      </div>

      <div className="grid cols-3" style={{ marginBottom: 20 }}>
        <Stat label="Revenue (completed)" value={`LKR ${data.revenue}`} tone="var(--ok)" />
        <Stat label="Total bookings" value={data.totalBookings} />
        <Stat label="Completed" value={data.completed} tone="var(--brand)" />
        <Stat label="Confirmed" value={data.confirmed} />
        <Stat label="Cancellation rate" value={`${data.cancellationRate}%`} tone="var(--warn)" />
        <Stat label="No-show rate" value={`${data.noShowRate}%`} tone="var(--danger)" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="card">
          <h2>Revenue — last 7 days</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, marginTop: 12 }}>
            {data.revenueByDay.map((d) => (
              <div key={d.date} style={{ flex: 1, textAlign: 'center' }}>
                <div
                  title={`LKR ${d.amount}`}
                  style={{
                    height: `${(d.amount / maxRev) * 130}px`,
                    background: 'linear-gradient(180deg, #a78bfa, #6d28d9)',
                    borderRadius: '6px 6px 0 0',
                    minHeight: 3,
                  }}
                />
                <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>
                  {d.date.slice(5)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Popular services</h2>
          {data.popularServices.length === 0 && <p className="muted">No data yet.</p>}
          {data.popularServices.map((s) => (
            <div key={s.name} className="row between" style={{ padding: '6px 0' }}>
              <span>{s.name}</span>
              <span className="tag">{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
