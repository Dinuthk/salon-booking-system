import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { salonApi, staffApi, bookingApi } from '../api/endpoints';

export default function OwnerPage() {
  const qc = useQueryClient();
  const { data: salons } = useQuery({ queryKey: ['salons', 'mine'], queryFn: salonApi.mine });
  const { data: myStaff } = useQuery({ queryKey: ['staff', 'mine'], queryFn: staffApi.mine });
  const { data: ownerBookings } = useQuery({
    queryKey: ['bookings', 'owner'],
    queryFn: bookingApi.ownerList,
    refetchInterval: 5000,
  });

  const [staffForm, setStaffForm] = useState<Record<string, { name: string; title: string }>>({});

  const addStaff = useMutation({
    mutationFn: (v: { salonId: string; name: string; title: string }) =>
      staffApi.create({ salonId: v.salonId, name: v.name, title: v.title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff', 'mine'] }),
  });
  const complete = useMutation({
    mutationFn: (id: string) => bookingApi.complete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings', 'owner'] }),
  });
  const noShow = useMutation({
    mutationFn: (id: string) => bookingApi.noShow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings', 'owner'] }),
  });

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

              {/* Staff */}
              <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <label>Staff</label>
                <div className="row" style={{ marginTop: 6, alignItems: 'flex-end' }}>
                  <input
                    placeholder="Name"
                    style={{ flex: 2 }}
                    value={staffForm[s._id]?.name || ''}
                    onChange={(e) => setStaffForm({ ...staffForm, [s._id]: { ...(staffForm[s._id] || { title: '' }), name: e.target.value } })}
                  />
                  <input
                    placeholder="Title"
                    style={{ flex: 1 }}
                    value={staffForm[s._id]?.title || ''}
                    onChange={(e) => setStaffForm({ ...staffForm, [s._id]: { ...(staffForm[s._id] || { name: '' }), title: e.target.value } })}
                  />
                  <button
                    className="btn sm"
                    disabled={!staffForm[s._id]?.name}
                    onClick={() => addStaff.mutate({ salonId: s._id, name: staffForm[s._id].name, title: staffForm[s._id].title || 'Stylist' })}
                  >
                    Add staff
                  </button>
                </div>
                <div className="row" style={{ marginTop: 8 }}>
                  {myStaff?.filter((st) => st.salonId === s._id).map((st) => (
                    <span key={st.id} className="tag">{st.name} · {st.title}</span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Appointments management */}
      <h2 style={{ marginTop: 32 }}>Appointments</h2>
      {ownerBookings && ownerBookings.length === 0 && <p className="muted">No appointments yet.</p>}
      <div className="grid">
        {ownerBookings?.map((b) => (
          <div key={b.id} className="card row between">
            <div>
              <strong>{b.serviceName}</strong>
              <p className="muted" style={{ margin: '4px 0' }}>
                {new Date(b.startTime).toLocaleString()} · LKR {b.price}
              </p>
            </div>
            <div className="row">
              <span className={`badge ${b.status}`}>{b.status}</span>
              {b.status === 'confirmed' && (
                <>
                  <button className="btn sm" onClick={() => complete.mutate(b.id)}>Mark completed</button>
                  <button className="btn ghost sm" onClick={() => noShow.mutate(b.id)}>No-show</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <Link className="btn ghost" to="/dashboard">View business dashboard →</Link>
      </div>
    </div>
  );
}
