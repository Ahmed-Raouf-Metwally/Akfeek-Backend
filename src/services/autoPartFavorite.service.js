const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');

const DEFAULT_PUBLIC_BASE_URL = 'https://akfeek-backend.developteam.site';
const getPublicBaseUrl = () =>
  (process.env.PUBLIC_BASE_URL || DEFAULT_PUBLIC_BASE_URL).replace(/\/+$/, '');

function normalizeImageUrl(url) {
  if (typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const baseUrl = getPublicBaseUrl();
  if (!baseUrl) return trimmed;
  return `${baseUrl}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

const autoPartFavoriteSelect = {
  id: true,
  sku: true,
  name: true,
  nameAr: true,
  price: true,
  stockQuantity: true,
  isActive: true,
  isApproved: true,
  badges: true,
  category: { select: { id: true, name: true, nameAr: true } },
  brandRef: { select: { id: true, name: true, nameAr: true, logo: true } },
  images: {
    take: 1,
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
    select: { url: true, isPrimary: true },
  },
};

function mapFavoriteRow(row) {
  const p = row.autoPart;
  const primary = p.images?.[0];
  return {
    favoriteId: row.id,
    createdAt: row.createdAt,
    autoPart: {
      ...p,
      badges: Array.isArray(p.badges) ? p.badges : p.badges ?? [],
      primaryImageUrl: primary?.url ? normalizeImageUrl(primary.url) : null,
      brandLogoUrl: p.brandRef?.logo ? normalizeImageUrl(p.brandRef.logo) : null,
    },
  };
}

/**
 * List current user's favorite parts (newest first).
 */
async function listFavorites(userId, { page = 1, limit = 20 } = {}) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (p - 1) * l;

  const [rows, total] = await Promise.all([
    prisma.autoPartFavorite.findMany({
      where: { userId },
      skip,
      take: l,
      orderBy: { createdAt: 'desc' },
      include: { autoPart: { select: autoPartFavoriteSelect } },
    }),
    prisma.autoPartFavorite.count({ where: { userId } }),
  ]);

  return {
    items: rows.map(mapFavoriteRow),
    pagination: {
      page: p,
      limit: l,
      total,
      totalPages: Math.ceil(total / l) || 0,
    },
  };
}

/**
 * Whether the user has favorited this part (for product detail, etc.).
 */
async function isFavorite(userId, autoPartId) {
  if (!userId) return false;
  const row = await prisma.autoPartFavorite.findUnique({
    where: {
      userId_autoPartId: { userId, autoPartId },
    },
    select: { id: true },
  });
  return !!row;
}

/**
 * Add part to favorites. Idempotent if already present.
 */
async function addFavorite(userId, autoPartId) {
  if (!autoPartId) {
    throw new AppError('autoPartId is required', 400, 'VALIDATION_ERROR');
  }

  const part = await prisma.autoPart.findUnique({
    where: { id: autoPartId },
    select: { id: true, isActive: true, isApproved: true },
  });
  if (!part) {
    throw new AppError('Product not found', 404, 'NOT_FOUND');
  }
  if (!part.isActive || !part.isApproved) {
    throw new AppError('Product is not available', 400, 'PART_UNAVAILABLE');
  }

  await prisma.autoPartFavorite.upsert({
    where: {
      userId_autoPartId: { userId, autoPartId },
    },
    create: { userId, autoPartId },
    update: {},
  });

  const row = await prisma.autoPartFavorite.findUnique({
    where: { userId_autoPartId: { userId, autoPartId } },
    include: { autoPart: { select: autoPartFavoriteSelect } },
  });
  return mapFavoriteRow(row);
}

/**
 * Remove part from favorites.
 */
async function removeFavorite(userId, autoPartId) {
  const result = await prisma.autoPartFavorite.deleteMany({
    where: { userId, autoPartId },
  });
  if (result.count === 0) {
    throw new AppError('Favorite not found', 404, 'NOT_FOUND');
  }
  return { removed: true, autoPartId };
}

module.exports = {
  listFavorites,
  isFavorite,
  addFavorite,
  removeFavorite,
};
