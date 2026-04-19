const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { buildMobileSwaggerSpec } = require('./config/swagger.mobile');
const routes = require('./api/routes');
const errorMiddleware = require('./api/middlewares/error.middleware');
const logger = require('./utils/logger/logger');

const app = express();

// ================================================================================================
// CORS – must be first so preflight (OPTIONS) gets CORS headers before Helmet
// ================================================================================================
const allowedOriginsRaw = process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000';
const allowedOrigins = allowedOriginsRaw.split(',').map((o) => o.trim()).filter(Boolean);
if (allowedOrigins.length === 0) allowedOrigins.push('*');

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/$/, '');
    const ok = allowedOrigins.includes('*') || allowedOrigins.some((o) => o.replace(/\/$/, '') === normalized);
    callback(null, ok);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'Accept', 'X-Requested-With'],
  optionsSuccessStatus: 204,
  preflightContinue: false,
}));

// ================================================================================================
// SECURITY & MIDDLEWARE
// ================================================================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // For Swagger UI
      scriptSrc: ["'self'", "'unsafe-inline'"], // For Swagger UI
      imgSrc: ["'self'", "data:", "https:", "http:", "http://localhost:*", "http://127.0.0.1:*"]
    }
  }
}));

// HTTP request logging
app.use(morgan('combined', { stream: logger.stream }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads — allow cross-origin so frontend (e.g. :5173) can load images from API (:3000)
// مستندات رحلة أكفيك (تأمين) لا تُخدم علناً — التنزيل عبر API مع توكن الورشة/العميل فقط
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  const p = req.path || '';
  if (p.includes('akfeek-journey')) {
    return res.status(404).json({ success: false, error: 'Not found', code: 'NOT_FOUND' });
  }
  next();
});
app.use('/uploads', express.static('uploads'));

// صفحة تفاصيل البث (طلبات السحب)
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// ================================================================================================
// SWAGGER DOCUMENTATION
// ================================================================================================

// Serve swagger-ui static assets (css, js, etc.) — mounted ONCE, shared by all docs pages.
app.use('/api-docs', swaggerUi.serve);

// Swagger JSON endpoint — served BEFORE setup so the URL is always stable across restarts.
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.send(swaggerSpec);
});

// Mobile JSON endpoint
app.get('/api-docs/mobile.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.send(buildMobileSwaggerSpec());
});

// Main Swagger UI — always points to the explicit stable URL /api-docs.json.
// Using `url` (not embedded spec) avoids the in-memory random-URL bug where the
// browser caches swagger-ui-init.js pointing to an old URL after a server restart.
app.get('/api-docs/', swaggerUi.setup(null, {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .info .title { font-size: 32px; color: #1976d2 }
  `,
  customSiteTitle: 'AutoService API Docs - أكفيك',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    url: '/api-docs.json',
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
  },
}));

// Mobile Swagger UI — custom HTML page that reuses static assets from /api-docs/.
// Avoids the serveFiles/setup conflict that was serving the JSON spec for every
// sub-path request (swagger-ui.css, swagger-ui-bundle.js, etc.) instead of actual files.
app.get('/api-docs/mobile', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="ltr">
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Akfeek Mobile API — أكفيك</title>
    <link rel="stylesheet" type="text/css" href="/api-docs/swagger-ui.css">
    <style>
      body { margin: 0 }
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .info .title { font-size: 28px; color: #0d9488 }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/api-docs/swagger-ui-bundle.js"></script>
    <script src="/api-docs/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = function () {
        SwaggerUIBundle({
          url: '/api-docs/mobile.json',
          dom_id: '#swagger-ui',
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
          plugins: [SwaggerUIBundle.plugins.DownloadUrl],
          layout: 'StandaloneLayout',
          persistAuthorization: true,
          displayRequestDuration: true,
          docExpansion: 'none',
          filter: true,
          showExtensions: true,
          showCommonExtensions: true,
        });
      };
    </script>
  </body>
</html>`);
});

// ================================================================================================
// ROUTES
// ================================================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'AutoService API - أكفيك',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API info
app.get('/', (req, res) => {
  res.json({
    service: 'AutoService API - أكفيك',
    version: '1.0.0',
    description: 'Comprehensive car services platform - منصة شاملة لخدمات السيارات',
    documentation: `${req.protocol}://${req.get('host')}/api-docs`,
    documentationMobile: `${req.protocol}://${req.get('host')}/api-docs/mobile`,
    health: `${req.protocol}://${req.get('host')}/health`
  });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use((req, res, next) => {
  next(new errorMiddleware.AppError('Route not found', 404, 'ROUTE_NOT_FOUND'));
});

// Global error handler
app.use(errorMiddleware);

module.exports = app;
