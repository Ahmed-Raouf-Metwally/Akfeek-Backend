const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');
const logger = require('../utils/logger/logger');

/**
 * Service Catalog Management Service
 * Handles CRUD operations for services and pricing
 */
class ServiceCatalogService {
  /**
   * Get all services with optional filters
   * @param {Object} filters - Filter options (category, type, search, isActive, vendorId: 'me' for current vendor)
   * @param {Object} user - Requesting user (optional); if VENDOR and vendorId='me', filter by their vendorId
   * @returns {Array} List of services
   */
  async getAllServices(filters = {}, user = null) {
    const { category, type, search, isActive, vendorId } = filters;

    const where = {
      ...(category && { category }),
      ...(type && { type }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
    };

    if (vendorId === 'me' && user?.role === 'VENDOR') {
      const profile = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
      if (profile) where.vendorId = profile.id;
      else where.vendorId = 'none'; // no profile = no services
    } else if (vendorId && vendorId !== 'me') {
      where.vendorId = vendorId;
    }

    const searchTerm = typeof search === 'string' ? search.trim() : '';
    if (searchTerm) {
      where.OR = [{ name: { contains: searchTerm } }, { nameAr: { contains: searchTerm } }];
    }

    const services = await prisma.service.findMany({
      where,
      include: {
        pricing: {
          select: {
            vehicleType: true,
            basePrice: true,
            discountedPrice: true
          }
        },
        vendor: { select: { id: true, businessName: true, businessNameAr: true, logo: true } },
        parentAddOns: {
          include: {
            addOn: {
              select: {
                id: true,
                name: true,
                nameAr: true
              }
            }
          }
        }
      },
      orderBy: { category: 'asc' }
    });

    return services;
  }

  /**
   * Get service by ID
   * @param {string} id - Service ID
   * @returns {Object} Service details
   */
  async getServiceById(id) {
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        pricing: true,
        vendor: { select: { id: true, businessName: true, businessNameAr: true, logo: true, contactPhone: true, contactEmail: true } },
        parentAddOns: {
          include: {
            addOn: true
          }
        },
        parentService: { select: { id: true, name: true, nameAr: true, type: true } },
        subServices: { where: { isActive: true }, select: { id: true, name: true, nameAr: true, type: true, category: true, estimatedDuration: true, imageUrl: true } }
      }
    });

    if (!service) {
      throw new AppError('Service not found', 404, 'NOT_FOUND');
    }

    return service;
  }

  /**
   * Create new service (Admin or Vendor for COMPREHENSIVE_CARE)
   * @param {Object} data - Service data
   * @param {Object} user - Requesting user (optional)
   * @returns {Object} Created service
   */
  async createService(data, user = null) {
    const {
      name, nameAr, description, descriptionAr,
      type, category, estimatedDuration,
      imageUrl, icon, isActive, requiresVehicle,
      parentServiceId, vendorId: bodyVendorId,
      workingHours, slotDurationMinutes,
      pricing
    } = data;

    let vendorIdToSet = bodyVendorId || null;
    if (user?.role === 'VENDOR') {
      if (category !== 'COMPREHENSIVE_CARE') {
        throw new AppError('Vendors can only create Comprehensive Care services', 403, 'FORBIDDEN');
      }
      const profile = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
      if (!profile) throw new AppError('Vendor profile not found', 404, 'VENDOR_PROFILE_NOT_FOUND');
      vendorIdToSet = profile.id;
    }

    // Create service with nested pricing
    const service = await prisma.service.create({
      data: {
        name,
        nameAr,
        description,
        descriptionAr,
        type,
        category,
        ...(vendorIdToSet && { vendorId: vendorIdToSet }),
        estimatedDuration: estimatedDuration != null ? parseInt(estimatedDuration) : null,
        ...(imageUrl !== undefined && imageUrl !== '' && { imageUrl }),
        ...(icon !== undefined && icon !== '' && { icon }),
        ...(isActive !== undefined && { isActive: !!isActive }),
        ...(requiresVehicle !== undefined && { requiresVehicle: !!requiresVehicle }),
        ...(parentServiceId !== undefined && parentServiceId !== '' && parentServiceId !== null && { parentServiceId }),
        ...(workingHours !== undefined && { workingHours: Array.isArray(workingHours) ? workingHours : null }),
        ...(slotDurationMinutes !== undefined && slotDurationMinutes !== null && slotDurationMinutes !== '' && { slotDurationMinutes: parseInt(slotDurationMinutes) }),
        pricing: {
          create: pricing ? pricing.map(p => ({
            vehicleType: p.vehicleType || p.vehicleSize,
            basePrice: parseFloat(p.basePrice),
            discountedPrice: p.discountedPrice ? parseFloat(p.discountedPrice) : null
          })) : []
        }
      },
      include: {
        pricing: true,
        parentService: { select: { id: true, name: true, nameAr: true } }
      }
    });

    logger.info(`Service created: ${service.name}`);
    return service;
  }

  /**
   * Update service details (Admin or owning Vendor)
   * @param {string} id - Service ID
   * @param {Object} data - Updates
   * @param {Object} user - Requesting user (optional)
   * @returns {Object} Updated service
   */
  async updateService(id, data, user = null) {
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) throw new AppError('Service not found', 404, 'NOT_FOUND');

    if (user?.role === 'VENDOR') {
      const profile = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
      if (!profile || existing.vendorId !== profile.id) {
        throw new AppError('You can only update your own services', 403, 'FORBIDDEN');
      }
    }

    const { pricing, parentServiceId, vendorId: _ignoreVendorId, ...updates } = data;

    const updateData = {
      ...updates,
      ...(updates.estimatedDuration != null && updates.estimatedDuration !== '' && { estimatedDuration: parseInt(updates.estimatedDuration) }),
      ...(updates.workingHours !== undefined && { workingHours: Array.isArray(updates.workingHours) ? updates.workingHours : null }),
      ...(updates.slotDurationMinutes !== undefined && updates.slotDurationMinutes !== null && updates.slotDurationMinutes !== '' && { slotDurationMinutes: parseInt(updates.slotDurationMinutes) })
    };
    if (parentServiceId !== undefined) {
      updateData.parentServiceId = parentServiceId === '' || parentServiceId === null ? null : parentServiceId;
    }

    const service = await prisma.service.update({
      where: { id },
      data: updateData
    });

    // Update pricing if provided
    if (pricing && Array.isArray(pricing)) {
      // Delete existing pricing
      await prisma.servicePricing.deleteMany({
        where: { serviceId: id }
      });

      // Create new pricing
      await prisma.servicePricing.createMany({
        data: pricing.map(p => ({
          serviceId: id,
          vehicleType: p.vehicleType || p.vehicleSize,
          basePrice: parseFloat(p.basePrice),
          discountedPrice: p.discountedPrice ? parseFloat(p.discountedPrice) : null
        }))
      });
    }

    logger.info(`Service updated: ${id}`);

    return this.getServiceById(id);
  }

  /**
   * Delete/Deactivate service (Admin or owning Vendor)
   * @param {string} id - Service ID
   * @param {Object} user - Requesting user (optional)
   */
  async deleteService(id, user = null) {
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) throw new AppError('Service not found', 404, 'NOT_FOUND');

    if (user?.role === 'VENDOR') {
      const profile = await prisma.vendorProfile.findUnique({ where: { userId: user.id } });
      if (!profile || existing.vendorId !== profile.id) {
        throw new AppError('You can only delete your own services', 403, 'FORBIDDEN');
      }
    }

    // Soft delete by setting isActive = false
    await prisma.service.update({
      where: { id },
      data: { isActive: false }
    });

    logger.info(`Service deactivated: ${id}`);
  }

  /**
   * Get available time slots for a service on a given date (for Comprehensive Care).
   * Uses workingHours and slotDurationMinutes; excludes already booked times.
   * @param {string} serviceId
   * @param {string} dateStr - YYYY-MM-DD
   * @returns {string[]} e.g. ["09:00", "10:00", "11:00"]
   */
  async getAvailableSlots(serviceId, dateStr) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId, isActive: true },
      select: { workingHours: true, slotDurationMinutes: true }
    });
    if (!service) throw new AppError('Service not found', 404, 'NOT_FOUND');

    const date = new Date(dateStr + 'T12:00:00');
    if (Number.isNaN(date.getTime())) throw new AppError('Invalid date', 400, 'VALIDATION_ERROR');
    const dayOfWeek = date.getTime() ? date.getDay() : -1; // 0=Sun, 6=Sat

    const hours = Array.isArray(service.workingHours) ? service.workingHours : [];
    const dayRanges = hours.filter(h => h && Number(h.dayOfWeek) === dayOfWeek && h.start && h.end);
    if (dayRanges.length === 0) return [];

    const slotMins = service.slotDurationMinutes != null ? Number(service.slotDurationMinutes) : 60;

    const allSlots = new Set();
    for (const range of dayRanges) {
      const [startH, startM] = (range.start || '').split(':').map(Number);
      const [endH, endM] = (range.end || '').split(':').map(Number);
      let min = (startH || 0) * 60 + (startM || 0);
      const endMin = (endH || 0) * 60 + (endM || 0);
      while (min + slotMins <= endMin) {
        const h = Math.floor(min / 60);
        const m = min % 60;
        allSlots.add(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        min += slotMins;
      }
    }

    const dateStart = new Date(dateStr + 'T00:00:00');
    const dateEnd = new Date(dateStr + 'T23:59:59');
    const booked = await prisma.booking.findMany({
      where: {
        scheduledDate: { gte: dateStart, lte: dateEnd },
        status: { notIn: ['CANCELLED', 'REJECTED', 'NO_SHOW'] },
        services: { some: { serviceId } }
      },
      select: { scheduledTime: true }
    });
    const bookedSet = new Set((booked || []).map(b => b.scheduledTime).filter(Boolean));

    return Array.from(allSlots).sort().filter(slot => !bookedSet.has(slot));
  }
}

module.exports = new ServiceCatalogService();
