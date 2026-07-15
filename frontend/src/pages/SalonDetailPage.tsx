import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { salonApi, bookingApi, SalonServiceItem } from '../api/endpoints';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function SalonDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);

  const [selectedService, setSelectedService] = useState<SalonServiceItem | null>(null);
  const [date, setDate] = useState(todayStr());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: salon, isLoading } = useQuery({
    queryKey: ['salon', id],
    queryFn: () => salonApi.get(id),
  });

  const availability = useQuery({
    queryKey: ['availability', id, selectedService?._id, date],
    queryFn: () => bookingApi.availability(id, selectedService!._id, date),
    enabled: !!selectedService,
  });

  const createBooking = useMutation({
    mutationFn: () =>
      bookingApi.create({ salonId: id, serviceId: selectedService!._id, startTime: selectedSlot! }),
    onSuccess: () => navigate('/bookings'),
    onError: (err: any) => setError(err.response?.data?.message || 'Booking failed'),
  });

  if (isLoading) return <div className="container"><p className="muted">Loading…</p></div>;
  if (!salon) return <div className="container"><p className="error">Salon not found.</p></div>;

  function onBook() {
    setError('');
    if (!user) return navigate('/login');
    if (!selectedSlot) return setError('Please pick a time slot');
    createBooking.mutate();
  }

  return (
    <div className="container">
      <div className="title-row">
        <h1>{salon.name}</h1>
        <p className="muted">{salon.address || salon.city} · ★ {salon.ratingAvg.toFixed(1)} ({salon.ratingCount})</p>
        {salon.description && <p>{salon.description}</p>}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <h2>Services</h2>
          {salon.services.filter((s) => s.active).length === 0 && (
            <p className="muted">No services listed yet.</p>
          )}
          {salon.services
            .filter((s) => s.active)
            .map((svc) => (
              <div
                key={svc._id}
                className="card"
                style={{
                  marginTop: 10,
                  cursor: 'pointer',
                  borderColor: selectedService?._id === svc._id ? 'var(--brand)' : 'var(--border)',
                }}
                onClick={() => {
                  setSelectedService(svc);
                  setSelectedSlot(null);
                }}
              >
                <div className="row between">
                  <strong>{svc.name}</strong>
                  <span className="tag">LKR {svc.price}</span>
                </div>
                <p className="muted" style={{ margin: '4px 0 0' }}>
                  {svc.durationMinutes} min · {svc.category}
                </p>
              </div>
            ))}
        </div>

        <div className="card">
          <h2>Book a slot</h2>
          {!selectedService ? (
            <p className="muted">Select a service to see available times.</p>
          ) : (
            <>
              <div className="field">
                <label>Date</label>
                <input
                  type="date"
                  value={date}
                  min={todayStr()}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                />
              </div>

              {availability.isLoading && <p className="muted">Checking availability…</p>}
              {availability.data && availability.data.slots.length === 0 && (
                <p className="muted">Closed or no slots on this day.</p>
              )}
              <div className="slots">
                {availability.data?.slots.map((slot) => {
                  const label = new Date(slot.start).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <div
                      key={slot.start}
                      className={`slot ${!slot.available ? 'disabled' : ''} ${
                        selectedSlot === slot.start ? 'selected' : ''
                      }`}
                      onClick={() => slot.available && setSelectedSlot(slot.start)}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>

              {error && <div className="error">{error}</div>}
              <button
                className="btn"
                style={{ marginTop: 16, width: '100%' }}
                disabled={!selectedSlot || createBooking.isPending}
                onClick={onBook}
              >
                {createBooking.isPending
                  ? 'Reserving…'
                  : selectedService
                  ? `Reserve for LKR ${selectedService.price}`
                  : 'Reserve'}
              </button>
              <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                The slot is held while you complete payment.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
