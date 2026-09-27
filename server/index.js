require('dotenv').config();

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { checkDatabaseConnection } = require('./config/db');
const sessionMiddleware = require('./config/session');
const authRoutes = require('./routes/auth');
const coursesRoutes = require('./routes/courses');
const lessonsRoutes = require('./routes/lessons');
const progressRoutes = require('./routes/progress');
const quizzesRoutes = require('./routes/quizzes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const ALLOWED_HOST_PATTERN = /\.arx-app\.com$/i;
const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

function isAllowedOrigin(origin) {
  if (!origin) return true; // same-origin, curl, server-to-server
  if (process.env.CLIENT_ORIGIN && origin === process.env.CLIENT_ORIGIN) return true;
  if (LOCAL_ORIGIN_PATTERN.test(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return ALLOWED_HOST_PATTERN.test(hostname) || hostname === 'arx-app.com';
  } catch (err) {
    return false;
  }
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(sessionMiddleware);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'devops-api', uptime: process.uptime() });
});

app.get('/api/health', async (req, res) => {
  try {
    await checkDatabaseConnection();
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[health] database check failed:', err.message);
    res.status(503).json({ status: 'degraded', database: 'unavailable', error: 'Database connection failed' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/quizzes', quizzesRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
});

app.use(errorHandler);

function buildServer() {
  if (process.env.SSL_ENABLED === 'true') {
    try {
      const certPath = process.env.SSL_CERT_PATH;
      const keyPath = process.env.SSL_KEY_PATH;

      if (!certPath || !keyPath) {
        throw new Error('SSL_CERT_PATH and SSL_KEY_PATH must be set when SSL_ENABLED is true');
      }

      const options = {
        cert: fs.readFileSync(path.resolve(certPath)),
        key: fs.readFileSync(path.resolve(keyPath)),
      };

      if (process.env.SSL_CA_PATH && fs.existsSync(path.resolve(process.env.SSL_CA_PATH))) {
        options.ca = fs.readFileSync(path.resolve(process.env.SSL_CA_PATH));
      }

      console.log('[server] TLS enabled — starting HTTPS server');
      return https.createServer(options, app);
    } catch (err) {
      console.error('[server] Failed to start HTTPS server, falling back to HTTP:', err.message);
      return http.createServer(app);
    }
  }

  return http.createServer(app);
}

const PORT = Number(process.env.PORT) || 4115;
const server = buildServer();

server.on('error', (err) => {
  console.error('[server] Fatal server error:', err.message);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', async () => {
  const scheme = process.env.SSL_ENABLED === 'true' ? 'https' : 'http';
  console.log(`[server] DevOps Academy API listening on ${scheme}://0.0.0.0:${PORT}`);
  try {
    await checkDatabaseConnection();
    console.log('[server] MySQL connection verified');
  } catch (err) {
    console.error('[server] MySQL connection check failed:', err.message);
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err);
});

function shutdown(signal) {
  console.log(`[server] Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log('[server] HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;