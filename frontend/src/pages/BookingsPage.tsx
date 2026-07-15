import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingApi, paymentApi, Booking } from '../api/endpoints';

export default function BookingsPage() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState('');

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings', 'mine'],
    queryFn: bookingApi.mine,
    refetchInterval: 4000, // reflect saga confirmation as it lands
  });

  const pay = useMutation({
    mutationFn: ({ id, method }: { id: string; method: string }) =>
      paymentApi.pay(id, method),
    onSettled: () => qc.invalidateQueries({ queryKey: ['bookings', 'mine'] }),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => bookingApi.cancel(id),
    onSettled: () => qc.invalidateQueries({ queryKey: ['bookings', 'mine'] }),
  });

  function fmt(dt: string) {
    return new Date(dt).toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="container">
      <div className="title-row">
        <h1>My bookings</h1>
        <p className="muted">Pay to confirm a reservation, or cancel if plans change.</p>
      </div>

      {isLoading && <p className="muted">Loading…</p>}
      {bookings && bookings.length === 0 && (
        <div className="card">
          <p className="muted">No bookings yet. Discover a salon to get started.</p>
        </div>
      )}

      <div className="grid">
        {bookings?.map((b: Booking) => (
          <div key={b.id} className="card">
            <div className="row between">
              <div>
                <strong style={{ fontSize: 17 }}>{b.serviceName}</strong>
                <p className="muted" style={{ margin: '4px 0' }}>
                  {fmt(b.startTime)} · LKR {b.price}
                </p>
              </div>
              <span className={`badge ${b.status}`}>{b.status}</span>
            </div>

            <div className="row" style={{ marginTop: 12 }}>
              {b.status === 'pending' && (
                <>
                  <button
                    className="btn sm"
                    disabled={pay.isPending && busyId === b.id}
                    onClick={() => {
                      setBusyId(b.id);
                      pay.mutate({ id: b.id, method: 'card' });
                    }}
                  >
                    Pay with card
                  </button>
                  <button
                    className="btn ghost sm"
                    onClick={() => {
                      setBusyId(b.id);
                      pay.mutate({ id: b.id, method: 'pay_at_salon' });
                    }}
                  >
                    Pay at salon
                  </button>
                </>
              )}
              {(b.status === 'pending' || b.status === 'confirmed') && (
                <button className="btn danger sm" onClick={() => cancel.mutate(b.id)}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
