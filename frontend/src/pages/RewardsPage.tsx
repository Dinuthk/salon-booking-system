import { useQuery } from '@tanstack/react-query';
import { loyaltyApi } from '../api/endpoints';

const TIERS = ['bronze', 'silver', 'gold', 'platinum'];
const TIER_COLOR: Record<string, string> = {
  bronze: '#b45309',
  silver: '#6b7280',
  gold: '#d97706',
  platinum: '#6d28d9',
};

export default function RewardsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['loyalty'], queryFn: loyaltyApi.me });

  if (isLoading) return <div className="container"><p className="muted">Loading…</p></div>;
  if (!data) return <div className="container"><p className="error">Could not load rewards.</p></div>;

  return (
    <div className="container">
      <div className="title-row">
        <h1>My Rewards</h1>
        <p className="muted">Earn points on every completed appointment.</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row between">
          <div>
            <p className="muted" style={{ margin: 0 }}>Points balance</p>
            <div style={{ fontSize: 44, fontWeight: 800, color: 'var(--brand)' }}>{data.points}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span
              className="badge"
              style={{ background: '#f3f0fb', color: TIER_COLOR[data.tier], fontSize: 15, padding: '6px 14px' }}
            >
              {data.tier.toUpperCase()} TIER
            </span>
            {data.nextTier && (
              <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
                {data.pointsToNextTier} pts to {data.nextTier}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
          {TIERS.map((t) => (
            <div
              key={t}
              style={{
                flex: 1, height: 8, borderRadius: 4,
                background: TIERS.indexOf(t) <= TIERS.indexOf(data.tier) ? TIER_COLOR[data.tier] : 'var(--border)',
              }}
            />
          ))}
        </div>
      </div>

      <h2>Activity</h2>
      {data.ledger.length === 0 && <p className="muted">No activity yet. Complete a booking to earn points.</p>}
      <div className="grid">
        {data.ledger.map((e) => (
          <div key={e.id} className="card row between" style={{ padding: '14px 18px' }}>
            <div>
              <strong>{e.reason}</strong>
              <p className="muted" style={{ margin: '2px 0 0', fontSize: 13 }}>
                {new Date(e.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span style={{ fontWeight: 800, color: e.points >= 0 ? 'var(--ok)' : 'var(--danger)' }}>
              {e.points >= 0 ? '+' : ''}{e.points}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
