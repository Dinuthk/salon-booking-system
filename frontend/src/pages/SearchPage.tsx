import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { searchApi, SalonSummary } from '../api/endpoints';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [filters, setFilters] = useState<{ q?: string; city?: string }>({});
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['search', filters],
    queryFn: () => searchApi.search({ ...filters, limit: 30 }),
  });

  return (
    <div className="container">
      <div className="title-row">
        <h1>Find your salon</h1>
        <p className="muted">Discover salons, compare services and book in real time.</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row">
          <input
            placeholder="Search salons or services…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: 2, minWidth: 200 }}
          />
          <input
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            style={{ flex: 1, minWidth: 140 }}
          />
          <button
            className="btn"
            onClick={() => setFilters({ q: q || undefined, city: city || undefined })}
          >
            Search
          </button>
        </div>
      </div>

      {isLoading && <p className="muted">Loading salons…</p>}
      {isError && <p className="error">Could not load salons. Is the stack running?</p>}
      {data && data.items.length === 0 && (
        <div className="card">
          <p className="muted">
            No salons found. Sign up as an <strong>owner</strong>, create a salon and add a service —
            it becomes bookable right away.
          </p>
        </div>
      )}

      <div className="grid cols-3">
        {data?.items.map((s: SalonSummary) => (
          <div key={s.salonId} className="card salon-card" onClick={() => navigate(`/salons/${s.salonId}`)}>
            <div className="salon-thumb">{s.name.charAt(0).toUpperCase()}</div>
            <div className="row between">
              <h2 style={{ margin: 0, fontSize: 18 }}>{s.name}</h2>
              <span className="tag">★ {s.ratingAvg.toFixed(1)}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0' }}>
              {s.city || s.address || 'Location not set'}
            </p>
            <div className="row">
              {s.categories.slice(0, 3).map((c) => (
                <span key={c} className="tag">
                  {c}
                </span>
              ))}
            </div>
            {s.minPrice > 0 && (
              <p style={{ marginTop: 10 }}>
                from <strong>LKR {s.minPrice}</strong>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
