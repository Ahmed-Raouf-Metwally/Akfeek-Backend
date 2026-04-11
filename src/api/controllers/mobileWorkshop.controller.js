const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');
const { getFullUrl } = require('../../utils/urlUtils');

const SELECT = {
  id: true, name: true, nameAr: true, description: true,
  workshopTypeId: true,
  vehicleType: true, vehicleModel: true, year: true, plateNumber: true,
  servicesOffered: true,
  city: true, latitude: true, longitude: true, serviceRadius: true,
  basePrice: true, pricePerKm: true, hourlyRate: true, minPrice: true, currency: true,
  imageUrl: true, vehicleImageUrl: true,
  isAvailable: true, isActive: true, isVerified: true, verifiedAt: true,
  totalJobs: true, averageRating: true, totalReviews: true,
  vendorId: true, createdAt: true, updatedAt: true,
  workshopType: { select: { id: true, name: true, nameAr: true } },
  services: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, workshopTypeServiceId: true, serviceType: true, name: true, nameAr: true,
      description: true, price: true, currency: true,
      estimatedDuration: true, isActive: true,
      createdAt: true,
      workshopTypeService: { select: { id: true, name: true, nameAr: true } },
    },
  },
  vendor: {
    select: {
      id: true, businessName: true, businessNameAr: true,
      logo: true, vendorType: true, status: true,
      user: { select: { id: true, email: true, phone: true } },
    },
  },
};

