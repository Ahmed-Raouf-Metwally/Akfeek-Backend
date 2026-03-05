const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');
const winchTowingService = require('../../services/winchTowing.service');

const WINCH_SELECT = {
  id: true, name: true, nameAr: true, plateNumber: true,
  vehicleModel: true, year: true, capacity: true,
  description: true, imageUrl: true,
  city: true, latitude: true, longitude: true,
  isAvailable: true, isActive: true, isVerified: true, verifiedAt: true,
  basePrice: true, pricePerKm: true, minPrice: true, currency: true,
  totalTrips: true, averageRating: true, totalReviews: true,
  vendorId: true, createdAt: true, updatedAt: true,
  vendor: {
    select: {
      id: true, businessName: true, businessNameAr: true,
      logo: true, vendorType: true, status: true,
      user: { select: { id: true, email: true, phone: true } },
    },
  },
};

// GET /api/winches
async function getAllWinches(req, res, next) {
  try {
    const page      = Math.max(1, parseInt(req.query.page)  || 1);
    const limit     = Math.min(100, Math.max(1, parseInt(req.query.limit) || 12));
    const skip      = (page - 1) * limit;
    const search    = (req.query.search || '').trim();
    const available = req.query.available;
    const city      = req.query.city;

    const where = {
      ...(available !== undefined && { isAvailable: available === 'true' }),
      ...(city && { city: { contains: city } }),
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
      prisma.winch.findMany({ where, select: WINCH_SELECT, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.winch.count({ where }),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) { next(err); }
}

// GET /api/winches/:id
async function getWinchById(req, res, next) {
  try {
    const winch = await prisma.winch.findUnique({ where: { id: req.params.id }, select: WINCH_SELECT });
    if (!winch) throw new AppError('Winch not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: winch });
  } catch (err) { next(err); }
}

// POST /api/winches
async function createWinch(req, res, next) {
  try {
    const { name, nameAr, plateNumber, vehicleModel, year, capacity,
            description, imageUrl, city, latitude, longitude, vendorId } = req.body;

    if (!name || !plateNumber) {
      throw new AppError('name and plateNumber are required', 400, 'VALIDATION_ERROR');
    }

    // If linking a vendor, verify it's TOWING_SERVICE type
    if (vendorId) {
      const vendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId } });
      if (!vendor) throw new AppError('Vendor not found', 404, 'NOT_FOUND');
      if (vendor.vendorType !== 'TOWING_SERVICE') {
        throw new AppError('Vendor must be of type TOWING_SERVICE', 400, 'INVALID_VENDOR_TYPE');
      }
      const existing = await prisma.winch.findFirst({ where: { vendorId } });
      if (existing) throw new AppError('This vendor already has a winch linked', 409, 'DUPLICATE');
    }

    const { basePrice, pricePerKm, minPrice, currency } = req.body;
    const winch = await prisma.winch.create({
      data: {
        name, nameAr: nameAr || null, plateNumber,
        vehicleModel: vehicleModel || null,
        year: year ? parseInt(year) : null,
        capacity: capacity ? parseFloat(capacity) : null,
        description: description || null,
        imageUrl: imageUrl || null,
        city: city || null,
        latitude:  latitude  ? parseFloat(latitude)  : null,
        longitude: longitude ? parseFloat(longitude) : null,
        basePrice:  basePrice  ? parseFloat(basePrice)  : null,
        pricePerKm: pricePerKm ? parseFloat(pricePerKm) : null,
        minPrice:   minPrice   ? parseFloat(minPrice)   : null,
        currency:   currency   || 'SAR',
        vendorId: vendorId || null,
      },
      select: WINCH_SELECT,
    });

    res.status(201).json({ success: true, data: winch });
  } catch (err) { next(err); }
}

// PUT /api/winches/:id
async function updateWinch(req, res, next) {
  try {
    const { id } = req.params;
    const { name, nameAr, plateNumber, vehicleModel, year, capacity,
            description, imageUrl, city, latitude, longitude,
            isAvailable, isActive, isVerified, vendorId,
            basePrice, pricePerKm, minPrice, currency } = req.body;

    const existing = await prisma.winch.findUnique({ where: { id } });
    if (!existing) throw new AppError('Winch not found', 404, 'NOT_FOUND');

    const winch = await prisma.winch.update({
      where: { id },
      data: {
        ...(name         !== undefined && { name }),
        ...(nameAr       !== undefined && { nameAr }),
        ...(plateNumber  !== undefined && { plateNumber }),
        ...(vehicleModel !== undefined && { vehicleModel }),
        ...(year         !== undefined && { year: year ? parseInt(year) : null }),
        ...(capacity     !== undefined && { capacity: capacity ? parseFloat(capacity) : null }),
        ...(description  !== undefined && { description }),
        ...(imageUrl     !== undefined && { imageUrl }),
        ...(city         !== undefined && { city }),
        ...(latitude     !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
        ...(longitude    !== undefined && { longitude: longitude ? parseFloat(longitude) : null }),
        ...(isAvailable  !== undefined && { isAvailable: Boolean(isAvailable) }),
        ...(isActive     !== undefined && { isActive: Boolean(isActive) }),
        ...(isVerified   !== undefined && {
          isVerified: Boolean(isVerified),
          verifiedAt: isVerified ? new Date() : null,
        }),
        ...(vendorId   !== undefined && { vendorId: vendorId || null }),
        ...(basePrice  !== undefined && { basePrice:  basePrice  ? parseFloat(basePrice)  : null }),
        ...(pricePerKm !== undefined && { pricePerKm: pricePerKm ? parseFloat(pricePerKm) : null }),
        ...(minPrice   !== undefined && { minPrice:   minPrice   ? parseFloat(minPrice)   : null }),
        ...(currency   !== undefined && { currency:   currency   || 'SAR' }),
      },
      select: WINCH_SELECT,
    });

    res.json({ success: true, data: winch });
  } catch (err) { next(err); }
}

// DELETE /api/winches/:id
async function deleteWinch(req, res, next) {
  try {
    const existing = await prisma.winch.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Winch not found', 404, 'NOT_FOUND');
    await prisma.winch.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Winch deleted' });
  } catch (err) { next(err); }
}

// GET /api/winches/my/broadcasts — فيندور الوينش: طلبات السحب القريبة من ونشي
async function getMyBroadcasts(req, res, next) {
  try {
    const result = await winchTowingService.getActiveBroadcastsForWinch(req.user.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// POST /api/winches/my/broadcasts/:broadcastId/offer — الوينش يوافق: السعر يُحسب من pricePerKm
async function submitMyOffer(req, res, next) {
  try {
    const { broadcastId } = req.params;
    const result = await winchTowingService.submitWinchOffer(req.user.id, broadcastId, req.body || {});
    res.status(201).json({
      success: true,
      message: 'Offer submitted successfully',
      messageAr: 'تم إرسال العرض بنجاح — السعر حسب سعر الكم',
      data: result
    });
  } catch (err) { next(err); }
}

// GET /api/winches/my/jobs — فيندور الوينش فقط: المهام المحددة له (عبر عرض الوينش المُختار)
async function getMyJobs(req, res, next) {
  try {
    const vendorUserId = req.user.id;
    const result = await winchTowingService.getAssignedJobsForWinch(vendorUserId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// PATCH /api/winches/my/jobs/:jobId/status — فيندور الوينش: تحديث حالة المهمة (TECHNICIAN_EN_ROUTE → ARRIVED → IN_PROGRESS → COMPLETED)
async function updateMyJobStatus(req, res, next) {
  try {
    const vendorUserId = req.user.id;
    const { jobId } = req.params;
    const { status } = req.body || {};
    if (!status) throw new AppError('status is required', 400, 'VALIDATION_ERROR');
    const result = await winchTowingService.updateWinchJobStatus(vendorUserId, jobId, status);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

module.exports = {
  getAllWinches,
  getWinchById,
  createWinch,
  updateWinch,
  deleteWinch,
  getMyBroadcasts,
  submitMyOffer,
  getMyJobs,
  updateMyJobStatus
};
