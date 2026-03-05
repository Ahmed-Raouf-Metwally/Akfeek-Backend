const prisma = require('../../utils/database/prisma');
const workshopService = require('../../services/workshop.service');
const { AppError } = require('../middlewares/error.middleware');

// GET /api/workshops/profile/me/services — Vendor: خدمات ورشتي (مع الأسعار)
async function getMyServices(req, res, next) {
  try {
    const workshop = await workshopService.getWorkshopByVendorUserId(req.user.id);
    if (!workshop) throw new AppError('No workshop linked to your account', 404, 'NOT_FOUND');
    const services = await prisma.certifiedWorkshopService.findMany({
      where: { workshopId: workshop.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: services });
  } catch (err) { next(err); }
}

// POST /api/workshops/profile/me/services — Vendor: إضافة خدمة (نوع، اسم، سعر، مدة، وصف)
async function addMyService(req, res, next) {
  try {
    const workshop = await workshopService.getWorkshopByVendorUserId(req.user.id);
    if (!workshop) throw new AppError('No workshop linked to your account', 404, 'NOT_FOUND');
    const { serviceType, name, nameAr, description, price, currency, estimatedDuration, isActive } = req.body;
    if (!name) throw new AppError('name is required', 400, 'VALIDATION_ERROR');
    if (price == null || isNaN(parseFloat(price))) throw new AppError('price is required', 400, 'VALIDATION_ERROR');
    const svc = await prisma.certifiedWorkshopService.create({
      data: {
        workshopId: workshop.id,
        serviceType: serviceType || 'GENERAL',
        name,
        nameAr: nameAr || null,
        description: description || null,
        price: parseFloat(price),
        currency: currency || 'SAR',
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null,
        isActive: isActive !== false,
      },
    });
    res.status(201).json({ success: true, data: svc });
  } catch (err) { next(err); }
}

// PUT /api/workshops/profile/me/services/:svcId — Vendor: تعديل خدمة
async function updateMyService(req, res, next) {
  try {
    const workshop = await workshopService.getWorkshopByVendorUserId(req.user.id);
    if (!workshop) throw new AppError('No workshop linked to your account', 404, 'NOT_FOUND');
    const { svcId } = req.params;
    const existing = await prisma.certifiedWorkshopService.findFirst({
      where: { id: svcId, workshopId: workshop.id },
    });
    if (!existing) throw new AppError('Service not found', 404, 'NOT_FOUND');
    const { serviceType, name, nameAr, description, price, currency, estimatedDuration, isActive } = req.body;
    const svc = await prisma.certifiedWorkshopService.update({
      where: { id: svcId },
      data: {
        ...(serviceType !== undefined && { serviceType }),
        ...(name !== undefined && { name }),
        ...(nameAr !== undefined && { nameAr }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(currency !== undefined && { currency }),
        ...(estimatedDuration !== undefined && { estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });
    res.json({ success: true, data: svc });
  } catch (err) { next(err); }
}

// DELETE /api/workshops/profile/me/services/:svcId — Vendor: حذف خدمة
async function removeMyService(req, res, next) {
  try {
    const workshop = await workshopService.getWorkshopByVendorUserId(req.user.id);
    if (!workshop) throw new AppError('No workshop linked to your account', 404, 'NOT_FOUND');
    const existing = await prisma.certifiedWorkshopService.findFirst({
      where: { id: req.params.svcId, workshopId: workshop.id },
    });
    if (!existing) throw new AppError('Service not found', 404, 'NOT_FOUND');
    await prisma.certifiedWorkshopService.delete({ where: { id: req.params.svcId } });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
}

// GET /api/workshops/:id/services
async function getServices(req, res, next) {
  try {
    const { id: workshopId } = req.params;
    const ws = await prisma.certifiedWorkshop.findUnique({ where: { id: workshopId } });
    if (!ws) throw new AppError('Workshop not found', 404, 'NOT_FOUND');

    const services = await prisma.certifiedWorkshopService.findMany({
      where: { workshopId },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: services });
  } catch (err) { next(err); }
}

// POST /api/workshops/:id/services  (Admin)
async function addService(req, res, next) {
  try {
    const { id: workshopId } = req.params;
    const { serviceType, name, nameAr, description, price, currency, estimatedDuration } = req.body;

    if (!name) throw new AppError('name is required', 400, 'VALIDATION_ERROR');
    if (price == null || isNaN(parseFloat(price))) throw new AppError('price is required', 400, 'VALIDATION_ERROR');

    const ws = await prisma.certifiedWorkshop.findUnique({ where: { id: workshopId } });
    if (!ws) throw new AppError('Workshop not found', 404, 'NOT_FOUND');

    const svc = await prisma.certifiedWorkshopService.create({
      data: {
        workshopId,
        serviceType: serviceType || 'GENERAL',
        name,
        nameAr: nameAr || null,
        description: description || null,
        price: parseFloat(price),
        currency: currency || 'SAR',
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null,
      },
    });

    res.status(201).json({ success: true, data: svc });
  } catch (err) { next(err); }
}

// PUT /api/workshops/:id/services/:svcId  (Admin)
async function updateService(req, res, next) {
  try {
    const { svcId } = req.params;
    const { serviceType, name, nameAr, description, price, currency, estimatedDuration, isActive } = req.body;

    const existing = await prisma.certifiedWorkshopService.findUnique({ where: { id: svcId } });
    if (!existing) throw new AppError('Service not found', 404, 'NOT_FOUND');

    const svc = await prisma.certifiedWorkshopService.update({
      where: { id: svcId },
      data: {
        ...(serviceType       !== undefined && { serviceType }),
        ...(name              !== undefined && { name }),
        ...(nameAr            !== undefined && { nameAr }),
        ...(description       !== undefined && { description }),
        ...(price             !== undefined && { price: parseFloat(price) }),
        ...(currency          !== undefined && { currency }),
        ...(estimatedDuration !== undefined && { estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null }),
        ...(isActive          !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    res.json({ success: true, data: svc });
  } catch (err) { next(err); }
}

// DELETE /api/workshops/:id/services/:svcId  (Admin)
async function removeService(req, res, next) {
  try {
    const existing = await prisma.certifiedWorkshopService.findUnique({ where: { id: req.params.svcId } });
    if (!existing) throw new AppError('Service not found', 404, 'NOT_FOUND');
    await prisma.certifiedWorkshopService.delete({ where: { id: req.params.svcId } });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
}

module.exports = {
  getServices,
  addService,
  updateService,
  removeService,
  getMyServices,
  addMyService,
  updateMyService,
  removeMyService,
};
