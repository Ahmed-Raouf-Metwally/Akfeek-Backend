const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');

// ── MobileWorkshopType (نوع الورشة = نوع الخدمة — حقل واحد) ─────────────────

async function getAllTypes(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const types = await prisma.mobileWorkshopType.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        typeServices: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
    res.json({ success: true, data: types });
  } catch (err) { next(err); }
}

async function getTypeById(req, res, next) {
  try {
    const type = await prisma.mobileWorkshopType.findUnique({
      where: { id: req.params.id },
      include: {
        typeServices: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      },
    });
    if (!type) throw new AppError('Workshop type not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: type });
  } catch (err) { next(err); }
}

async function createType(req, res, next) {
  try {
    const { name, nameAr, description, serviceType, sortOrder, isActive } = req.body;
    if (!name) throw new AppError('name is required', 400, 'VALIDATION_ERROR');
    const type = await prisma.mobileWorkshopType.create({
      data: {
        name,
        nameAr: nameAr || null,
        description: description || null,
        serviceType: serviceType ? String(serviceType).toUpperCase() : 'GENERAL',
        sortOrder: sortOrder != null ? parseInt(sortOrder) : 0,
        isActive: isActive !== false,
      },
    });
    res.status(201).json({ success: true, data: type });
  } catch (err) { next(err); }
}

async function updateType(req, res, next) {
  try {
    const existing = await prisma.mobileWorkshopType.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Workshop type not found', 404, 'NOT_FOUND');
    const { name, nameAr, description, serviceType, sortOrder, isActive } = req.body;
    const type = await prisma.mobileWorkshopType.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(nameAr !== undefined && { nameAr }),
        ...(description !== undefined && { description }),
        ...(serviceType !== undefined && { serviceType: String(serviceType).toUpperCase() }),
        ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });
    res.json({ success: true, data: type });
  } catch (err) { next(err); }
}

async function deleteType(req, res, next) {
  try {
    const existing = await prisma.mobileWorkshopType.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Workshop type not found', 404, 'NOT_FOUND');
    await prisma.mobileWorkshopType.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
}

// ── MobileWorkshopTypeService (خدمات نوع الورشة — يضيفها الأدمن داخل كل نوع) ──

async function getTypeServices(req, res, next) {
  try {
    const typeId = req.params.typeId;
    const type = await prisma.mobileWorkshopType.findUnique({ where: { id: typeId } });
    if (!type) throw new AppError('Workshop type not found', 404, 'NOT_FOUND');
    const list = await prisma.mobileWorkshopTypeService.findMany({
      where: { workshopTypeId: typeId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
}

async function createTypeService(req, res, next) {
  try {
    const typeId = req.params.typeId;
    const { name, nameAr, description, sortOrder, isActive } = req.body;
    if (!name) throw new AppError('name is required', 400, 'VALIDATION_ERROR');
    const type = await prisma.mobileWorkshopType.findUnique({ where: { id: typeId } });
    if (!type) throw new AppError('Workshop type not found', 404, 'NOT_FOUND');
    const created = await prisma.mobileWorkshopTypeService.create({
      data: {
        workshopTypeId: typeId,
        name,
        nameAr: nameAr || null,
        description: description || null,
        sortOrder: sortOrder != null ? parseInt(sortOrder) : 0,
        isActive: isActive !== false,
      },
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) { next(err); }
}

async function updateTypeService(req, res, next) {
  try {
    const { typeId, serviceId } = req.params;
    const existing = await prisma.mobileWorkshopTypeService.findFirst({
      where: { id: serviceId, workshopTypeId: typeId },
    });
    if (!existing) throw new AppError('Type service not found', 404, 'NOT_FOUND');
    const { name, nameAr, description, sortOrder, isActive } = req.body;
    const updated = await prisma.mobileWorkshopTypeService.update({
      where: { id: serviceId },
      data: {
        ...(name !== undefined && { name }),
        ...(nameAr !== undefined && { nameAr }),
        ...(description !== undefined && { description }),
        ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

async function deleteTypeService(req, res, next) {
  try {
    const { typeId, serviceId } = req.params;
    const existing = await prisma.mobileWorkshopTypeService.findFirst({
      where: { id: serviceId, workshopTypeId: typeId },
    });
    if (!existing) throw new AppError('Type service not found', 404, 'NOT_FOUND');
    await prisma.mobileWorkshopTypeService.delete({ where: { id: serviceId } });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
}

module.exports = {
  getAllTypes,
  getTypeById,
  createType,
  updateType,
  deleteType,
  getTypeServices,
  createTypeService,
  updateTypeService,
  deleteTypeService,
};
