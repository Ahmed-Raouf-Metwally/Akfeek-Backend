const prisma = require('../../../utils/database/prisma');
const { success } = require('../../../utils/response');
const { AppError } = require('../../middlewares/error.middleware');

const ALLOWED_KEYS = [
  'BATTERY',
  'TIRE_SERVICE',
  'ENGINE_OIL',
  'ELECTRICAL',
  'ENGINE_PROBLEMS',
  'MAINTENANCE',
  'OTHER_ISSUE',
];

function normalizeKey(key) {
  return String(key || '').trim().toUpperCase();
}

async function list(req, res, next) {
  try {
    const items = await prisma.mobileWorkshopCatalogItem.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return success(res, items, {
      message: 'Mobile workshop catalog items retrieved',
      messageAr: 'تم استرجاع عناصر كاتالوج الورش المتنقلة',
    });
  } catch (err) {
    next(err);
  }
}

async function upsert(req, res, next) {
  try {
    const key = normalizeKey(req.params.key);
    if (!ALLOWED_KEYS.includes(key)) {
      throw new AppError('Invalid catalog key (design-locked)', 400, 'VALIDATION_ERROR', {
        allowedKeys: ALLOWED_KEYS,
      });
    }

    const { nameAr, pricingNoteAr, priceMin, priceMax, currency, sortOrder, isActive } = req.body || {};

    const payload = {
      ...(nameAr !== undefined && { nameAr: String(nameAr) }),
      ...(pricingNoteAr !== undefined && { pricingNoteAr: pricingNoteAr == null ? null : String(pricingNoteAr) }),
      ...(priceMin !== undefined && { priceMin: priceMin == null ? null : Number(priceMin) }),
      ...(priceMax !== undefined && { priceMax: priceMax == null ? null : Number(priceMax) }),
      ...(currency !== undefined && { currency: String(currency) }),
      ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    };

    const item = await prisma.mobileWorkshopCatalogItem.upsert({
      where: { key },
      update: payload,
      create: {
        key,
        nameAr: payload.nameAr || key,
        pricingNoteAr: payload.pricingNoteAr || null,
        priceMin: payload.priceMin ?? null,
        priceMax: payload.priceMax ?? null,
        currency: payload.currency || 'SAR',
        sortOrder: payload.sortOrder ?? 0,
        isActive: payload.isActive ?? true,
      },
    });

    return success(res, item, {
      message: 'Catalog item saved',
      messageAr: 'تم حفظ عنصر الكاتالوج',
    });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    // Design-locked: keep the 7 keys; allow disabling via isActive instead of deleting rows.
    throw new AppError('Deleting catalog items is not allowed (design-locked). Use isActive=false.', 405, 'FORBIDDEN');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  upsert,
  remove,
};

