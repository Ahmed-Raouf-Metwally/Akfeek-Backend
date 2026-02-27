const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');
const logger = require('../utils/logger/logger');

/**
 * Auto Part Category Service
 * Handles CRUD operations for auto part categories
 */
class AutoPartCategoryService {
  /**
   * Get all categories with optional filters
   * @param {Object} filters - Filter options
   * @returns {Array} List of categories
   */
  async getAllCategories(filters = {}) {
    const { isActive, vehicleType } = filters;
    let vehicleTypeQuery = undefined;
    if (vehicleType) {
      if (vehicleType === 'CAR') {
        vehicleTypeQuery = { in: ['SEDAN', 'HATCHBACK', 'COUPE', 'SMALL_SUV', 'LARGE_SEDAN', 'SUV', 'CROSSOVER', 'TRUCK'] };
      } else {
        vehicleTypeQuery = vehicleType;
      }
    }

    const where = {
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(vehicleTypeQuery && { vehicleType: vehicleTypeQuery }),
    };

    const categories = await prisma.autoPartCategory.findMany({
      where,
      include: {
        _count: {
          select: {
            parts: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return categories;
  }

  /**
   * Get category by ID
   * @param {string} id - Category ID
   * @returns {Object} Category details
   */
  async getCategoryById(id) {
    const category = await prisma.autoPartCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            parts: true,
          },
        },
      },
    });

    if (!category) {
      throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }

    return category;
  }

  /**
   * Get category tree (Now just returns filtered list as categories are flat)
   * @param {Object} filters
   * @returns {Array} List of categories
   */
  async getCategoryTree(filters = {}) {
    const { vehicleType } = filters;
    let vehicleTypeQuery = undefined;
    if (vehicleType) {
      if (vehicleType === 'CAR') {
        vehicleTypeQuery = { in: ['SEDAN', 'HATCHBACK', 'COUPE', 'SMALL_SUV', 'LARGE_SEDAN', 'SUV', 'CROSSOVER', 'TRUCK'] };
      } else {
        vehicleTypeQuery = vehicleType;
      }
    }

    const categories = await prisma.autoPartCategory.findMany({
      where: {
        isActive: true,
        ...(vehicleTypeQuery && { vehicleType: vehicleTypeQuery }),
      },
      include: {
        _count: {
          select: {
            parts: true,
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return categories;
  }

  /**
   * Create new category
   * @param {Object} data - Category data
   * @returns {Object} Created category
   */
  async createCategory(data) {
    const {
      name,
      nameAr,
      description,
      descriptionAr,
      icon,
      imageUrl,
      vehicleType,
      isActive,
      sortOrder,
    } = data;

    const category = await prisma.autoPartCategory.create({
      data: {
        name,
        nameAr,
        description,
        descriptionAr,
        icon,
        imageUrl,
        vehicleType: vehicleType || 'SEDAN',
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
      }
    });

    logger.info(`Auto part category created: ${category.name}`);
    return category;
  }

  /**
   * Update category
   * @param {string} id - Category ID
   * @param {Object} data - Updates
   * @returns {Object} Updated category
   */
  async updateCategory(id, data) {
    await this.getCategoryById(id);

    const {
      name,
      nameAr,
      description,
      descriptionAr,
      icon,
      imageUrl,
      vehicleType,
      isActive,
      sortOrder,
    } = data;

    const category = await prisma.autoPartCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(nameAr !== undefined && { nameAr }),
        ...(description !== undefined && { description }),
        ...(descriptionAr !== undefined && { descriptionAr }),
        ...(icon !== undefined && { icon }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(vehicleType !== undefined && { vehicleType }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder) }),
      }
    });

    logger.info(`Auto part category updated: ${id}`);
    return category;
  }

  /**
   * Delete category (soft delete - set isActive to false)
   * @param {string} id - Category ID
   */
  async deleteCategory(id) {
    const category = await this.getCategoryById(id);

    // Check if category has parts
    if (category._count.parts > 0) {
      throw new AppError(
        'Cannot delete category with associated parts',
        400,
        'HAS_PARTS'
      );
    }

    await prisma.autoPartCategory.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info(`Auto part category deleted (soft): ${id}`);
  }
}

module.exports = new AutoPartCategoryService();
