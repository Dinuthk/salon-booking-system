import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setTokens, updateUser } from '../features/auth/authSlice';
import { salonApi, staffApi, bookingApi, authApi } from '../api/endpoints';

export default function OwnerPage() {
  const qc = useQueryClient();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const refreshToken = useSelector((s: RootState) => s.auth.refreshToken);

  // Poll our own profile so an admin approval reflects without re-login.
  const { data: profile } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    refetchInterval: 5000,
  });

  // When our DB status changes (e.g. admin approval), refresh the JWT so the
  // new status reaches downstream services, then update the cached profile.
  useEffect(() => {
    if (!profile || profile.status === user?.status) return;
    (async () => {
      try {
        if (refreshToken) {
          const t = await authApi.refresh(refreshToken);
          dispatch(setTokens({ accessToken: t.accessToken, refreshToken: t.refreshToken }));
        }
      } catch {
        /* ignore — will retry next poll */
      }
      dispatch(updateUser({ status: profile.status }));
    })();
  }, [profile?.status, user?.status, refreshToken, dispatch]);

  const status = profile?.status ?? user?.status ?? 'active';
  const approved = status === 'active';

  const { data: salons } = useQuery({
    queryKey: ['salons', 'mine'],
    queryFn: salonApi.mine,
    enabled: approved,
  });
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
  const approve = useMutation({
    mutationFn: (id: string) => bookingApi.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings', 'owner'] }),
  });
  const ownerCancel = useMutation({
    mutationFn: (id: string) => bookingApi.ownerCancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings', 'owner'] }),
  });

  const [salon, setSalon] = useState({ name: '', city: '', address: '', description: '' });
  const [svc, setSvc] = useState<Record<string, { name: string; price: string; durationMinutes: string }>>({});
  const [svcError, setSvcError] = useState('');

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
    onSuccess: () => {
      setSvcError('');
      qc.invalidateQueries({ queryKey: ['salons', 'mine'] });
    },
    onError: (err: any) => {
      const m = err?.response?.data?.message;
      setSvcError(Array.isArray(m) ? m.join(', ') : m || 'Could not add service');
    },
  });

  // Owner accounts must be approved by an admin before they can operate.
  if (!approved) {
    return (
      <div className="container">
        <div className="title-row">
          <h1>Owner dashboard</h1>
        </div>
        <div className="card" style={{ borderColor: 'var(--warn)' }}>
          {status === 'suspended' ? (
            <>
              <h2 style={{ marginTop: 0 }}>Account suspended ⛔</h2>
              <p className="muted">
                Your salon-owner account has been suspended by the platform admin. Please contact
                support. You can’t manage salons while suspended.
              </p>
            </>
          ) : (
            <>
              <h2 style={{ marginTop: 0 }}>Waiting for admin approval ⏳</h2>
              <p className="muted">
                Thanks for signing up as a salon owner! A platform admin has been notified and needs
                to <strong>approve your account</strong> before you can create salons and add services.
              </p>
              <p className="muted" style={{ fontSize: 13 }}>
                This page updates automatically once you’re approved — no need to refresh.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

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
                  disabled={form.name.trim().length < 2 || !form.price}
                  onClick={() => {
                    setSvcError('');
                    addService.mutate({
                      salonId: s._id,
                      body: {
                        name: form.name.trim(),
                        price: Number(form.price),
                        durationMinutes: Number(form.durationMinutes) || 30,
                      },
                    });
                  }}
                >
                  Add service
                </button>
              </div>
              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                Service name needs at least 2 characters.
              </p>
              {svcError && <div className="error" style={{ marginTop: 6 }}>{svcError}</div>}

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
              <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
                <strong style={{ fontSize: 16 }}>{b.customerName || 'Customer'}</strong>
                <span className="muted" style={{ fontSize: 13 }}>booked</span>
                <span className="tag">{b.serviceName}</span>
              </div>
              <p className="muted" style={{ margin: '4px 0' }}>
                {new Date(b.startTime).toLocaleString()} · LKR {b.price}
              </p>
            </div>
            <div className="row">
              <span className={`badge ${b.status}`}>{b.status}</span>
              {b.status === 'confirmed' && (
                <>
                  <button className="btn sm" onClick={() => approve.mutate(b.id)}>Approve</button>
                  <button className="btn danger sm" onClick={() => ownerCancel.mutate(b.id)}>Cancel</button>
                </>
              )}
              {b.status === 'approved' && (
                <>
                  <button className="btn sm" onClick={() => complete.mutate(b.id)}>Mark completed</button>
                  <button className="btn ghost sm" onClick={() => noShow.mutate(b.id)}>No-show</button>
                  <button className="btn danger sm" onClick={() => ownerCancel.mutate(b.id)}>Cancel</button>
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
