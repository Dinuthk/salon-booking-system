const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { attachUser, requireUser } = require('./auth');

const app = express();
const PORT = process.env.PORT || 8080;

const TARGETS = {
  identity: process.env.IDENTITY_URL,
  catalogue: process.env.CATALOGUE_URL,
  search: process.env.SEARCH_URL,
  booking: process.env.BOOKING_URL,
  payment: process.env.PAYMENT_URL,
  notification: process.env.NOTIFICATION_URL,
  review: process.env.REVIEW_URL,
  loyalty: process.env.LOYALTY_URL,
  staff: process.env.STAFF_URL,
  reporting: process.env.REPORTING_URL,
  admin: process.env.ADMIN_URL,
};

app.use(cors());

// Basic rate limiting to mitigate brute-force / scraping (NFR-04).
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// Decode JWT (if any) and expose identity to downstream services.
app.use(attachUser);

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'api-gateway' }),
);

/**
 * Build a proxy that rewrites /api/<prefix> -> /<prefix> and forwards the
 * authenticated user as trusted headers. Downstream services never see the JWT.
 */
function proxy(prefix, target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { [`^/api/${prefix}`]: `/${prefix}` },
    onProxyReq: (proxyReq, req) => {
      if (req.user) {
        proxyReq.setHeader('x-user-id', req.user.id);
        proxyReq.setHeader('x-user-role', req.user.role || 'customer');
        proxyReq.setHeader('x-user-status', req.user.status || 'active');
        if (req.user.email) proxyReq.setHeader('x-user-email', req.user.email);
        // Encode so non-ASCII names are safe in an HTTP header.
        if (req.user.name) proxyReq.setHeader('x-user-name', encodeURIComponent(req.user.name));
      }
      // Strip any client-supplied identity headers (spoofing guard).
      else {
        proxyReq.removeHeader('x-user-id');
        proxyReq.removeHeader('x-user-role');
        proxyReq.removeHeader('x-user-status');
        proxyReq.removeHeader('x-user-email');
        proxyReq.removeHeader('x-user-name');
      }
    },
    onError: (err, _req, res) => {
      res.status(502).json({ statusCode: 502, message: `Upstream error: ${err.message}` });
    },
  });
}

// Guard: block spoofed identity headers from clients before anything else.
app.use((req, _res, next) => {
  delete req.headers['x-user-id'];
  delete req.headers['x-user-role'];
  delete req.headers['x-user-status'];
  delete req.headers['x-user-email'];
  delete req.headers['x-user-name'];
  next();
});

// ---- Public routes ----
app.use('/api/auth', proxy('auth', TARGETS.identity));
app.use('/api/search', proxy('search', TARGETS.search));

// Identity admin ops (owner approval) — protected, routed to identity service.
app.use('/api/users', requireUser, proxy('users', TARGETS.identity));

// ---- Mixed / protected routes ----
// Bookings: availability is public; everything else requires auth.
app.use('/api/bookings', (req, res, next) => {
  const isAvailability = req.method === 'GET' && req.path.startsWith('/availability');
  if (isAvailability) return next();
  return requireUser(req, res, next);
}, proxy('bookings', TARGETS.booking));

// Salons: public reads except owner-scoped; writes require auth.
app.use('/api/salons', (req, res, next) => {
  const isPublicRead = req.method === 'GET' && !req.path.startsWith('/mine');
  if (isPublicRead) return next();
  return requireUser(req, res, next);
}, proxy('salons', TARGETS.catalogue));

// Payments: always require auth.
app.use('/api/payments', requireUser, proxy('payments', TARGETS.payment));

// Notifications & loyalty: always require auth.
app.use('/api/notifications', requireUser, proxy('notifications', TARGETS.notification));
app.use('/api/loyalty', requireUser, proxy('loyalty', TARGETS.loyalty));

// Reviews: public reads for a salon; everything else requires auth.
app.use('/api/reviews', (req, res, next) => {
  const isPublicRead = req.method === 'GET' && req.path.startsWith('/salon');
  if (isPublicRead) return next();
  return requireUser(req, res, next);
}, proxy('reviews', TARGETS.review));

// Staff: public reads for a salon; management requires auth.
app.use('/api/staff', (req, res, next) => {
  const isPublicRead = req.method === 'GET' && req.path.startsWith('/salon');
  if (isPublicRead) return next();
  return requireUser(req, res, next);
}, proxy('staff', TARGETS.staff));

// Reporting & Admin: always require auth (role enforced downstream).
app.use('/api/reports', requireUser, proxy('reports', TARGETS.reporting));
app.use('/api/admin', requireUser, proxy('admin', TARGETS.admin));

app.use((_req, res) => res.status(404).json({ statusCode: 404, message: 'Not found' }));

app.listen(PORT, () => console.log(`API Gateway listening on :${PORT}`));
