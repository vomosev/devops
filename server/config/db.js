'use strict';

require('dotenv').config();

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'devops',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
  multipleStatements: false,
});

/**
 * Acquire a connection from the pool, ping it and release it.
 * Resolves with { ok: true } when the database is reachable,
 * otherwise resolves with { ok: false, error: message }.
 */
async function checkDatabaseConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.ping();
    return { ok: true };
  } catch (err) {
    console.error('[db] Database connectivity check failed:', err.message);
    return { ok: false, error: err.message };
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseErr) {
        console.error('[db] Failed to release connection:', releaseErr.message);
      }
    }
  }
}

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err && err.message ? err.message : err);
});

module.exports = { pool, checkDatabaseConnection };