const prisma = require('../../../utils/database/prisma');
const { success } = require('../../../utils/response');
const { AppError } = require('../../middlewares/error.middleware');

// Catalogs
async function listCatalogs(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const items = await prisma.mobileWorkshopCatalog.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        categories: {
          where: includeInactive ? {} : { isActive: true },
          include: {
            services: {
              where: includeInactive ? {} : { isActive: true },
            },
          },
        },
      },
    });
    const data = items.map((catalog) => {
      const prices = (catalog.categories || [])
        .flatMap((category) => category.services || [])
        .map((service) => (service.priceMin == null ? null : Number(service.priceMin)))
        .filter((v) => typeof v === 'number');
      const firstService = (catalog.categories || []).flatMap((category) => category.services || [])[0];
      return {
        ...catalog,
        priceMin: prices.length ? Math.min(...prices) : null,
        priceMax: prices.length ? Math.max(...prices) : null,
        currency: firstService?.currency || 'SAR',
      };
    });
    return success(res, data, { message: 'Catalogs retrieved', messageAr: 'تم استرجاع الكاتالوج' });
  } catch (e) { next(e); }
}

async function createCatalog(req, res, next) {
  try {
    const { name, nameAr, imageUrl, sortOrder, isActive } = req.body || {};
    if (!name) throw new AppError('name is required', 400, 'VALIDATION_ERROR');
    const item = await prisma.mobileWorkshopCatalog.create({
      data: {
        name: String(name),
        nameAr: nameAr == null ? null : String(nameAr),
        imageUrl: imageUrl == null ? null : String(imageUrl),
        sortOrder: sortOrder != null ? Number(sortOrder) : 0,
        isActive: isActive !== false,
      },
    });
    return success(res, item, { statusCode: 201, message: 'Catalog created', messageAr: 'تم إنشاء كاتالوج' });
  } catch (e) { next(e); }
}

async function updateCatalog(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.mobileWorkshopCatalog.findUnique({ where: { id } });
    if (!existing) throw new AppError('Catalog not found', 404, 'NOT_FOUND');
    const { name, nameAr, imageUrl, sortOrder, isActive } = req.body || {};
    const item = await prisma.mobileWorkshopCatalog.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name) }),
        ...(nameAr !== undefined && { nameAr: nameAr == null ? null : String(nameAr) }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl == null ? null : String(imageUrl) }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });
    return success(res, item, { message: 'Catalog updated', messageAr: 'تم تحديث الكاتالوج' });
  } catch (e) { next(e); }
}

async function deleteCatalog(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.mobileWorkshopCatalog.delete({ where: { id } });
    return success(res, { id }, { message: 'Catalog deleted', messageAr: 'تم حذف الكاتالوج' });
  } catch (e) { next(e); }
}

// Categories
async function listCategories(req, res, next) {
  try {
    const { catalogId } = req.params;
    const includeInactive = req.query.includeInactive === 'true';
    const items = await prisma.mobileWorkshopCategory.findMany({
      where: { catalogId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return success(res, items, { message: 'Categories retrieved', messageAr: 'تم استرجاع التصنيفات' });
  } catch (e) { next(e); }
}

async function createCategory(req, res, next) {
  try {
    const { catalogId } = req.params;
    const { name, nameAr, imageUrl, sortOrder, isActive } = req.body || {};
    if (!name) throw new AppError('name is required', 400, 'VALIDATION_ERROR');
    const item = await prisma.mobileWorkshopCategory.create({
      data: {
        catalogId,
        name: String(name),
        nameAr: nameAr == null ? null : String(nameAr),
        imageUrl: imageUrl == null ? null : String(imageUrl),
        sortOrder: sortOrder != null ? Number(sortOrder) : 0,
        isActive: isActive !== false,
      },
    });
    return success(res, item, { statusCode: 201, message: 'Category created', messageAr: 'تم إنشاء تصنيف' });
  } catch (e) { next(e); }
}

async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.mobileWorkshopCategory.findUnique({ where: { id } });
    if (!existing) throw new AppError('Category not found', 404, 'NOT_FOUND');
    const { name, nameAr, imageUrl, sortOrder, isActive } = req.body || {};
    const item = await prisma.mobileWorkshopCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name) }),
        ...(nameAr !== undefined && { nameAr: nameAr == null ? null : String(nameAr) }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl == null ? null : String(imageUrl) }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });
    return success(res, item, { message: 'Category updated', messageAr: 'تم تحديث التصنيف' });
  } catch (e) { next(e); }
}

