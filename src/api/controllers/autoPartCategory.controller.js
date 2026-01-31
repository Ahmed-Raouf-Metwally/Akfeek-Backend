const autoPartCategoryService = require('../../services/autoPartCategory.service');

/**
 * Auto Part Category Controller
 * Handles requests for auto part category management
 */
class AutoPartCategoryController {
  /**
   * Get all categories
   * GET /api/auto-part-categories
   */
  async getAllCategories(req, res, next) {
    try {
      const { isActive, parentId } = req.query;
      const categories = await autoPartCategoryService.getAllCategories({
        isActive,
        parentId,
      });

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get category tree (hierarchical)
   * GET /api/auto-part-categories/tree
   */
  async getCategoryTree(req, res, next) {
    try {
      const tree = await autoPartCategoryService.getCategoryTree();

      res.json({
        success: true,
        data: tree,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get category by ID
   * GET /api/auto-part-categories/:id
   */
  async getCategoryById(req, res, next) {
    try {
      const category = await autoPartCategoryService.getCategoryById(req.params.id);

      res.json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create category (Admin only)
   * POST /api/auto-part-categories
   */
  async createCategory(req, res, next) {
    try {
      const category = await autoPartCategoryService.createCategory(req.body);

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        messageAr: 'تم إنشاء الفئة بنجاح',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update category (Admin only)
   * PUT /api/auto-part-categories/:id
   */
  async updateCategory(req, res, next) {
    try {
      const category = await autoPartCategoryService.updateCategory(
        req.params.id,
        req.body
      );

      res.json({
        success: true,
        message: 'Category updated successfully',
        messageAr: 'تم تحديث الفئة بنجاح',
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete category (Admin only)
   * DELETE /api/auto-part-categories/:id
   */
  async deleteCategory(req, res, next) {
    try {
      await autoPartCategoryService.deleteCategory(req.params.id);

      res.json({
        success: true,
        message: 'Category deleted successfully',
        messageAr: 'تم حذف الفئة بنجاح',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AutoPartCategoryController();