// GET /api/mobile-workshops
async function getAll(req, res, next) {
  try {
    const page      = Math.max(1, parseInt(req.query.page)  || 1);
    const limit     = Math.min(100, Math.max(1, parseInt(req.query.limit) || 12));
    const skip      = (page - 1) * limit;
    const search    = (req.query.search || '').trim();
    const available = req.query.available;
    const city      = req.query.city;

    const workshopTypeId = req.query.workshopTypeId;
    const serviceType = req.query.serviceType;
    const where = {
      ...(available !== undefined && { isAvailable: available === 'true' }),
      ...(city && { city: { contains: city } }),
      ...(workshopTypeId && { workshopTypeId }),
      ...(serviceType && {
        services: { some: { serviceType: String(serviceType).toUpperCase(), isActive: true } },
      }),
      ...(search && {
        OR: [
          { name:         { contains: search } },
          { nameAr:       { contains: search } },
          { plateNumber:  { contains: search } },
          { vehicleModel: { contains: search } },
          { city:         { contains: search } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.mobileWorkshop.findMany({ where, select: SELECT, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.mobileWorkshop.count({ where }),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) { next(err); }
}

// GET /api/mobile-workshops/my
async function getMy(req, res, next) {
  try {
    const vendor = await prisma.vendorProfile.findFirst({
      where: { userId: req.user.id, vendorType: 'MOBILE_WORKSHOP' },
      include: { mobileWorkshop: { select: SELECT } },
    });
    if (!vendor?.mobileWorkshop) {
      throw new AppError('No mobile workshop linked to your vendor account', 404, 'NOT_FOUND');
    }
    res.json({ success: true, data: vendor.mobileWorkshop });
  } catch (err) { next(err); }
}

// POST /api/mobile-workshops/my — فيندور MOBILE_WORKSHOP: إنشاء ورشته المتنقلة
async function createMy(req, res, next) {
  try {
    const vendor = await prisma.vendorProfile.findFirst({
      where: { userId: req.user.id, vendorType: 'MOBILE_WORKSHOP' },
      include: { mobileWorkshop: true },
    });
    if (!vendor) throw new AppError('You must be a MOBILE_WORKSHOP vendor', 403, 'FORBIDDEN');
    if (vendor.mobileWorkshop) throw new AppError('You already have a mobile workshop. Edit it instead.', 409, 'DUPLICATE');

    const {
      name, nameAr, description, workshopTypeId,
      vehicleType, vehicleModel, year, plateNumber, servicesOffered,
      city, latitude, longitude, serviceRadius,
      basePrice, pricePerKm, hourlyRate, minPrice, currency,
    } = req.body;

    if (!name) throw new AppError('name is required', 400, 'VALIDATION_ERROR');

    const item = await prisma.mobileWorkshop.create({
      data: {
        name, nameAr: nameAr || null, description: description || null,
        workshopTypeId: workshopTypeId || null,
        vehicleType: vehicleType || null, vehicleModel: vehicleModel || null,
        year: year ? parseInt(year) : null,
        plateNumber: plateNumber || null,
        servicesOffered: servicesOffered || null,
        city: city || null,
        latitude:      latitude      ? parseFloat(latitude)      : null,
        longitude:     longitude     ? parseFloat(longitude)     : null,
        serviceRadius: serviceRadius ? parseFloat(serviceRadius) : null,
        basePrice:  basePrice  ? parseFloat(basePrice)  : null,
        pricePerKm: pricePerKm ? parseFloat(pricePerKm) : null,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        minPrice:   minPrice   ? parseFloat(minPrice)   : null,
        currency:   currency   || 'SAR',
        vendorId: vendor.id,
        isAvailable: true,
        isActive: true,
      },
      select: SELECT,
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
}

// PUT /api/mobile-workshops/my — فيندور: تحديث ورشته المتنقلة
async function updateMy(req, res, next) {
  try {
    const vendor = await prisma.vendorProfile.findFirst({
      where: { userId: req.user.id, vendorType: 'MOBILE_WORKSHOP' },
      include: { mobileWorkshop: true },
    });
    if (!vendor?.mobileWorkshop) throw new AppError('No mobile workshop linked to your vendor account', 404, 'NOT_FOUND');
    const wid = vendor.mobileWorkshop.id;

    const {
      name, nameAr, description, workshopTypeId,
      vehicleType, vehicleModel, year, plateNumber, servicesOffered,
      city, latitude, longitude, serviceRadius,
      basePrice, pricePerKm, hourlyRate, minPrice, currency,
      isAvailable,
    } = req.body;

    const item = await prisma.mobileWorkshop.update({
      where: { id: wid },
      data: {
        ...(name             !== undefined && { name }),
        ...(nameAr           !== undefined && { nameAr }),
        ...(description      !== undefined && { description }),
        ...(workshopTypeId   !== undefined && { workshopTypeId: workshopTypeId || null }),
        ...(vehicleType      !== undefined && { vehicleType }),
        ...(vehicleModel     !== undefined && { vehicleModel }),
        ...(year             !== undefined && { year: year ? parseInt(year) : null }),
        ...(plateNumber      !== undefined && { plateNumber }),
        ...(servicesOffered  !== undefined && { servicesOffered }),
        ...(city             !== undefined && { city }),
        ...(latitude         !== undefined && { latitude:      latitude      ? parseFloat(latitude)      : null }),
        ...(longitude        !== undefined && { longitude:     longitude     ? parseFloat(longitude)     : null }),
        ...(serviceRadius    !== undefined && { serviceRadius: serviceRadius ? parseFloat(serviceRadius) : null }),
        ...(basePrice        !== undefined && { basePrice:  basePrice  ? parseFloat(basePrice)  : null }),
        ...(pricePerKm       !== undefined && { pricePerKm: pricePerKm ? parseFloat(pricePerKm) : null }),
        ...(hourlyRate       !== undefined && { hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null }),
        ...(minPrice         !== undefined && { minPrice:   minPrice   ? parseFloat(minPrice)   : null }),
        ...(currency         !== undefined && { currency }),
        ...(isAvailable      !== undefined && { isAvailable: Boolean(isAvailable) }),
      },
      select: SELECT,
    });

    res.json({ success: true, data: item });
  } catch (err) { next(err); }
}

// DELETE /api/mobile-workshops/my
async function deleteMy(req, res, next) {
  try {
    const vendor = await prisma.vendorProfile.findFirst({
      where: { userId: req.user.id, vendorType: 'MOBILE_WORKSHOP' },
      include: { mobileWorkshop: true },
    });
    if (!vendor?.mobileWorkshop) throw new AppError('No mobile workshop linked to your vendor account', 404, 'NOT_FOUND');

    const activeJobs = await prisma.booking.count({
      where: {
        mobileWorkshopId: vendor.mobileWorkshop.id,
        status: { in: ['CONFIRMED', 'TECHNICIAN_ASSIGNED', 'TECHNICIAN_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'] },
      },
    });
    if (activeJobs > 0) {
      throw new AppError('لا يمكن حذف الورشة وهي لديها مهام نشطة — أكمل المهام أولاً', 409, 'HAS_ACTIVE_JOBS');
    }

    await prisma.mobileWorkshop.delete({ where: { id: vendor.mobileWorkshop.id } });
    res.json({ success: true, message: 'Mobile workshop deleted successfully' });
  } catch (err) { next(err); }
}

// POST /api/mobile-workshops/my/upload-image
async function uploadMyImage(req, res, next) {
  try {
    const vendor = await prisma.vendorProfile.findFirst({
      where: { userId: req.user.id, vendorType: 'MOBILE_WORKSHOP' },
      include: { mobileWorkshop: true },
    });
    if (!vendor?.mobileWorkshop) throw new AppError('No mobile workshop linked to your vendor account', 404, 'NOT_FOUND');
    if (!req.file) return res.status(400).json({ success: false, error: 'No image uploaded' });
    const wid = vendor.mobileWorkshop.id;
    const type = (req.body?.type || 'logo').toLowerCase();
    const imageUrl = `/uploads/mobile-workshops/${wid}/${req.file.filename}`;
    const fullImageUrl = getFullUrl(imageUrl);
    const updateData = type === 'vehicle' ? { vehicleImageUrl: fullImageUrl } : { imageUrl: fullImageUrl };
    await prisma.mobileWorkshop.update({ where: { id: wid }, data: updateData });
    res.json({ success: true, imageUrl: fullImageUrl, field: type === 'vehicle' ? 'vehicleImageUrl' : 'imageUrl' });
  } catch (err) { next(err); }
}

// GET /api/mobile-workshops/:id
async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const item = await prisma.mobileWorkshop.findUnique({ where: { id }, select: SELECT });
    if (!item) throw new AppError('Mobile workshop not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
}

// POST /api/mobile-workshops
async function create(req, res, next) {
  try {
    const {
      name, nameAr, description,
      workshopTypeId,
      vehicleType, vehicleModel, year, plateNumber,
      servicesOffered,
      city, latitude, longitude, serviceRadius,
      basePrice, pricePerKm, hourlyRate, minPrice, currency,
      imageUrl, vehicleImageUrl,
      vendorId,
    } = req.body;

    if (!name) throw new AppError('name is required', 400, 'VALIDATION_ERROR');

    if (vendorId) {
      const vendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId } });
      if (!vendor) throw new AppError('Vendor not found', 404, 'NOT_FOUND');
      if (vendor.vendorType !== 'MOBILE_WORKSHOP') {
        throw new AppError('Vendor must be of type MOBILE_WORKSHOP', 400, 'INVALID_VENDOR_TYPE');
      }
      const existing = await prisma.mobileWorkshop.findFirst({ where: { vendorId } });
      if (existing) throw new AppError('This vendor already has a mobile workshop linked', 409, 'DUPLICATE');
    }

    const item = await prisma.mobileWorkshop.create({
      data: {
        name, nameAr: nameAr || null, description: description || null,
        workshopTypeId: workshopTypeId || null,
        vehicleType: vehicleType || null, vehicleModel: vehicleModel || null,
        year: year ? parseInt(year) : null,
        plateNumber: plateNumber || null,
        servicesOffered: servicesOffered || null,
        city: city || null,
        latitude:     latitude     ? parseFloat(latitude)     : null,
        longitude:    longitude    ? parseFloat(longitude)    : null,
        serviceRadius: serviceRadius ? parseFloat(serviceRadius) : null,
        basePrice:   basePrice   ? parseFloat(basePrice)   : null,
        pricePerKm:  pricePerKm  ? parseFloat(pricePerKm)  : null,
        hourlyRate:  hourlyRate  ? parseFloat(hourlyRate)  : null,
        minPrice:    minPrice    ? parseFloat(minPrice)    : null,
        currency:    currency    || 'SAR',
        imageUrl:        imageUrl        || null,
        vehicleImageUrl: vehicleImageUrl || null,
        vendorId: vendorId || null,
      },
      select: SELECT,
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
}

// PUT /api/mobile-workshops/:id
async function update(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.mobileWorkshop.findUnique({ where: { id } });
    if (!existing) throw new AppError('Mobile workshop not found', 404, 'NOT_FOUND');

    const {
      name, nameAr, description,
      workshopTypeId,
      vehicleType, vehicleModel, year, plateNumber,
      servicesOffered,
      city, latitude, longitude, serviceRadius,
      basePrice, pricePerKm, hourlyRate, minPrice, currency,
      imageUrl, vehicleImageUrl,
      isAvailable, isActive, isVerified,
      vendorId,
    } = req.body;

    const item = await prisma.mobileWorkshop.update({
      where: { id },
      data: {
        ...(name             !== undefined && { name }),
        ...(nameAr           !== undefined && { nameAr }),
        ...(description      !== undefined && { description }),
        ...(workshopTypeId   !== undefined && { workshopTypeId: workshopTypeId || null }),
        ...(vehicleType      !== undefined && { vehicleType }),
        ...(vehicleModel     !== undefined && { vehicleModel }),
        ...(year             !== undefined && { year: year ? parseInt(year) : null }),
        ...(plateNumber      !== undefined && { plateNumber }),
        ...(servicesOffered  !== undefined && { servicesOffered }),
        ...(city             !== undefined && { city }),
        ...(latitude         !== undefined && { latitude:     latitude     ? parseFloat(latitude)     : null }),
        ...(longitude        !== undefined && { longitude:    longitude    ? parseFloat(longitude)    : null }),
        ...(serviceRadius    !== undefined && { serviceRadius: serviceRadius ? parseFloat(serviceRadius) : null }),
        ...(basePrice        !== undefined && { basePrice:   basePrice   ? parseFloat(basePrice)   : null }),
        ...(pricePerKm       !== undefined && { pricePerKm:  pricePerKm  ? parseFloat(pricePerKm)  : null }),
        ...(hourlyRate       !== undefined && { hourlyRate:  hourlyRate  ? parseFloat(hourlyRate)  : null }),
        ...(minPrice         !== undefined && { minPrice:    minPrice    ? parseFloat(minPrice)    : null }),
        ...(currency         !== undefined && { currency }),
        ...(imageUrl         !== undefined && { imageUrl }),
        ...(vehicleImageUrl  !== undefined && { vehicleImageUrl }),
        ...(isAvailable      !== undefined && { isAvailable: Boolean(isAvailable) }),
        ...(isActive         !== undefined && { isActive:    Boolean(isActive) }),
        ...(isVerified       !== undefined && {
          isVerified: Boolean(isVerified),
          verifiedAt: isVerified ? new Date() : null,
        }),
        ...(vendorId !== undefined && { vendorId: vendorId || null }),
      },
      select: SELECT,
    });

    res.json({ success: true, data: item });
  } catch (err) { next(err); }
}

// DELETE /api/mobile-workshops/:id
async function remove(req, res, next) {
  try {
    const existing = await prisma.mobileWorkshop.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Mobile workshop not found', 404, 'NOT_FOUND');
    await prisma.mobileWorkshop.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
}

// ── Services CRUD ────────────────────────────────────────────────────────────

// POST /api/mobile-workshops/:id/services
async function addService(req, res, next) {
  try {
    const { id: mobileWorkshopId } = req.params;
    const { workshopTypeServiceId, serviceType, name, nameAr, description, price, currency, estimatedDuration } = req.body;

    if (!name) throw new AppError('name is required', 400, 'VALIDATION_ERROR');
    if (price == null || isNaN(parseFloat(price))) throw new AppError('price is required', 400, 'VALIDATION_ERROR');

    const ws = await prisma.mobileWorkshop.findUnique({ where: { id: mobileWorkshopId } });
    if (!ws) throw new AppError('Mobile workshop not found', 404, 'NOT_FOUND');

    const svc = await prisma.mobileWorkshopService.create({
      data: {
        mobileWorkshopId,
        workshopTypeServiceId: workshopTypeServiceId || null,
        serviceType: serviceType || 'GENERAL',
        name, nameAr: nameAr || null,
        description: description || null,
        price: parseFloat(price),
        currency: currency || 'SAR',
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null,
      },
    });

    res.status(201).json({ success: true, data: svc });
  } catch (err) { next(err); }
}

// PUT /api/mobile-workshops/:id/services/:svcId
async function updateService(req, res, next) {
  try {
    const { svcId } = req.params;
    const { workshopTypeServiceId, serviceType, name, nameAr, description, price, currency, estimatedDuration, isActive } = req.body;

    const existing = await prisma.mobileWorkshopService.findUnique({ where: { id: svcId } });
    if (!existing) throw new AppError('Service not found', 404, 'NOT_FOUND');

    const svc = await prisma.mobileWorkshopService.update({
      where: { id: svcId },
      data: {
        ...(workshopTypeServiceId !== undefined && { workshopTypeServiceId: workshopTypeServiceId || null }),
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

// DELETE /api/mobile-workshops/:id/services/:svcId
async function removeService(req, res, next) {
  try {
    const existing = await prisma.mobileWorkshopService.findUnique({ where: { id: req.params.svcId } });
    if (!existing) throw new AppError('Service not found', 404, 'NOT_FOUND');
    await prisma.mobileWorkshopService.delete({ where: { id: req.params.svcId } });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
}

module.exports = {
  getAll, getMy, getById, create, update, remove,
  addService, updateService, removeService,
  createMy, updateMy, deleteMy, uploadMyImage
};
