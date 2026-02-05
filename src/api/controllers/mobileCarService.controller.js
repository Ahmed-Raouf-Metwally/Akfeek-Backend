const mobileCarService = require('../../services/mobileCarService.service');
const { success } = require('../../utils/response');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Mobile Car Service Controller (خدمة الزرَش / الصيانة المتنقلة)
 * Handles: parent service, sub-services, car compatibility, spare parts, booking, tracking status.
 */

/**
 * Get parent Mobile Car Service with sub-services
 * GET /api/mobile-car-service
 */
async function getParentService(req, res, next) {
  try {
    const data = await mobileCarService.getParentService();
    return success(res, data ?? {}, {
      message: 'Mobile car service retrieved',
      messageAr: 'تم استرجاع خدمة الصيانة المتنقلة'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get sub-services (optionally by parent ID)
 * GET /api/mobile-car-service/sub-services?parentId=
 */
async function getSubServices(req, res, next) {
  try {
    const { parentId } = req.query;
    const data = await mobileCarService.getSubServices(parentId || null);
    return success(res, data, {
      message: 'Sub-services retrieved',
      messageAr: 'تم استرجاع الخدمات الفرعية'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get compatible spare parts for a sub-service and car (vehicle model)
 * GET /api/mobile-car-service/compatible-parts?serviceId=&vehicleModelId=
 */
async function getCompatibleSpareParts(req, res, next) {
  try {
    const { serviceId, vehicleModelId } = req.query;
    if (!serviceId || !vehicleModelId) {
      throw new AppError('Missing serviceId or vehicleModelId', 400, 'VALIDATION_ERROR');
    }
    const data = await mobileCarService.getCompatibleSpareParts(serviceId, vehicleModelId);
    return success(res, data, {
      message: 'Compatible spare parts retrieved',
      messageAr: 'تم استرجاع قطع الغيار المتوافقة'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get recommended spare parts for a sub-service (optional vehicle filter)
 * GET /api/mobile-car-service/recommended-parts?serviceId=&vehicleModelId=
 */
async function getRecommendedSpareParts(req, res, next) {
  try {
    const { serviceId, vehicleModelId } = req.query;
    if (!serviceId) {
      throw new AppError('Missing serviceId', 400, 'VALIDATION_ERROR');
    }
    const data = await mobileCarService.getRecommendedSpareParts(serviceId, vehicleModelId || null);
    return success(res, data, {
      message: 'Recommended spare parts retrieved',
      messageAr: 'تم استرجاع قطع الغيار الموصى بها'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create Mobile Car Service booking
 * POST /api/mobile-car-service/bookings
 * Body: { subServiceId, vehicleId, spareParts?, location: { latitude, longitude, address? }, scheduledDate?, scheduledTime?, notes? }
 */
async function createBooking(req, res, next) {
  try {
    const customerId = req.user?.id;
    if (!customerId) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }
    const data = await mobileCarService.createBooking(customerId, req.body);
    return success(res, data, {
      message: 'Mobile car service booking created',
      messageAr: 'تم إنشاء حجز الصيانة المتنقلة',
      statusCode: 201
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get mobile car service booking by ID
 * GET /api/mobile-car-service/bookings/:id
 */
async function getBookingById(req, res, next) {
  try {
    const { id } = req.params;
    const customerId = req.user?.role === 'ADMIN' ? null : req.user?.id;
    const data = await mobileCarService.getBookingById(id, customerId);
    return success(res, data, {
      message: 'Booking retrieved',
      messageAr: 'تم استرجاع الحجز'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update mobile booking status (Assigned, On the way, Arrived, In service, Completed)
 * PATCH /api/mobile-car-service/bookings/:id/status
 * Body: { status: TECHNICIAN_ASSIGNED | TECHNICIAN_EN_ROUTE | ON_THE_WAY | ARRIVED | IN_SERVICE | IN_PROGRESS | COMPLETED }
 */
async function updateBookingStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const changedBy = req.user?.id || null;
    if (!status) {
      throw new AppError('Missing status', 400, 'VALIDATION_ERROR');
    }
    const data = await mobileCarService.updateBookingStatus(id, status, changedBy);
    return success(res, data, {
      message: 'Booking status updated',
      messageAr: 'تم تحديث حالة الحجز'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Link spare part to (sub-)service (Admin)
 * POST /api/mobile-car-service/admin/parts/:autoPartId/services
 * Body: { serviceId, isRecommended?, sortOrder? }
 */
async function linkPartToService(req, res, next) {
  try {
    const { autoPartId } = req.params;
    const { serviceId, isRecommended, sortOrder } = req.body;
    if (!serviceId) throw new AppError('Missing serviceId', 400, 'VALIDATION_ERROR');
    const data = await mobileCarService.linkPartToService(autoPartId, serviceId, {
      isRecommended,
      sortOrder
    });
    return success(res, data, {
      message: 'Part linked to service',
      messageAr: 'تم ربط القطعة بالخدمة',
      statusCode: 201
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add/update vendor supply for spare part (Admin)
 * POST /api/mobile-car-service/admin/parts/:autoPartId/vendors
 * Body: { vendorId, unitPrice, stockQuantity?, isAvailable?, leadTimeDays? }
 */
async function setPartVendorSupply(req, res, next) {
  try {
    const { autoPartId } = req.params;
    const { vendorId, unitPrice, stockQuantity, isAvailable, leadTimeDays } = req.body;
    if (!vendorId || unitPrice == null) throw new AppError('Missing vendorId or unitPrice', 400, 'VALIDATION_ERROR');
    const data = await mobileCarService.setPartVendorSupply(autoPartId, vendorId, {
      unitPrice,
      stockQuantity,
      isAvailable,
      leadTimeDays
    });
    return success(res, data, {
      message: 'Vendor supply updated',
      messageAr: 'تم تحديث توريد المورد'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getParentService,
  getSubServices,
  getCompatibleSpareParts,
  getRecommendedSpareParts,
  createBooking,
  getBookingById,
  updateBookingStatus,
  linkPartToService,
  setPartVendorSupply
};