async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.mobileWorkshopCategory.delete({ where: { id } });
    return success(res, { id }, { message: 'Category deleted', messageAr: 'تم حذف التصنيف' });
  } catch (e) { next(e); }
}

// Services
async function listServices(req, res, next) {
  try {
    const { categoryId } = req.params;
    const includeInactive = req.query.includeInactive === 'true';
    const items = await prisma.mobileWorkshopCatalogService.findMany({
      where: { categoryId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const data = items.map((item) => ({
      ...item,
      price: item.priceMin == null ? null : Number(item.priceMin),
    }));
    return success(res, data, { message: 'Services retrieved', messageAr: 'تم استرجاع الخدمات' });
  } catch (e) { next(e); }
}

async function createService(req, res, next) {
  try {
    const { categoryId } = req.params;
    const { name, nameAr, imageUrl, price, priceMin, priceMax, currency, pricingNoteAr, sortOrder, isActive } = req.body || {};
    if (!name) throw new AppError('name is required', 400, 'VALIDATION_ERROR');
    const singlePrice = price != null && price !== '' ? Number(price) : (priceMin == null ? null : Number(priceMin));
    const item = await prisma.mobileWorkshopCatalogService.create({
      data: {
        categoryId,
        name: String(name),
        nameAr: nameAr == null ? null : String(nameAr),
        imageUrl: imageUrl == null ? null : String(imageUrl),
        priceMin: singlePrice,
        priceMax: singlePrice,
        currency: currency == null ? 'SAR' : String(currency),
        pricingNoteAr: pricingNoteAr == null ? null : String(pricingNoteAr),
        sortOrder: sortOrder != null ? Number(sortOrder) : 0,
        isActive: isActive !== false,
      },
    });
    return success(res, { ...item, price: item.priceMin == null ? null : Number(item.priceMin) }, { statusCode: 201, message: 'Service created', messageAr: 'تم إنشاء خدمة' });
  } catch (e) { next(e); }
}

async function updateService(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.mobileWorkshopCatalogService.findUnique({ where: { id } });
    if (!existing) throw new AppError('Service not found', 404, 'NOT_FOUND');
    const { name, nameAr, imageUrl, price, priceMin, priceMax, currency, pricingNoteAr, sortOrder, isActive } = req.body || {};
    const singlePrice =
      price !== undefined
        ? (price == null || price === '' ? null : Number(price))
        : (priceMin !== undefined
          ? (priceMin == null || priceMin === '' ? null : Number(priceMin))
          : undefined);
    const item = await prisma.mobileWorkshopCatalogService.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name) }),
        ...(nameAr !== undefined && { nameAr: nameAr == null ? null : String(nameAr) }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl == null ? null : String(imageUrl) }),
        ...(singlePrice !== undefined && { priceMin: singlePrice, priceMax: singlePrice }),
        ...(currency !== undefined && { currency: currency == null ? 'SAR' : String(currency) }),
        ...(pricingNoteAr !== undefined && { pricingNoteAr: pricingNoteAr == null ? null : String(pricingNoteAr) }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });
    return success(res, { ...item, price: item.priceMin == null ? null : Number(item.priceMin) }, { message: 'Service updated', messageAr: 'تم تحديث الخدمة' });
  } catch (e) { next(e); }
}

async function deleteService(req, res, next) {
  try {
    const { id } = req.params;
    await prisma.mobileWorkshopCatalogService.delete({ where: { id } });
    return success(res, { id }, { message: 'Service deleted', messageAr: 'تم حذف الخدمة' });
  } catch (e) { next(e); }
}

module.exports = {
  listCatalogs,
  createCatalog,
  updateCatalog,
  deleteCatalog,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listServices,
  createService,
  updateService,
  deleteService,
};

