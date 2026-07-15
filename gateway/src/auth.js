const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

/**
 * Verifies the Bearer token if present and attaches req.user.
 * Never rejects — pair with requireUser() on protected routes.
 */
function attachUser(req, _res, next) {
  const header = req.headers['authorization'] || '';
  const [scheme, token] = header.split(' ');
  if (scheme === 'Bearer' && token) {
    try {
      const payload = jwt.verify(token, ACCESS_SECRET);
      req.user = { id: payload.sub, role: payload.role, email: payload.email };
    } catch {
      /* invalid/expired token — leave req.user undefined */
    }
  }
  next();
}

function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ statusCode: 401, message: 'Authentication required' });
  }
  next();
}

module.exports = { attachUser, requireUser };
