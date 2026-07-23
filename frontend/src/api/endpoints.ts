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
  ownerList: () => api.get('/bookings/owner/list').then((r) => r.data as Booking[]),
  cancel: (id: string) => api.delete(`/bookings/${id}`).then((r) => r.data),
  complete: (id: string) => api.patch(`/bookings/${id}/complete`).then((r) => r.data as Booking),
  noShow: (id: string) => api.patch(`/bookings/${id}/no-show`).then((r) => r.data as Booking),
};

// ---- Payments ----
export const paymentApi = {
  pay: (bookingId: string, method: string, simulateFailure = false) =>
    api
      .post(`/payments/booking/${bookingId}/pay`, { method, simulateFailure })
      .then((r) => r.data as Payment),
  mine: () => api.get('/payments/mine').then((r) => r.data as Payment[]),
};

// ---- Loyalty ----
export interface Loyalty {
  points: number;
  lifetimePoints: number;
  tier: string;
  nextTier: string | null;
  pointsToNextTier: number;
  ledger: { id: string; type: string; points: number; reason: string; createdAt: string }[];
}
export const loyaltyApi = {
  me: () => api.get('/loyalty/me').then((r) => r.data as Loyalty),
};

// ---- Notifications ----
export interface Notification {
  _id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  deliveredChannel?: string;
  createdAt: string;
}
export const notificationApi = {
  mine: () => api.get('/notifications/mine').then((r) => r.data as Notification[]),
  unreadCount: () => api.get('/notifications/unread-count').then((r) => r.data as { count: number }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
};

// ---- Reviews ----
export interface Review {
  _id: string;
  salonId: string;
  bookingId: string;
  customerName?: string;
  rating: number;
  comment?: string;
  serviceName?: string;
  ownerReply?: string;
  createdAt: string;
}
export interface Reviewable {
  bookingId: string;
  salonId: string;
  serviceName?: string;
}
export const reviewApi = {
  forSalon: (salonId: string) => api.get(`/reviews/salon/${salonId}`).then((r) => r.data as Review[]),
  pending: () => api.get('/reviews/pending').then((r) => r.data as Reviewable[]),
  create: (body: { bookingId: string; rating: number; comment?: string; customerName?: string }) =>
    api.post('/reviews', body).then((r) => r.data as Review),
  reply: (id: string, reply: string) =>
    api.patch(`/reviews/${id}/reply`, { reply }).then((r) => r.data as Review),
};

// ---- Staff ----
export interface StaffMember {
  id: string;
  salonId: string;
  name: string;
  title: string;
  skills: string[];
  workingDays: string[];
  active: boolean;
}
export const staffApi = {
  forSalon: (salonId: string) => api.get(`/staff/salon/${salonId}`).then((r) => r.data as StaffMember[]),
  mine: () => api.get('/staff/mine').then((r) => r.data as StaffMember[]),
  create: (body: { salonId: string; name: string; title?: string; skills?: string[] }) =>
    api.post('/staff', body).then((r) => r.data as StaffMember),
};

// ---- Reporting ----
export interface OwnerReport {
  revenue: number;
  totalBookings: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  noShow: number;
  cancellationRate: number;
  noShowRate: number;
  revenueByDay: { date: string; amount: number }[];
  popularServices: { name: string; count: number }[];
}
export const reportApi = {
  owner: () => api.get('/reports/owner').then((r) => r.data as OwnerReport),
};

// ---- Admin ----
export const adminApi = {
  getCommission: () => api.get('/admin/commission').then((r) => r.data),
  setCommission: (pct: number) => api.put('/admin/commission', { pct }).then((r) => r.data),
  setSalonStatus: (salonId: string, status: string) =>
    api.patch(`/admin/salons/${salonId}/status`, { status }).then((r) => r.data),
  disputes: () => api.get('/admin/disputes').then((r) => r.data as any[]),
  resolveDispute: (id: string, status: string, resolution?: string, refund?: boolean) =>
    api.patch(`/admin/disputes/${id}`, { status, resolution, refund }).then((r) => r.data),
};
