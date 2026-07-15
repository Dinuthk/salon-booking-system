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
        if (req.user.email) proxyReq.setHeader('x-user-email', req.user.email);
      }
      // Strip any client-supplied identity headers (spoofing guard).
      else {
        proxyReq.removeHeader('x-user-id');
        proxyReq.removeHeader('x-user-role');
        proxyReq.removeHeader('x-user-email');
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
  delete req.headers['x-user-email'];
  next();
});

// ---- Public routes ----
app.use('/api/auth', proxy('auth', TARGETS.identity));
app.use('/api/search', proxy('search', TARGETS.search));

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

app.use((_req, res) => res.status(404).json({ statusCode: 404, message: 'Not found' }));

app.listen(PORT, () => console.log(`API Gateway listening on :${PORT}`));
