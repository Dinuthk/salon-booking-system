import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/endpoints';

export default function AdminPage() {
  const qc = useQueryClient();
  const [pct, setPct] = useState('');
  const [salonId, setSalonId] = useState('');

  const commission = useQuery({ queryKey: ['commission'], queryFn: adminApi.getCommission });
  const disputes = useQuery({ queryKey: ['disputes'], queryFn: adminApi.disputes });

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
