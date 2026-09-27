'use strict';

/**
 * Authentication middleware for the DevOps Academy API.
 *
 * requireAuth  -> rejects unauthenticated requests with 401.
 * optionalAuth -> never rejects; attaches req.userId when a session exists.
 */

function readSessionUserId(req) {
  try {
    if (!req || !req.session) return null;
    const raw = req.session.userId;
    if (raw === undefined || raw === null || raw === '') return null;
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) return null;
    return id;
  } catch (err) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const userId = readSessionUserId(req);

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  req.userId = userId;
  return next();
}

function optionalAuth(req, res, next) {
  req.userId = readSessionUserId(req);
  return next();
}

module.exports = requireAuth;
module.exports.requireAuth = requireAuth;
module.exports.optionalAuth = optionalAuth;
module.exports.readSessionUserId = readSessionUserId;