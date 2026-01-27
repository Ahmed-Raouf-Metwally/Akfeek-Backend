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
   * @param {Object} filters - Filter options
   * @returns {Array} List of services
   */
  async getAllServices(filters = {}) {
    const { category, type, search, isActive } = filters;

    const where = {
      ...(category && { category }),
      ...(type && { type }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
    };

    const searchTerm = typeof search === 'string' ? search.trim() : '';
    if (searchTerm) {
      where.OR = [{ name: { contains: searchTerm } }];
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
        parentAddOns: {
          include: {
            addOn: true
          }
        }
      }
    });

    if (!service) {
      throw new AppError('Service not found', 404, 'NOT_FOUND');
    }

    return service;
  }

  /**
   * Create new service (Admin only)
   * @param {Object} data - Service data
   * @returns {Object} Created service
   */
  async createService(data) {
    const { 
      name, nameAr, description, descriptionAr, 
      type, category, estimatedDuration, 
      imageUrl, icon, isActive, requiresVehicle,
      pricing 
    } = data;

    // Create service with nested pricing
    const service = await prisma.service.create({
      data: {
        name,
        nameAr,
        description,
        descriptionAr,
        type,
        category,
        estimatedDuration: estimatedDuration != null ? parseInt(estimatedDuration) : null,
        ...(imageUrl !== undefined && imageUrl !== '' && { imageUrl }),
        ...(icon !== undefined && icon !== '' && { icon }),
        ...(isActive !== undefined && { isActive: !!isActive }),
        ...(requiresVehicle !== undefined && { requiresVehicle: !!requiresVehicle }),
        pricing: {
          create: pricing ? pricing.map(p => ({
            vehicleType: p.vehicleType || p.vehicleSize,
            basePrice: parseFloat(p.basePrice),
            discountedPrice: p.discountedPrice ? parseFloat(p.discountedPrice) : null
          })) : []
        }
      },
      include: {
        pricing: true
      }
    });

    logger.info(`Service created: ${service.name}`);
    return service;
  }

  /**
   * Update service details
   * @param {string} id - Service ID
   * @param {Object} data - Updates
   * @returns {Object} Updated service
   */
  async updateService(id, data) {
    // Check existence
    await this.getServiceById(id);

    const { pricing, ...updates } = data;

    // Update main fields
    const service = await prisma.service.update({
      where: { id },
      data: {
        ...updates,
        ...(updates.estimatedDuration && { estimatedDuration: parseInt(updates.estimatedDuration) })
      }
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
   * Delete service (Admin only)
   * @param {string} id - Service ID
   */
  async deleteService(id) {
    await this.getServiceById(id);

    // Soft delete by setting isActive = false
    await prisma.service.update({
      where: { id },
      data: { isActive: false }
    });

    logger.info(`Service deactivated: ${id}`);
  }
}

module.exports = new ServiceCatalogService();
