import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { salonApi } from '../api/endpoints';

export default function OwnerPage() {
  const qc = useQueryClient();
  const { data: salons } = useQuery({ queryKey: ['salons', 'mine'], queryFn: salonApi.mine });

  const [salon, setSalon] = useState({ name: '', city: '', address: '', description: '' });
  const [svc, setSvc] = useState<Record<string, { name: string; price: string; durationMinutes: string }>>({});

  const createSalon = useMutation({
    mutationFn: () => salonApi.create(salon),
    onSuccess: () => {
      setSalon({ name: '', city: '', address: '', description: '' });
      qc.invalidateQueries({ queryKey: ['salons', 'mine'] });
    },
  });

  const addService = useMutation({
    mutationFn: ({ salonId, body }: { salonId: string; body: any }) =>
      salonApi.addService(salonId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salons', 'mine'] }),
  });

  return (
    <div className="container">
      <div className="title-row">
        <h1>Owner dashboard</h1>
        <p className="muted">Create a salon and add services. New salons are bookable immediately.</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2>New salon</h2>
        <div className="field">
          <label>Name</label>
          <input value={salon.name} onChange={(e) => setSalon({ ...salon, name: e.target.value })} />
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label>City</label>
            <input value={salon.city} onChange={(e) => setSalon({ ...salon, city: e.target.value })} />
          </div>
          <div className="field" style={{ flex: 2 }}>
            <label>Address</label>
            <input value={salon.address} onChange={(e) => setSalon({ ...salon, address: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>Description</label>
          <input
            value={salon.description}
            onChange={(e) => setSalon({ ...salon, description: e.target.value })}
          />
        </div>
        <button className="btn" disabled={!salon.name || createSalon.isPending} onClick={() => createSalon.mutate()}>
          {createSalon.isPending ? 'Creating…' : 'Create salon'}
        </button>
      </div>

      <h2>My salons</h2>
      {salons?.length === 0 && <p className="muted">No salons yet.</p>}
      <div className="grid">
        {salons?.map((s) => {
          const form = svc[s._id] || { name: '', price: '', durationMinutes: '30' };
          const upd = (patch: any) => setSvc({ ...svc, [s._id]: { ...form, ...patch } });
          return (
            <div key={s._id} className="card">
              <div className="row between">
                <h2 style={{ margin: 0 }}>{s.name}</h2>
                <Link className="tag" to={`/salons/${s._id}`}>
                  View public page →
                </Link>
              </div>
              <p className="muted">{s.city} · {s.services.length} services</p>

              <div className="row" style={{ marginTop: 8, alignItems: 'flex-end' }}>
                <div className="field" style={{ flex: 2 }}>
                  <label>Service name</label>
                  <input value={form.name} onChange={(e) => upd({ name: e.target.value })} />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Price (LKR)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => upd({ price: e.target.value })}
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Minutes</label>
                  <input
                    type="number"
                    value={form.durationMinutes}
                    onChange={(e) => upd({ durationMinutes: e.target.value })}
                  />
                </div>
                <button
                  className="btn sm"
                  disabled={!form.name || !form.price}
                  onClick={() =>
                    addService.mutate({
                      salonId: s._id,
                      body: {
                        name: form.name,
                        price: Number(form.price),
                        durationMinutes: Number(form.durationMinutes) || 30,
                      },
                    })
                  }
                >
                  Add service
                </button>
              </div>

              {s.services.length > 0 && (
                <div className="row" style={{ marginTop: 8 }}>
                  {s.services.map((sv) => (
                    <span key={sv._id} className="tag">
                      {sv.name} · LKR {sv.price}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
