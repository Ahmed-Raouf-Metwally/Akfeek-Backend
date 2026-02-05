const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');
const logger = require('../utils/logger/logger');

/**
 * Mobile Car Service (خدمة الزرَش / الصيانة المتنقلة)
 * Parent service with sub-services, car compatibility, spare parts, and vendor relations.
 * Extensible and backward-compatible with existing booking/tracking.
 */
class MobileCarService {
  /**
   * Get the parent Mobile Car Service (type = MOBILE_CAR_SERVICE, parentServiceId = null)
   * @returns {Object|null} Parent service or null
   */
  async getParentService() {
    const parent = await prisma.service.findFirst({
      where: {
        type: 'MOBILE_CAR_SERVICE',
        parentServiceId: null,
        isActive: true
      },
      include: {
        subServices: {
          where: { isActive: true },
          include: {
            pricing: true
          },
          orderBy: { name: 'asc' }
        }
      }
    });
    return parent;
  }

  /**
   * Get sub-services for the Mobile Car Service (by parent id or first parent)
   * @param {string} [parentServiceId] - Parent service ID (optional)
   * @returns {Array} Sub-services
   */
  async getSubServices(parentServiceId = null) {
    let parentId = parentServiceId;
    if (!parentId) {
      const parent = await this.getParentService();
      if (!parent) return [];
      parentId = parent.id;
    }
    const subServices = await prisma.service.findMany({
      where: {
        parentServiceId: parentId,
        isActive: true
      },
      include: {
        pricing: true,
        autoPartServices: {
          include: {
            autoPart: {
              select: {
                id: true,
                name: true,
                nameAr: true,
                sku: true,
                price: true,
                brand: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    return subServices;
  }

  /**
   * Get spare parts compatible with a sub-service AND car (brand/model)
   * Filter: service link + vehicle model compatibility
   * @param {string} serviceId - Sub-service ID
   * @param {string} vehicleModelId - Vehicle model ID (brand/model/year)
   * @returns {Array} Compatible spare parts with vendor options
   */
  async getCompatibleSpareParts(serviceId, vehicleModelId) {
    const parts = await prisma.autoPart.findMany({
      where: {
        isActive: true,
        isApproved: true,
        autoPartServices: {
          some: { serviceId }
        },
        compatibility: {
          some: { vehicleModelId }
        }
      },
      include: {
        autoPartServices: {
          where: { serviceId },
          take: 1
        },
        autoPartVendors: {
          where: { isAvailable: true },
          include: {
            vendor: {
              select: {
                id: true,
                businessName: true,
                businessNameAr: true,
                city: true,
                status: true
              }
            }
          }
        },
        category: {
          select: { id: true, name: true, nameAr: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    return parts;
  }

  /**
   * Get recommended spare parts for a sub-service (optional vehicle filter)
   * @param {string} serviceId - Sub-service ID
   * @param {string} [vehicleModelId] - Optional vehicle model for compatibility filter
   * @returns {Array} Recommended parts
   */
  async getRecommendedSpareParts(serviceId, vehicleModelId = null) {
    const where = {
      isActive: true,
      isApproved: true,
      autoPartServices: {
        some: {
          serviceId,
          isRecommended: true
        }
      }
    };
    if (vehicleModelId) {
      where.compatibility = {
        some: { vehicleModelId }
      };
    }
    const parts = await prisma.autoPart.findMany({
      where,
      include: {
        autoPartVendors: {
          where: { isAvailable: true },
          include: {
            vendor: {
              select: {
                id: true,
                businessName: true,
                businessNameAr: true
              }
            }
          }
        }
      }
    });
    return parts;
  }

  /**
   * Create a Mobile Car Service booking
   * User selects: sub-service, car (vehicleId), optional spare parts, location
   * @param {string} customerId - Customer user ID
   * @param {Object} payload - { subServiceId, vehicleId, spareParts: [{ autoPartId, quantity, vendorId? }], location: { latitude, longitude, address }, scheduledDate?, scheduledTime?, notes? }
   * @returns {Object} Created booking with services and spare parts
   */
  async createBooking(customerId, payload) {
    const {
      subServiceId,
      vehicleId,
      spareParts = [],
      location,
      scheduledDate,
      scheduledTime,
      notes
    } = payload;

    if (!subServiceId || !vehicleId || !location?.latitude || !location?.longitude) {
      throw new AppError('Missing required fields: subServiceId, vehicleId, location (latitude, longitude)', 400, 'VALIDATION_ERROR');
    }

    const [subService, vehicle] = await Promise.all([
      prisma.service.findFirst({
        where: {
          id: subServiceId,
          type: 'MOBILE_CAR_SERVICE',
          parentServiceId: { not: null },
          isActive: true
        },
        include: { pricing: true }
      }),
      prisma.userVehicle.findFirst({
        where: { id: vehicleId, userId: customerId },
        include: {
          vehicleModel: {
            include: { brand: true }
          }
        }
      })
    ]);

    if (!subService) {
      throw new AppError('Sub-service not found or not a mobile car sub-service', 404, 'NOT_FOUND');
    }
    if (!vehicle) {
      throw new AppError('Vehicle not found or not owned by customer', 404, 'NOT_FOUND');
    }

    const vehicleModelId = vehicle.vehicleModel?.id;
    if (!vehicleModelId) {
      throw new AppError('Vehicle model is required for mobile car service', 400, 'VALIDATION_ERROR');
    }

    // Validate spare parts: each must be linked to this sub-service AND compatible with this car (brand/model)
    if (Array.isArray(spareParts) && spareParts.length > 0) {
      for (const item of spareParts) {
        const { autoPartId } = item;
        const partLink = await prisma.autoPartService.findUnique({
          where: { autoPartId_serviceId: { autoPartId, serviceId: subServiceId } }
        });
        const compat = await prisma.autoPartCompatibility.findUnique({
          where: { partId_vehicleModelId: { partId: autoPartId, vehicleModelId } }
        });
        if (!partLink) {
          throw new AppError(`Spare part ${autoPartId} is not linked to this sub-service. Use compatible-parts API for this service and car.`, 400, 'INVALID_SPARE_PART_SERVICE');
        }
        if (!compat) {
          throw new AppError(`Spare part ${autoPartId} is not compatible with the selected car (brand/model). Use compatible-parts API.`, 400, 'INVALID_SPARE_PART_CAR');
        }
      }
    }

    let subtotal = 0;
    let partsTotal = 0;
    const vehicleType = vehicle.vehicleModel?.type || 'SEDAN';
    const servicePricing = subService.pricing?.find(p => p.vehicleType === vehicleType) || subService.pricing?.[0];
    if (servicePricing) {
      subtotal = Number(servicePricing.discountedPrice ?? servicePricing.basePrice);
    }

    const bookingNumber = `MCS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        customerId,
        vehicleId,
        status: 'PENDING',
        pickupLat: location.latitude,
        pickupLng: location.longitude,
        pickupAddress: location.address || null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        scheduledTime: scheduledTime || null,
        subtotal,
        laborFee: 0,
        deliveryFee: 0,
        partsTotal: 0,
        discount: 0,
        tax: 0,
        totalPrice: subtotal,
        notes,
        metadata: {
          source: 'MOBILE_CAR_SERVICE',
          subServiceId,
          subServiceName: subService.name,
          subServiceNameAr: subService.nameAr
        }
      }
    });

    await prisma.bookingService.create({
      data: {
        bookingId: booking.id,
        serviceId: subServiceId,
        quantity: 1,
        unitPrice: subtotal,
        totalPrice: subtotal
      }
    });

    if (Array.isArray(spareParts) && spareParts.length > 0) {
      for (const item of spareParts) {
        const { autoPartId, quantity = 1, vendorId } = item;
        const part = await prisma.autoPart.findFirst({
          where: { id: autoPartId, isActive: true },
          include: {
            autoPartVendors: {
              where: vendorId ? { vendorId, isAvailable: true } : { isAvailable: true },
              take: 1,
              orderBy: { unitPrice: 'asc' }
            }
          }
        });
        if (!part) continue;
        let unitPrice = Number(part.price);
        const vendorLink = part.autoPartVendors?.[0];
        if (vendorLink) {
          unitPrice = Number(vendorLink.unitPrice);
        }
        const totalPrice = unitPrice * quantity;
        partsTotal += totalPrice;
        await prisma.bookingAutoPart.create({
          data: {
            bookingId: booking.id,
            autoPartId,
            vendorId: vendorId || vendorLink?.vendorId || null,
            quantity,
            unitPrice,
            totalPrice
          }
        });
      }
      const newTotal = Number(booking.totalPrice) + partsTotal;
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          partsTotal,
          totalPrice: newTotal
        }
      });
    }

    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: 'PENDING',
        toStatus: 'PENDING',
        changedBy: customerId,
        reason: 'Mobile car service booking created'
      }
    });

    const created = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        vehicle: {
          include: {
            vehicleModel: {
              include: { brand: true }
            }
          }
        },
        services: {
          include: {
            service: {
              select: { id: true, name: true, nameAr: true }
            }
          }
        },
        bookingAutoParts: {
          include: {
            autoPart: {
              select: { id: true, name: true, nameAr: true, sku: true }
            },
            vendor: {
              select: { id: true, businessName: true, businessNameAr: true }
            }
          }
        }
      }
    });

    logger.info('Mobile car service booking created', {
      bookingId: created.id,
      bookingNumber: created.bookingNumber,
      customerId,
      subServiceId
    });

    return created;
  }

  /**
   * Update mobile booking status (Assigned, On the way, Arrived, In service, Completed)
   * Integrates with existing BookingStatus and status history.
   * @param {string} bookingId - Booking ID
   * @param {string} status - One of TECHNICIAN_ASSIGNED, TECHNICIAN_EN_ROUTE, ON_THE_WAY, ARRIVED, IN_SERVICE, IN_PROGRESS, COMPLETED
   * @param {string} [changedBy] - User ID who changed the status
   * @returns {Object} Updated booking
   */
  async updateBookingStatus(bookingId, status, changedBy = null) {
    const allowed = [
      'PENDING', 'CONFIRMED', 'TECHNICIAN_ASSIGNED', 'TECHNICIAN_EN_ROUTE',
      'ON_THE_WAY', 'ARRIVED', 'IN_SERVICE', 'IN_PROGRESS', 'COMPLETED',
      'CANCELLED', 'REJECTED'
    ];
    if (!allowed.includes(status)) {
      throw new AppError(`Invalid status for mobile car service: ${status}`, 400, 'VALIDATION_ERROR');
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, metadata: true }
    });
    if (!booking) {
      throw new AppError('Booking not found', 404, 'NOT_FOUND');
    }
    const isMobileCar = booking.metadata && typeof booking.metadata === 'object' && booking.metadata.source === 'MOBILE_CAR_SERVICE';
    if (!isMobileCar) {
      throw new AppError('Booking is not a mobile car service booking', 400, 'INVALID_BOOKING_TYPE');
    }

    const previousStatus = booking.status;
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status }
    });
    await prisma.bookingStatusHistory.create({
      data: {
        bookingId,
        fromStatus: previousStatus,
        toStatus: status,
        changedBy,
        reason: `Status updated to ${status}`
      }
    });

    const updated = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        statusHistory: {
          orderBy: { timestamp: 'desc' },
          take: 5
        }
      }
    });

    logger.info('Mobile car booking status updated', { bookingId, from: previousStatus, to: status });
    return updated;
  }

  /**
   * Link a spare part to a (sub-)service (Admin)
   * @param {string} autoPartId - Auto part ID
   * @param {string} serviceId - Service ID (sub-service)
   * @param {Object} options - { isRecommended, sortOrder }
   * @returns {Object} Created AutoPartService
   */
  async linkPartToService(autoPartId, serviceId, options = {}) {
    const part = await prisma.autoPart.findUnique({ where: { id: autoPartId } });
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!part) throw new AppError('Auto part not found', 404, 'NOT_FOUND');
    if (!service) throw new AppError('Service not found', 404, 'NOT_FOUND');
    const existing = await prisma.autoPartService.findUnique({
      where: { autoPartId_serviceId: { autoPartId, serviceId } }
    });
    if (existing) return existing;
    return prisma.autoPartService.create({
      data: {
        autoPartId,
        serviceId,
        isRecommended: options.isRecommended ?? false,
        sortOrder: options.sortOrder ?? 0
      }
    });
  }

  /**
   * Add or update vendor supply for a spare part (Admin)
   * @param {string} autoPartId - Auto part ID
   * @param {string} vendorId - VendorProfile ID
   * @param {Object} data - { unitPrice, stockQuantity?, isAvailable?, leadTimeDays? }
   * @returns {Object} Created or updated AutoPartVendor
   */
  async setPartVendorSupply(autoPartId, vendorId, data) {
    const part = await prisma.autoPart.findUnique({ where: { id: autoPartId } });
    const vendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId } });
    if (!part) throw new AppError('Auto part not found', 404, 'NOT_FOUND');
    if (!vendor) throw new AppError('Vendor not found', 404, 'NOT_FOUND');
    const payload = {
      unitPrice: data.unitPrice,
      stockQuantity: data.stockQuantity ?? 0,
      isAvailable: data.isAvailable ?? true,
      leadTimeDays: data.leadTimeDays ?? null
    };
    return prisma.autoPartVendor.upsert({
      where: { autoPartId_vendorId: { autoPartId, vendorId } },
      create: { autoPartId, vendorId, ...payload },
      update: payload
    });
  }

  /**
   * Get mobile car service booking by ID (with full details)
   * @param {string} bookingId - Booking ID
   * @param {string} [customerId] - Optional customer ID for ownership check
   * @returns {Object} Booking with vehicle, services, spare parts
   */
  async getBookingById(bookingId, customerId = null) {
    const where = { id: bookingId };
    if (customerId) {
      where.customerId = customerId;
    }
    const booking = await prisma.booking.findFirst({
      where,
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            phone: true,
            profile: { select: { firstName: true, lastName: true } }
          }
        },
        vehicle: {
          include: {
            vehicleModel: {
              include: { brand: true }
            }
          }
        },
        technician: {
          select: {
            id: true,
            email: true,
            phone: true,
            profile: { select: { firstName: true, lastName: true } }
          }
        },
        services: {
          include: {
            service: {
              select: { id: true, name: true, nameAr: true, customAttributes: true }
            }
          }
        },
        bookingAutoParts: {
          include: {
            autoPart: {
              select: { id: true, name: true, nameAr: true, sku: true }
            },
            vendor: {
              select: { id: true, businessName: true, businessNameAr: true }
            }
          }
        },
        statusHistory: {
          orderBy: { timestamp: 'desc' },
          take: 20
        }
      }
    });
    if (!booking) {
      throw new AppError('Booking not found', 404, 'NOT_FOUND');
    }
    return booking;
  }
}

module.exports = new MobileCarService();
