const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');
const logger = require('../utils/logger/logger');

/**
 * Vehicle Service
 * Handles vehicle management business logic
 */
class VehicleService {
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
            size: true,
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

    return vehicles;
  }

  /**
   * Get vehicle by ID
   * @param {string} vehicleId - Vehicle ID
   * @param {string} userId - User ID (for ownership verification)
   * @returns {Object} Vehicle details
   */
  async getVehicleById(vehicleId, userId) {
    const vehicle = await prisma.userVehicle.findFirst({
      where: {
        id: vehicleId,
        userId
      },
      include: {
        vehicleModel: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            year: true,
            size: true,
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

    return vehicle;
  }

  /**
   * Add new vehicle to user
   * @param {string} userId - User ID
   * @param {Object} vehicleData - Vehicle data
   * @returns {Object} Created vehicle
   */
  async addVehicle(userId, vehicleData) {
    const { vehicleModelId, plateNumber, color, isDefault = false } = vehicleData;

    // Validate required fields
    if (!vehicleModelId || !plateNumber) {
      throw new AppError('Vehicle model ID and plate number are required', 400, 'VALIDATION_ERROR');
    }

    // Check if vehicle model exists
    const model = await prisma.vehicleModel.findUnique({
      where: { id: vehicleModelId }
    });

    if (!model) {
      throw new AppError('Invalid vehicle model ID', 400, 'VALIDATION_ERROR');
    }

    // Check for duplicate plate number
    const existing = await prisma.userVehicle.findFirst({
      where: {
        plateNumber
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

    // Create vehicle
    const vehicle = await prisma.userVehicle.create({
      data: {
        userId,
        vehicleModelId,
        plateNumber,
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
            size: true,
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

    return vehicle;
  }

  /**
   * Update vehicle
   * @param {string} vehicleId - Vehicle ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated vehicle
   */
  async updateVehicle(vehicleId, userId, updateData) {
    // Verify ownership
    const existing = await this.getVehicleById(vehicleId, userId);

    const { plateNumber, color, isDefault } = updateData;

    // If changing plate number, check for duplicates
    if (plateNumber && plateNumber !== existing.plateNumber) {
      const duplicate = await prisma.userVehicle.findFirst({
        where: {
          plateNumber,
          id: { not: vehicleId }
        }
      });

      if (duplicate) {
        throw new AppError('Plate number already in use', 409, 'ALREADY_EXISTS');
      }
    }

    // If setting as default, unset other default vehicles
    if (isDefault && !existing.isDefault) {
      await prisma.userVehicle.updateMany({
        where: {
          userId,
          isDefault: true
        },
        data: { isDefault: false }
      });
    }

    // Update vehicle
    const vehicle = await prisma.userVehicle.update({
      where: { id: vehicleId },
      data: {
        ...(plateNumber && { plateNumber }),
        ...(color && { color }),
        ...(isDefault !== undefined && { isDefault })
      },
      include: {
        vehicleModel: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            year: true,
            size: true,
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

    return vehicle;
  }

  /**
   * Delete vehicle (soft delete)
   * @param {string} vehicleId - Vehicle ID
   * @param {string} userId - User ID
   */
  async deleteVehicle(vehicleId, userId) {
    // Verify ownership
    await this.getVehicleById(vehicleId, userId);

    // Delete vehicle
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
    const { year, size } = filters;

    const where = {
      brandId,
      isActive: true,
      ...(year && { year: parseInt(year) }),
      ...(size && { size })
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
