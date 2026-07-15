import { api } from './client';

// ---- Types ----
export interface SalonSummary {
  salonId: string;
  name: string;
  city?: string;
  address?: string;
  photos: string[];
  ratingAvg: number;
  ratingCount: number;
  minPrice: number;
  categories: string[];
}

export interface SalonServiceItem {
  _id: string;
  name: string;
  category: string;
  description?: string;
  durationMinutes: number;
  price: number;
  bufferMinutes: number;
  assignedStaffIds: string[];
  active: boolean;
}

export interface Salon {
  _id: string;
  ownerId: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  phone?: string;
  photos: string[];
  status: string;
  services: SalonServiceItem[];
  ratingAvg: number;
  ratingCount: number;
}

export interface Slot {
  start: string;
  available: boolean;
}

export interface Booking {
  id: string;
  salonId: string;
  serviceId: string;
  serviceName: string;
  staffId?: string;
  startTime: string;
  endTime: string;
  price: number;
  currency: string;
  status: string;
  paymentStatus: string;
  paymentDeadline?: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  state: string;
  method?: string;
}

// ---- Auth ----
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  register: (body: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role?: string;
  }) => api.post('/auth/register', body).then((r) => r.data),
};

// ---- Search & catalogue ----
export const searchApi = {
  search: (params: Record<string, string | number | undefined>) =>
    api.get('/search', { params }).then((r) => r.data as { items: SalonSummary[]; total: number }),
};

export const salonApi = {
  get: (id: string) => api.get(`/salons/${id}`).then((r) => r.data as Salon),
  list: () => api.get('/salons').then((r) => r.data as Salon[]),
  mine: () => api.get('/salons/mine/list').then((r) => r.data as Salon[]),
  create: (body: {
    name: string;
    description?: string;
    address?: string;
    city?: string;
    phone?: string;
  }) => api.post('/salons', body).then((r) => r.data as Salon),
  addService: (
    salonId: string,
    body: { name: string; category?: string; durationMinutes: number; price: number; bufferMinutes?: number },
  ) => api.post(`/salons/${salonId}/services`, body).then((r) => r.data as Salon),
};

// ---- Bookings ----
export const bookingApi = {
  availability: (salonId: string, serviceId: string, date: string, staffId?: string) =>
    api
      .get('/bookings/availability', { params: { salonId, serviceId, date, staffId } })
      .then((r) => r.data as { date: string; slots: Slot[] }),
  create: (body: { salonId: string; serviceId: string; startTime: string; staffId?: string }) =>
    api.post('/bookings', body).then((r) => r.data as Booking),
  mine: () => api.get('/bookings/mine').then((r) => r.data as Booking[]),
  cancel: (id: string) => api.delete(`/bookings/${id}`).then((r) => r.data),
};

// ---- Payments ----
export const paymentApi = {
  pay: (bookingId: string, method: string, simulateFailure = false) =>
    api
      .post(`/payments/booking/${bookingId}/pay`, { method, simulateFailure })
      .then((r) => r.data as Payment),
  mine: () => api.get('/payments/mine').then((r) => r.data as Payment[]),
};
