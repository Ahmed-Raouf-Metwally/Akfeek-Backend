const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');
const logger = require('../utils/logger/logger');

/** Compute full plate number from parts (not stored in DB) */
function computePlateNumber(v) {
  const letters = ((v.plateLettersAr || v.plateLettersEn || '').toString()).trim();
  const digits = (v.plateDigits || '').toString().trim();
  const region = (v.plateRegion || '').toString().trim();
  const part = [letters, digits].filter(Boolean).join(' ');
  return region ? `${part} ${region}`.trim() : part;
}

/**
 * Vehicle Service
 * Handles vehicle management business logic
 */
class VehicleService {
  /**
   * Get all vehicles (admin) with pagination and optional filters
   * @param {Object} options - { page, limit, userId, userSearch, search }
   * @returns {Object} { data, pagination: { total, page, limit, totalPages } }
   */
  async getAllVehicles(options = {}) {
    const { page = 1, limit = 20, userId, userSearch, search } = options;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;
    const take = limitNum;

    const conditions = [];

    if (userId) {
      conditions.push({ userId });
    }

    if (userSearch && String(userSearch).trim()) {
      const term = String(userSearch).trim();
      conditions.push({
        user: {
          OR: [
            { email: { contains: term } },
            { profile: { firstName: { contains: term } } },
            { profile: { lastName: { contains: term } } },
          ],
        },
      });
    }

    if (search && String(search).trim()) {
      const term = String(search).trim();
      conditions.push({
        OR: [
          { plateLettersAr: { contains: term } },
          { plateLettersEn: { contains: term } },
          { plateDigits: { contains: term } },
          { plateRegion: { contains: term } },
          { color: { contains: term } },
          { user: { email: { contains: term } } },
          { user: { profile: { firstName: { contains: term } } } },
          { user: { profile: { lastName: { contains: term } } } },
          { vehicleModel: { name: { contains: term } } },
          { vehicleModel: { brand: { name: { contains: term } } } },
        ],
      });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const [rows, total] = await Promise.all([
      prisma.userVehicle.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
          vehicleModel: {
            select: {
              id: true,
              name: true,
              nameAr: true,
              year: true,
              type: true,
              brand: { select: { id: true, name: true, nameAr: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.userVehicle.count({ where }),
    ]);

    const data = rows.map((v) => ({ ...v, plateNumber: computePlateNumber(v) }));
    const totalPages = Math.max(1, Math.ceil(total / take));
    return {
      data,
      pagination: { total, page: pageNum, limit: take, totalPages },
    };
  }

  /**
   * Get all vehicles for a user
   * @param {string} userId - User ID
   * @returns {Array} List of user's vehicles
   */
  async getUserVehicles(userId) {
    const vehicles = await prisma.userVehicle.findMany({
      where: {
        userId
      },
      include: {
        vehicleModel: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            year: true,
            type: true,
            brand: {
              select: {
                id: true,
                name: true,
                nameAr: true
              }
            }
          }
        }
      },
      orderBy: { isDefault: 'desc' }
    });

    return vehicles.map((v) => ({ ...v, plateNumber: computePlateNumber(v) }));
  }

  /**
   * Get vehicle by ID
   * @param {string} vehicleId - Vehicle ID
   * @param {string|null} userId - User ID (for ownership verification); null = admin, any vehicle
   * @returns {Object} Vehicle details
   */
  async getVehicleById(vehicleId, userId) {
    const vehicle = await prisma.userVehicle.findFirst({
      where: {
        id: vehicleId,
        ...(userId != null && { userId }),
      },
      include: {
        vehicleModel: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            year: true,
            type: true,
            brand: {
              select: {
                id: true,
                name: true,
                nameAr: true
              }
            }
          }
        }
      }
    });

    if (!vehicle) {
      throw new AppError('Vehicle not found', 404, 'NOT_FOUND');
    }

    return { ...vehicle, plateNumber: computePlateNumber(vehicle) };
  }

  /**
   * Add new vehicle to user
   * @param {string} userId - User ID
   * @param {Object} vehicleData - Vehicle data
   * @returns {Object} Created vehicle
   */
  async addVehicle(userId, vehicleData) {
    const {
      vehicleModelId,
      plateLettersAr,
      plateLettersEn,
      plateDigits,
      plateRegion,
      plateNumber: _plateNumberIgnored,
      color,
      isDefault = false
    } = vehicleData;

    // Validate required fields
    if (!vehicleModelId) {
      throw new AppError('Vehicle model ID is required', 400, 'VALIDATION_ERROR');
    }

    // Validate plate: at least digits (plateNumber is computed, not stored)
    const digits = (plateDigits || '').toString().trim();
    if (!digits) {
      throw new AppError('Plate digits are required', 400, 'VALIDATION_ERROR');
    }

    // Check if vehicle model exists
    const model = await prisma.vehicleModel.findUnique({
      where: { id: vehicleModelId }
    });

    if (!model) {
      throw new AppError('Invalid vehicle model ID', 400, 'VALIDATION_ERROR');
    }

    // Duplicate check: same plate parts (plateNumber not stored)
    const ar = (plateLettersAr || '').toString().trim() || null;
    const en = (plateLettersEn || '').toString().trim() || null;
    const region = (plateRegion || '').toString().trim() || null;
    const existing = await prisma.userVehicle.findFirst({
      where: {
        plateDigits: digits,
        plateRegion: region,
        plateLettersAr: ar,
        plateLettersEn: en
      }
    });

    if (existing) {
      throw new AppError('Plate number already registered', 409, 'ALREADY_EXISTS');
    }

    // If this is default, unset other default vehicles
    if (isDefault) {
      await prisma.userVehicle.updateMany({
        where: {
          userId,
          isDefault: true
        },
        data: { isDefault: false }
      });
    }

    // Create vehicle (plateNumber is computed on read, not stored)
    const vehicle = await prisma.userVehicle.create({
      data: {
        userId,
        vehicleModelId,
        plateLettersAr: ar,
        plateLettersEn: en,
        plateDigits: digits,
        plateRegion: region,
        color,
        isDefault
      },
      include: {
        vehicleModel: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            year: true,
            type: true,
            brand: {
              select: {
                id: true,
                name: true,
                nameAr: true
              }
            }
          }
        }
      }
    });

