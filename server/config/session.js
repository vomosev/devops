'use strict';

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { pool } = require('./db');

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const storeOptions = {
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: ONE_WEEK_MS,
  createDatabaseTable: false,
  charset: 'utf8mb4_general_ci',
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data',
    },
  },
};

let store;

try {
  // Reuse the application's mysql2 pool so we only maintain one set of connections.
  store = new MySQLStore(storeOptions, pool);

  if (typeof store.on === 'function') {
    store.on('error', (err) => {
      console.error('[session] MySQL session store error:', err.message);
    });
  }
} catch (err) {
  console.error('[session] Failed to initialise MySQL session store:', err.message);
  console.error('[session] Falling back to the in-memory session store.');
  store = undefined;
}

const secureCookie = process.env.SSL_ENABLED === 'true';

const sessionMiddleware = session({
  name: 'devops.sid',
  secret: process.env.SESSION_SECRET || 'devops-academy-development-secret',
  store,
  resave: false,
  saveUninitialized: false,
  rolling: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    sameSite: 'none',
    secure: secureCookie,
    maxAge: ONE_WEEK_MS,
    path: '/',
  },
});

module.exports = sessionMiddleware;
module.exports.sessionStore = store;