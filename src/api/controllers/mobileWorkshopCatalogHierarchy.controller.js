const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');
const { success } = require('../../utils/response');

function assertPrismaDelegates() {
  if (!prisma?.mobileWorkshopCatalog || !prisma?.mobileWorkshopCategory || !prisma?.mobileWorkshopCatalogService) {
    throw new AppError(
      'Prisma Client is out of date (missing mobile workshop catalog models). Run prisma generate/migrations and restart the server.',
      500,
      'PRISMA_CLIENT_OUTDATED'
    );
  }
}

async function getActiveCatalogs(req, res, next) {
  try {
    assertPrismaDelegates();
    const catalogs = await prisma.mobileWorkshopCatalog.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        categories: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            services: {
              where: { isActive: true },
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            },
          },
        },
      },
    });

    // UI-friendly:
    // - service has a single price only
    // - category/catalog min/max are derived automatically from nested services
    const catalogsUi = catalogs.map((catalog) => ({
      ...catalog,
      categories: (catalog.categories || []).map((category) => {
        const services = (category.services || []).map((s) => ({
          id: s.id,
          categoryId: s.categoryId,
          name: s.name,
          nameAr: s.nameAr,
          imageUrl: s.imageUrl,
          price: s.priceMin == null ? null : Number(s.priceMin),
          currency: s.currency || 'SAR',
          pricingNoteAr: s.pricingNoteAr || null,
          sortOrder: s.sortOrder,
          isActive: s.isActive,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        }));

        const numericPrices = (category.services || [])
          .map((s) => (s.priceMin == null ? null : Number(s.priceMin)))
          .filter((v) => typeof v === 'number');

        return {
          ...category,
          priceMin: numericPrices.length ? Math.min(...numericPrices) : null,
          priceMax: numericPrices.length ? Math.max(...numericPrices) : null,
          currency: services[0]?.currency || 'SAR',
          pricingNoteAr: services.find((x) => x.pricingNoteAr)?.pricingNoteAr || null,
          services,
        };
      }),
      priceMin: (() => {
        const prices = (catalog.categories || [])
          .flatMap((category) => category.services || [])
          .map((s) => (s.priceMin == null ? null : Number(s.priceMin)))
          .filter((v) => typeof v === 'number');
        return prices.length ? Math.min(...prices) : null;
      })(),
      priceMax: (() => {
        const prices = (catalog.categories || [])
          .flatMap((category) => category.services || [])
          .map((s) => (s.priceMin == null ? null : Number(s.priceMin)))
          .filter((v) => typeof v === 'number');
        return prices.length ? Math.max(...prices) : null;
      })(),
      currency: (() => {
        const firstService = (catalog.categories || []).flatMap((category) => category.services || [])[0];
        return firstService?.currency || 'SAR';
      })(),
    }));
    return success(res, catalogsUi, {
      message: 'Mobile workshop catalogs retrieved',
      messageAr: 'تم استرجاع كاتالوج الورش المتنقلة',
    });
  } catch (e) {
    next(e);
  }
}

async function getActiveCategoriesByCatalogId(req, res, next) {
  try {
    assertPrismaDelegates();
    const { catalogId } = req.params;
    const categories = await prisma.mobileWorkshopCategory.findMany({
      where: { catalogId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return success(res, categories, {
      message: 'Mobile workshop categories retrieved',
      messageAr: 'تم استرجاع تصنيفات الورش المتنقلة',
    });
  } catch (e) {
    next(e);
  }
}

async function getActiveServicesByCategoryId(req, res, next) {
  try {
    assertPrismaDelegates();
    const { categoryId } = req.params;
    const services = await prisma.mobileWorkshopCatalogService.findMany({
      where: { categoryId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const servicesUi = services.map((s) => ({
      id: s.id,
      categoryId: s.categoryId,
      name: s.name,
      nameAr: s.nameAr,
      imageUrl: s.imageUrl,
      price: s.priceMin == null ? null : Number(s.priceMin),
      currency: s.currency || 'SAR',
      pricingNoteAr: s.pricingNoteAr || null,
      sortOrder: s.sortOrder,
      isActive: s.isActive,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return success(res, servicesUi, {
      message: 'Mobile workshop services retrieved',
      messageAr: 'تم استرجاع خدمات الورش المتنقلة',
    });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getActiveCatalogs,
  getActiveCategoriesByCatalogId,
  getActiveServicesByCategoryId,
};