    logger.info(`Vehicle added for user ${userId}: ${vehicle.id}`);

    return { ...vehicle, plateNumber: computePlateNumber(vehicle) };
  }

  /**
   * Update vehicle
   * @param {string} vehicleId - Vehicle ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated vehicle
   */
  async updateVehicle(vehicleId, userId, updateData) {
    const existing = await this.getVehicleById(vehicleId, userId);
    const ownerId = existing.userId;

    const { color, isDefault, plateLettersAr, plateLettersEn, plateDigits, plateRegion } = updateData;

    // Merge plate parts with existing (plateNumber is not stored, computed on read)
    const mergedLettersAr = plateLettersAr !== undefined ? plateLettersAr : (existing.plateLettersAr ?? '');
    const mergedLettersEn = plateLettersEn !== undefined ? plateLettersEn : (existing.plateLettersEn ?? '');
    const mergedDigits = plateDigits !== undefined ? plateDigits : (existing.plateDigits ?? '');
    const mergedRegion = plateRegion !== undefined ? plateRegion : (existing.plateRegion ?? '');

    const hasPlateChange = [plateLettersAr, plateLettersEn, plateDigits, plateRegion].some((v) => v !== undefined);
    if (hasPlateChange) {
      const ar = (mergedLettersAr || '').toString().trim() || null;
      const en = (mergedLettersEn || '').toString().trim() || null;
      const region = (mergedRegion || '').toString().trim() || null;
      const duplicate = await prisma.userVehicle.findFirst({
        where: {
          id: { not: vehicleId },
          plateDigits: (mergedDigits || '').toString().trim(),
          plateRegion: region,
          plateLettersAr: ar,
          plateLettersEn: en
        }
      });
      if (duplicate) {
        throw new AppError('Plate number already in use', 409, 'ALREADY_EXISTS');
      }
    }

    // If setting as default, unset other default vehicles for this owner
    if (isDefault && !existing.isDefault) {
      await prisma.userVehicle.updateMany({
        where: {
          userId: ownerId,
          isDefault: true
        },
        data: { isDefault: false }
      });
    }

    const updatePayload = {
      ...(color !== undefined && { color }),
      ...(isDefault !== undefined && { isDefault }),
      ...(plateLettersAr !== undefined && { plateLettersAr }),
      ...(plateLettersEn !== undefined && { plateLettersEn }),
      ...(plateDigits !== undefined && { plateDigits }),
      ...(plateRegion !== undefined && { plateRegion }),
    };

    const vehicle = await prisma.userVehicle.update({
      where: { id: vehicleId },
      data: updatePayload,
      include: {
        vehicleModel: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            year: true,
            type: true,
            brand: {
              select: {
                id: true,
                name: true,
                nameAr: true
              }
            }
          }
        }
      }
    });

    logger.info(`Vehicle updated: ${vehicleId}`);

    return { ...vehicle, plateNumber: computePlateNumber(vehicle) };
  }

  /**
   * Delete vehicle (soft delete)
   * @param {string} vehicleId - Vehicle ID
   * @param {string} userId - User ID
   */
  async deleteVehicle(vehicleId, userId) {
    await this.getVehicleById(vehicleId, userId);

    await prisma.userVehicle.delete({
      where: { id: vehicleId }
    });

    logger.info(`Vehicle deleted: ${vehicleId}`);
  }

  /**
   * Set vehicle as primary
   * @param {string} vehicleId - Vehicle ID
   * @param {string} userId - User ID
   */
  async setPrimaryVehicle(vehicleId, userId) {
    // Verify ownership
    await this.getVehicleById(vehicleId, userId);

    // Unset all default vehicles for user
    await prisma.userVehicle.updateMany({
      where: {
        userId,
        isDefault: true
      },
      data: { isDefault: false }
    });

    // Set this vehicle as default
    const vehicle = await prisma.userVehicle.update({
      where: { id: vehicleId },
      data: { isDefault: true },
      include: {
        vehicleModel: {
          include: {
            brand: true
          }
        }
      }
    });

    logger.info(`Default vehicle set: ${vehicleId} for user ${userId}`);

    return vehicle;
  }

  /**
   * Get all vehicle brands
   * @returns {Array} List of vehicle brands
   */
  async getVehicleBrands() {
    const brands = await prisma.vehicleBrand.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        logo: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return brands;
  }

  /**
   * Get vehicle models for a specific brand
   * @param {string} brandId - Brand ID
   * @param {Object} filters - Optional filters (year, size)
   * @returns {Array} List of vehicle models
   */
  async getVehicleModels(brandId, filters = {}) {
    const { year, type } = filters;

    const where = {
      brandId,
      isActive: true,
      ...(year && { year: parseInt(year) }),
      ...(type && { type })
    };

    const models = await prisma.vehicleModel.findMany({
      where,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            logo: true
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { name: 'asc' }
      ]
    });

    return models;
  }

  /**
   * Get vehicle masters (DEPRECATED - use getVehicleBrands/getVehicleModels instead)
   * @param {Object} filters - Filters (make, model, year, category)
   * @returns {Array} Vehicle masters list
   */
  async getVehicleMasters(filters = {}) {
    const { make, model, yearFrom, yearTo, size } = filters;

    const where = {
      ...(make && { make: { contains: make } }),
      ...(model && { model: { contains: model } }),
      ...(yearFrom && { year: { gte: parseInt(yearFrom) } }),
      ...(yearTo && { year: { lte: parseInt(yearTo) } }),
      ...(size && { size })
    };

    const masters = await prisma.vehicleMaster.findMany({
      where,
      orderBy: [
        { make: 'asc' },
        { model: 'asc' },
        { year: 'desc' }
      ],
      take: 100
    });

    return masters;
  }
}

module.exports = new VehicleService();
