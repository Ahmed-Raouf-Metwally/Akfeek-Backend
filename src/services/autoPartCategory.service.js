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
    const { isActive, parentId } = filters;

    const where = {
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(parentId !== undefined && { parentId: parentId === 'null' ? null : parentId }),
    };

    const categories = await prisma.autoPartCategory.findMany({
      where,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            nameAr: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            isActive: true,
          },
        },
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
        parent: true,
        children: true,
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
   * Get category tree (hierarchical structure).
   * @param {Object} options - Optional filter
   * @param {string} [options.vehicleType] - 'CAR' | 'MOTORCYCLE' — يعيد فقط الشجرة تحت الفئة الجذرية لهذا النوع
   * @returns {Array} Category tree (roots with children; each root has id for parentId)
   */
  async getCategoryTree(options = {}) {
    const { vehicleType } = options;

    const where = { isActive: true };
    // الفئات الجذرية فقط (بدون parent)
    const rootWhere = { ...where, parentId: null };
    if (vehicleType && ['CAR', 'MOTORCYCLE'].includes(vehicleType.toUpperCase())) {
      rootWhere.rootType = vehicleType.toUpperCase();
    }

    const roots = await prisma.autoPartCategory.findMany({
      where: rootWhere,
      include: {
        children: {
          where: { isActive: true },
          include: {
            children: {
              where: { isActive: true },
              include: {
                _count: { select: { parts: true } },
              },
            },
            _count: { select: { parts: true } },
          },
        },
        _count: { select: { parts: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return roots;
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
      parentId,
      rootType,
      isActive,
      sortOrder,
    } = data;

    // الفئة الجذرية: إما parentId فارغ وrootType CAR/MOTORCYCLE، وإما parentId معرّف للفئة الأب
    const isRoot = !parentId || parentId === 'null' || parentId === '';
    const finalRootType = isRoot && rootType && ['CAR', 'MOTORCYCLE'].includes(rootType.toUpperCase())
      ? rootType.toUpperCase()
      : null;

    if (parentId && !isRoot) {
      await this.getCategoryById(parentId);
    }

    const category = await prisma.autoPartCategory.create({
      data: {
        name,
        nameAr,
        description,
        descriptionAr,
        icon,
        imageUrl,
        parentId: parentId || null,
        rootType: finalRootType,
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
      },
      include: {
        parent: true,
      },
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
    const existing = await this.getCategoryById(id);

    const {
      name,
      nameAr,
      description,
      descriptionAr,
      icon,
      imageUrl,
      parentId,
      rootType,
      isActive,
      sortOrder,
    } = data;

    // Prevent circular parent reference
    if (parentId === id) {
      throw new AppError(
        'Category cannot be its own parent',
        400,
        'INVALID_PARENT'
      );
    }

    // Validate parent if changing
    if (parentId && parentId !== 'null') {
      await this.getCategoryById(parentId);
    }

    const willBeRoot = parentId !== undefined
      ? (parentId === 'null' || parentId === '' || !parentId)
      : !existing.parentId;
    const rootTypeValue = rootType !== undefined && ['CAR', 'MOTORCYCLE'].includes(String(rootType).toUpperCase())
      ? String(rootType).toUpperCase()
      : null;
    const updateRootType = rootType !== undefined
      ? (willBeRoot ? rootTypeValue : null)
      : undefined;

    const category = await prisma.autoPartCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(nameAr !== undefined && { nameAr }),
        ...(description !== undefined && { description }),
        ...(descriptionAr !== undefined && { descriptionAr }),
        ...(icon !== undefined && { icon }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(parentId !== undefined && {
          parentId: parentId === 'null' ? null : parentId,
        }),
        ...(updateRootType !== undefined && { rootType: updateRootType }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder) }),
      },
      include: {
        parent: true,
      },
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

    // Check if category has child categories
    if (category.children && category.children.length > 0) {
      throw new AppError(
        'Cannot delete category with sub-categories',
        400,
        'HAS_CHILDREN'
      );
    }

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
