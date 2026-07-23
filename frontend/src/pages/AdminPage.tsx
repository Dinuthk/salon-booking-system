import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, usersApi } from '../api/endpoints';

export default function AdminPage() {
  const qc = useQueryClient();
  const [pct, setPct] = useState('');
  const [salonId, setSalonId] = useState('');

  const commission = useQuery({ queryKey: ['commission'], queryFn: adminApi.getCommission });
  const disputes = useQuery({ queryKey: ['disputes'], queryFn: adminApi.disputes });
  const owners = useQuery({ queryKey: ['owners'], queryFn: usersApi.listOwners, refetchInterval: 5000 });

  const setOwnerStatus = useMutation({
    mutationFn: (v: { id: string; status: 'active' | 'pending' | 'suspended' }) =>
      usersApi.setOwnerStatus(v.id, v.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owners'] }),
  });

  const setCommission = useMutation({
    mutationFn: () => adminApi.setCommission(Number(pct)),
    onSuccess: () => { setPct(''); qc.invalidateQueries({ queryKey: ['commission'] }); },
  });
  const setStatus = useMutation({
    mutationFn: (status: string) => adminApi.setSalonStatus(salonId, status),
  });
  const resolve = useMutation({
    mutationFn: (v: { id: string; refund: boolean }) =>
      adminApi.resolveDispute(v.id, 'resolved', 'Resolved by admin', v.refund),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['disputes'] }),
  });

  return (
    <div className="container">
      <div className="title-row">
        <h1>Admin console</h1>
        <p className="muted">Platform administration — commission, verification, disputes.</p>
      </div>

      {/* Owner approval — the primary onboarding gate */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row between">
          <h2 style={{ margin: 0 }}>Owner accounts</h2>
          <span className="muted" style={{ fontSize: 13 }}>
            {owners.data?.filter((o) => o.status === 'pending').length || 0} awaiting approval
          </span>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>
          Approve an owner so they can create salons; suspend to revoke access.
        </p>
        {owners.data && owners.data.length === 0 && <p className="muted">No owner accounts yet.</p>}
        <div style={{ overflowX: 'auto' }}>
          {owners.data && owners.data.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--muted)', fontSize: 13 }}>
                  <th style={{ padding: '6px 8px' }}>Owner</th>
                  <th style={{ padding: '6px 8px' }}>ID</th>
                  <th style={{ padding: '6px 8px' }}>Status</th>
                  <th style={{ padding: '6px 8px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {owners.data.map((o) => (
                  <tr key={o.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px' }}>
                      <strong>{o.fullName}</strong>
                      <div className="muted" style={{ fontSize: 12 }}>{o.email}</div>
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: 12 }}>{o.id.slice(0, 8)}…</td>
                    <td style={{ padding: '8px' }}>
                      <span className={`badge ${o.status === 'active' ? 'confirmed' : o.status === 'suspended' ? 'cancelled' : 'pending'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px' }}>
                      <div className="row">
                        {o.status !== 'active' && (
                          <button className="btn sm" onClick={() => setOwnerStatus.mutate({ id: o.id, status: 'active' })}>
                            Approve
                          </button>
                        )}
                        {o.status !== 'suspended' && (
                          <button className="btn ghost sm" onClick={() => setOwnerStatus.mutate({ id: o.id, status: 'suspended' })}>
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 20 }}>
        <div className="card">
          <h2>Platform commission</h2>
          <p>Current: <strong>{commission.data?.pct ?? '—'}%</strong></p>
          <div className="row">
            <input type="number" placeholder="New %" value={pct} onChange={(e) => setPct(e.target.value)} style={{ width: 120 }} />
            <button className="btn sm" disabled={!pct} onClick={() => setCommission.mutate()}>Update</button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Applied live to the Payment service via an event.
          </p>
        </div>

        <div className="card">
          <h2>Salon verification</h2>
          <div className="field"><label>Salon ID</label>
            <input value={salonId} onChange={(e) => setSalonId(e.target.value)} placeholder="paste salon _id" />
          </div>
          <div className="row">
            <button className="btn sm" disabled={!salonId} onClick={() => setStatus.mutate('active')}>Verify (active)</button>
            <button className="btn ghost sm" disabled={!salonId} onClick={() => setStatus.mutate('suspended')}>Suspend</button>
          </div>
          {setStatus.isSuccess && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Applied.</p>}
        </div>
      </div>

      <h2>Disputes</h2>
      {disputes.data && disputes.data.length === 0 && <p className="muted">No disputes filed.</p>}
      <div className="grid">
        {disputes.data?.map((d) => (
          <div key={d.id} className="card">
            <div className="row between">
              <div>
                <strong>Booking {d.bookingId.slice(0, 8)}…</strong>
                <p className="muted" style={{ margin: '4px 0' }}>{d.reason}</p>
              </div>
              <span className={`badge ${d.status === 'resolved' ? 'confirmed' : 'pending'}`}>{d.status}</span>
            </div>
            {d.status !== 'resolved' && (
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn sm" onClick={() => resolve.mutate({ id: d.id, refund: true })}>Resolve + refund</button>
                <button className="btn ghost sm" onClick={() => resolve.mutate({ id: d.id, refund: false })}>Resolve (no refund)</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
