/**
 * OpenAPI subset for mobile apps (customer + vendor field + technician towing/carwash).
 * Filters the full swagger-jsdoc output — admin, dashboard, and activity-only routes are removed.
 */
const baseSwagger = require('./swagger');

/** Path prefixes kept in the mobile doc (must match `/api/...` keys in the merged spec). */
const MOBILE_PATH_PREFIXES = [
  '/api/auth',
  '/api/role-labels',
  '/api/banners',
  '/api/service-offers',
  '/api/about-us',
  '/api/akfeek-journey',
  '/api/brands',
  '/api/models',
  '/api/users',
  '/api/vehicles',
  '/api/services',
  '/api/bookings',
  '/api/inspections',
  '/api/broadcasts',
  '/api/invoices',
  '/api/payments',
  '/api/wallets',
  '/api/ratings',
  '/api/notifications',
  '/api/addresses',
  '/api/feedback',
  '/api/technical-support-requests',
  '/api/vendor-onboarding',
  '/api/vendors',
  '/api/auto-part-categories',
  '/api/auto-parts',
  '/api/marketplace-orders',
  '/api/cart',
  '/api/workshops',
  '/api/winches',
  '/api/mobile-workshops',
  '/api/mobile-workshop',
  '/api/mobile-car-service',
  '/api/packages',
  '/api/user-packages',
  '/api/supplies',
  '/api/technician',
];

function isMobilePath(pathKey) {
  if (!pathKey || typeof pathKey !== 'string') return false;
  if (pathKey.startsWith('/api/admin')) return false;
  if (pathKey.startsWith('/api/dashboard')) return false;
  if (pathKey === '/api/activity' || pathKey.startsWith('/api/activity/')) return false;
  return MOBILE_PATH_PREFIXES.some(
    (prefix) => pathKey === prefix || pathKey.startsWith(`${prefix}/`)
  );
}

function collectTagsFromPaths(paths) {
  const used = new Set();
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];
  Object.values(paths).forEach((pathItem) => {
    if (!pathItem || typeof pathItem !== 'object') return;
    for (const m of methods) {
      const op = pathItem[m];
      if (op && Array.isArray(op.tags)) {
        op.tags.forEach((t) => used.add(t));
      }
    }
  });
  return used;
}

let cachedSpec = null;

function buildMobileSwaggerSpec() {
  if (cachedSpec) return cachedSpec;

  const spec = JSON.parse(JSON.stringify(baseSwagger));
  const paths = spec.paths || {};
  const filteredPaths = {};
  for (const [key, value] of Object.entries(paths)) {
    if (isMobilePath(key)) filteredPaths[key] = value;
  }
  spec.paths = filteredPaths;

  const usedTags = collectTagsFromPaths(filteredPaths);
  if (Array.isArray(spec.tags)) {
    spec.tags = spec.tags.filter((t) => t && usedTags.has(t.name));
  }

  const mobileBlurb = `
## Mobile documentation (أكفيك — تطبيق الموبايل)

This page lists **customer and field-app** endpoints (marketplace, bookings, towing, workshops, invoices, etc.).
**Admin** and **dashboard** routes are hidden here — use the full **[\`/api-docs\`](/api-docs)** for operators.

**JSON:** [\`/api-docs/mobile.json\`](/api-docs/mobile.json)
`.trim();

  spec.info = {
    ...spec.info,
    title: `${spec.info?.title || 'Akfeek API'} — Mobile`,
    description: [spec.info?.description || '', mobileBlurb].filter(Boolean).join('\n\n'),
  };

  cachedSpec = spec;
  return cachedSpec;
}

module.exports = { buildMobileSwaggerSpec, MOBILE_PATH_PREFIXES };
