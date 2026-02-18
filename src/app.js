const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
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

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .info .title { font-size: 32px; color: #1976d2 }
  `,
  customSiteTitle: 'AutoService API Docs - أكفيك',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  }
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
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
