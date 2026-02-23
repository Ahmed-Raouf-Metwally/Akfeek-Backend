const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');
const logger = require('../utils/logger/logger');

/**
 * Technical Support Request Service (طلب دعم فني)
 * Customer submits request with vehicle & accident details; Admin assigns technician.
 */
class TechnicalSupportService {
  /**
   * Generate request number: TSR-YYYYMMDD-XXX
   */
  async _generateNumber() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.technicalSupportRequest.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }
    });
    const seq = String(count + 1).padStart(3, '0');
    return `TSR-${today}-${seq}`;
  }

  /**
   * Customer: create technical support request
   */
  async create(customerId, data) {
    const {
      vehicleSerialNumber,
      plateNumber,
      hasInsurance = false,
      insuranceCompany,
      deliveryAddress,
      repairAuthUrl,
      najmDocUrl,
      trafficReportUrl,
      accidentDamages,
      carImageUrls,
      notes
    } = data;

    if (!vehicleSerialNumber || !plateNumber || !deliveryAddress || !accidentDamages) {
      throw new AppError(
        'vehicleSerialNumber, plateNumber, deliveryAddress and accidentDamages are required',
        400,
        'VALIDATION_ERROR'
      );
    }

    const number = await this._generateNumber();
    const request = await prisma.technicalSupportRequest.create({
      data: {
        number,
        customerId,
        vehicleSerialNumber,
        plateNumber,
        hasInsurance: !!hasInsurance,
        insuranceCompany: hasInsurance ? insuranceCompany || null : null,
        deliveryAddress,
        repairAuthUrl: repairAuthUrl || null,
        najmDocUrl: najmDocUrl || null,
        trafficReportUrl: trafficReportUrl || null,
        accidentDamages,
        carImageUrls: carImageUrls && Array.isArray(carImageUrls) ? carImageUrls : null,
        notes: notes || null,
        status: 'PENDING'
      },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            phone: true,
            profile: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    logger.info(`Technical support request created: ${request.id} (${number}) by customer ${customerId}`);
    return request;
  }

  /**
   * Customer: get my requests (paginated)
   */
  async getMyRequests(customerId, { page = 1, limit = 10, status } = {}) {
    const skip = (page - 1) * limit;
    const where = { customerId };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.technicalSupportRequest.findMany({
        where,
        skip,
        take: Math.min(limit, 50),
        orderBy: { createdAt: 'desc' },
        include: {
          technician: {
            select: {
              id: true,
              email: true,
              phone: true,
              profile: { select: { firstName: true, lastName: true } }
            }
          }
        }
      }),
      prisma.technicalSupportRequest.count({ where })
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Get single request by id (customer: own only; admin: any)
   */
  async getById(id, userId, role) {
    const request = await prisma.technicalSupportRequest.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            phone: true,
            profile: { select: { firstName: true, lastName: true } }
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
        assignedBy: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    if (!request) throw new AppError('Technical support request not found', 404, 'NOT_FOUND');
    if (role !== 'ADMIN' && request.customerId !== userId) {
      throw new AppError('You do not have access to this request', 403, 'FORBIDDEN');
    }
    return request;
  }

  /**
   * Admin: list all requests (paginated, filter by status)
   */
  async adminList({ page = 1, limit = 20, status } = {}) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      prisma.technicalSupportRequest.findMany({
        where,
        skip,
        take: Math.min(limit, 100),
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              phone: true,
              profile: { select: { firstName: true, lastName: true } }
            }
          },
          technician: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } }
            }
          }
        }
      }),
      prisma.technicalSupportRequest.count({ where })
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Admin: assign technician to request
   */
  async assignTechnician(requestId, technicianId, adminId) {
    const request = await prisma.technicalSupportRequest.findUnique({
      where: { id: requestId }
    });
    if (!request) throw new AppError('Technical support request not found', 404, 'NOT_FOUND');
    if (request.status === 'COMPLETED' || request.status === 'CANCELLED') {
      throw new AppError('Cannot assign technician to a completed or cancelled request', 400, 'VALIDATION_ERROR');
    }

    const technician = await prisma.user.findUnique({
      where: { id: technicianId },
      select: { role: true }
    });
    if (!technician || technician.role !== 'TECHNICIAN') {
      throw new AppError('Selected user is not a technician', 400, 'VALIDATION_ERROR');
    }

    const updated = await prisma.technicalSupportRequest.update({
      where: { id: requestId },
      data: {
        technicianId,
        assignedById: adminId,
        assignedAt: new Date(),
        status: 'ASSIGNED'
      },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            phone: true,
            profile: { select: { firstName: true, lastName: true } }
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
        assignedBy: {
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    logger.info(`Technical support request ${requestId} assigned to technician ${technicianId} by admin ${adminId}`);
    return updated;
  }

  /**
   * Admin: update request status (optional; e.g. COMPLETED, CANCELLED)
   */
  async adminUpdateStatus(requestId, status, adminId, notes) {
    const allowed = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!allowed.includes(status)) {
      throw new AppError('Invalid status', 400, 'VALIDATION_ERROR');
    }

    const request = await prisma.technicalSupportRequest.findUnique({
      where: { id: requestId }
    });
    if (!request) throw new AppError('Technical support request not found', 404, 'NOT_FOUND');

    const updated = await prisma.technicalSupportRequest.update({
      where: { id: requestId },
      data: {
        status,
        ...(notes !== undefined && { notes })
      },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            phone: true,
            profile: { select: { firstName: true, lastName: true } }
          }
        },
        technician: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    logger.info(`Technical support request ${requestId} status updated to ${status} by admin ${adminId}`);
    return updated;
  }

  /**
   * List technicians (for admin assign dropdown/list)
   */
  async getTechnicians() {
    const users = await prisma.user.findMany({
      where: { role: 'TECHNICIAN', status: 'ACTIVE' },
      select: {
        id: true,
        email: true,
        phone: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    return users;
  }

  /**
   * Get tracking info for a technical support request (عميل يتابع الفني)
   */
  async getTrackingInfo(requestId, userId, role) {
    const request = await prisma.technicalSupportRequest.findUnique({
      where: { id: requestId },
      include: {
        customer: { select: { id: true } },
        technician: {
          select: {
            id: true,
            email: true,
            phone: true,
            profile: { select: { firstName: true, lastName: true, avatar: true } }
          }
        }
      }
    });
    if (!request) throw new AppError('Technical support request not found', 404, 'NOT_FOUND');
    if (role !== 'ADMIN' && request.customerId !== userId) {
      throw new AppError('You do not have access to this request', 403, 'FORBIDDEN');
    }
    if (!request.technicianId) {
      return {
        request: {
          id: request.id,
          number: request.number,
          status: request.status,
          deliveryAddress: request.deliveryAddress
        },
        technician: null,
        currentLocation: null
      };
    }

    const lastLocation = await prisma.technicianLocation.findFirst({
      where: {
        technicalSupportRequestId: requestId,
        status: { not: 'OFFLINE' }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      request: {
        id: request.id,
        number: request.number,
        status: request.status,
        deliveryAddress: request.deliveryAddress
      },
      technician: request.technician ? {
        id: request.technician.id,
        firstName: request.technician.profile?.firstName,
        lastName: request.technician.profile?.lastName,
        email: request.technician.email,
        phone: request.technician.phone,
        avatar: request.technician.profile?.avatar
      } : null,
      currentLocation: lastLocation ? {
        latitude: lastLocation.latitude,
        longitude: lastLocation.longitude,
        heading: lastLocation.heading,
        speed: lastLocation.speed,
        timestamp: lastLocation.updatedAt
      } : null
    };
  }
}

module.exports = new TechnicalSupportService();
