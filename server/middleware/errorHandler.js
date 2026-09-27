'use strict';

/**
 * Small error class used by controllers to signal an HTTP failure with a
 * specific status code.
 *
 *   throw new HttpError(404, 'Course not found');
 */
class HttpError extends Error {
  constructor(status, message, details) {
    super(message || 'Request failed');
    this.name = 'HttpError';
    this.status = Number(status) || 500;
    this.statusCode = this.status;
    if (details !== undefined) {
      this.details = details;
    }
    Error.captureStackTrace?.(this, HttpError);
  }
}

/** Convenience factory: notFound('Course') -> HttpError(404, 'Course not found') */
function notFound(what) {
  return new HttpError(404, `${what || 'Resource'} not found`);
}

/** Convenience factory for validation problems. */
function badRequest(message, details) {
  return new HttpError(400, message || 'Invalid request', details);
}

/**
 * Express error-handling middleware. Must be mounted LAST, after all routers.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = Number(err && (err.status || err.statusCode)) || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  const method = req && req.method ? req.method : 'UNKNOWN';
  const url = req && (req.originalUrl || req.url) ? (req.originalUrl || req.url) : '';

  if (status >= 500) {
    console.error(`[error] ${method} ${url} -> ${status}:`, err && err.stack ? err.stack : err);
  } else {
    console.warn(`[warn] ${method} ${url} -> ${status}: ${err && err.message ? err.message : err}`);
  }

  // Headers already flushed — delegate to Express' default handler.
  if (res.headersSent) {
    return next(err);
  }

  let message = (err && err.message) || 'Something went wrong';

  // Friendly mapping for common MySQL / body-parser failures.
  const code = err && err.code;
  let finalStatus = status;

  if (code === 'ER_DUP_ENTRY') {
    finalStatus = 409;
    message = 'That record already exists';
  } else if (code === 'ER_NO_REFERENCED_ROW' || code === 'ER_NO_REFERENCED_ROW_2') {
    finalStatus = 400;
    message = 'Related record does not exist';
  } else if (code === 'ER_ACCESS_DENIED_ERROR' || code === 'ECONNREFUSED' || code === 'PROTOCOL_CONNECTION_LOST') {
    finalStatus = 503;
    message = 'Database is currently unavailable';
  } else if (err && err.type === 'entity.parse.failed') {
    finalStatus = 400;
    message = 'Invalid JSON body';
  }

  if (finalStatus >= 500 && isProduction) {
    message = 'Internal server error';
  }

  const payload = { error: message };

  if (err && err.details !== undefined) {
    payload.details = err.details;
  }
  if (!isProduction && finalStatus >= 500 && err && err.stack) {
    payload.stack = err.stack;
  }

  res.status(finalStatus).json(payload);
}

module.exports = errorHandler;
module.exports.errorHandler = errorHandler;
module.exports.HttpError = HttpError;
module.exports.notFound = notFound;
module.exports.badRequest = badRequest;