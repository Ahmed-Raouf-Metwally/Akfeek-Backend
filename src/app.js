const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const { fullSpec, mobileSpec, technicianSpec, vendorSpec, adminSpec } = require('./config/swagger');
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
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

// HTTP request logging
app.use(morgan('combined', { stream: logger.stream }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// ================================================================================================
// SWAGGER DOCUMENTATION
// ================================================================================================

// ── Step 1: Serve JSON specs at dedicated endpoints (BEFORE static assets)
app.get('/api-docs.json',            (req, res) => res.json(fullSpec));
app.get('/api-docs/mobile.json',     (req, res) => res.json(mobileSpec));
app.get('/api-docs/technician.json', (req, res) => res.json(technicianSpec));
app.get('/api-docs/vendor.json',     (req, res) => res.json(vendorSpec));
app.get('/api-docs/admin.json',      (req, res) => res.json(adminSpec));

// ── Step 2: Shared static assets (CSS, JS bundles) served ONCE from /api-docs
app.use('/api-docs', swaggerUi.serve);

// ── Step 3: Shared UI options
const sharedUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .info .title { font-size: 28px; color: #1976d2; font-weight: 700 }
    .swagger-ui .scheme-container { background: #f8f9fa; padding: 16px; border-radius: 8px }
    .swagger-ui .opblock-tag { font-size: 15px }
  `,
  customfavIcon: '/favicon.ico',
};

// ── Step 4: Each page loads its OWN spec via `url` — this is the key fix.
//    Passing `null` as spec + swaggerOptions.url makes swagger-ui fetch the
//    spec from the URL instead of embedding the full spec in the HTML.

app.get('/api-docs', swaggerUi.setup(null, {
  ...sharedUiOptions,
  customSiteTitle: '🚗 Akfeek API — Full Reference',
  swaggerOptions: {
    url: '/api-docs.json',
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    tryItOutEnabled: true,
  },
}));

app.get('/api-docs/mobile', swaggerUi.setup(null, {
  ...sharedUiOptions,
  customSiteTitle: '📱 Akfeek — Customer Mobile App',
  swaggerOptions: {
    url: '/api-docs/mobile.json',
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    tryItOutEnabled: true,
  },
}));

app.get('/api-docs/technician', swaggerUi.setup(null, {
  ...sharedUiOptions,
  customSiteTitle: '🔧 Akfeek — Technician App',
  swaggerOptions: {
    url: '/api-docs/technician.json',
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    tryItOutEnabled: true,
  },
}));

app.get('/api-docs/vendor', swaggerUi.setup(null, {
  ...sharedUiOptions,
  customSiteTitle: '🏪 Akfeek — Vendor / Workshop Portal',
  swaggerOptions: {
    url: '/api-docs/vendor.json',
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    tryItOutEnabled: true,
  },
}));

app.get('/api-docs/admin', swaggerUi.setup(null, {
  ...sharedUiOptions,
  customSiteTitle: '⚙️ Akfeek — Admin Dashboard',
  swaggerOptions: {
    url: '/api-docs/admin.json',
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    tryItOutEnabled: true,
  },
}));

// ── Index page listing all swagger docs
app.get('/api-docs-index', (req, res) => {
  const host = `${req.protocol}://${req.get('host')}`;
  res.json({
    message: 'Akfeek API Documentation Index — فهرس وثائق أكفيك',
    docs: {
      '🚗 Full Reference':      `${host}/api-docs`,
      '📱 Customer Mobile':     `${host}/api-docs/mobile`,
      '🔧 Technician App':      `${host}/api-docs/technician`,
      '🏪 Vendor Portal':       `${host}/api-docs/vendor`,
      '⚙️ Admin Dashboard':     `${host}/api-docs/admin`,
    },
    json: {
      full:        `${host}/api-docs.json`,
      mobile:      `${host}/api-docs/mobile.json`,
      technician:  `${host}/api-docs/technician.json`,
      vendor:      `${host}/api-docs/vendor.json`,
      admin:       `${host}/api-docs/admin.json`,
    },
  });
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
