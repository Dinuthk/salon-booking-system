import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { bookingApi, paymentApi, reviewApi, Booking } from '../api/endpoints';

export default function BookingsPage() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState('');
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const user = useSelector((s: RootState) => s.auth.user);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings', 'mine'],
    queryFn: bookingApi.mine,
    refetchInterval: 4000, // reflect saga confirmation as it lands
  });

  const { data: reviewable } = useQuery({
    queryKey: ['reviews', 'pending'],
    queryFn: reviewApi.pending,
  });

  const submitReview = useMutation({
    mutationFn: (bookingId: string) =>
      reviewApi.create({
        bookingId,
        rating: ratings[bookingId] || 5,
        comment: comments[bookingId],
        customerName: user?.fullName,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews', 'pending'] }),
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

      {reviewable && reviewable.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'var(--brand)' }}>
          <h2 style={{ marginTop: 0 }}>Rate your recent visits</h2>
          {reviewable.map((rv) => (
            <div key={rv.bookingId} className="card" style={{ marginTop: 10 }}>
              <strong>{rv.serviceName || 'Appointment'}</strong>
              <div className="row" style={{ margin: '8px 0' }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    onClick={() => setRatings({ ...ratings, [rv.bookingId]: n })}
                    style={{ cursor: 'pointer', fontSize: 24, color: n <= (ratings[rv.bookingId] || 5) ? '#d97706' : 'var(--border)' }}
                  >
                    ★
                  </span>
                ))}
              </div>
              <input
                placeholder="Add a comment (optional)"
                value={comments[rv.bookingId] || ''}
                onChange={(e) => setComments({ ...comments, [rv.bookingId]: e.target.value })}
                style={{ width: '100%', marginBottom: 8 }}
              />
              <button className="btn sm" onClick={() => submitReview.mutate(rv.bookingId)}>
                Submit review
              </button>
            </div>
          ))}
        </div>
      )}

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
