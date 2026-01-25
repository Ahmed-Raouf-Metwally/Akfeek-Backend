const serviceCatalogService = require('../../services/service.service');

/**
 * Service Controller
 * Handles requests for service catalog management
 */
class ServiceController {
  /**
   * Get all services query
   * GET /api/services
   */
  async getAllServices(req, res, next) {
    try {
      const { category, type, search, isActive } = req.query;
      const services = await serviceCatalogService.getAllServices({ 
        category, type, search, isActive 
      });

      res.json({
        success: true,
        data: services
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get service by ID
   * GET /api/services/:id
   */
  async getServiceById(req, res, next) {
    try {
      const service = await serviceCatalogService.getServiceById(req.params.id);

      res.json({
        success: true,
        data: service
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create service (Admin)
   * POST /api/services
   */
  async createService(req, res, next) {
    try {
      const service = await serviceCatalogService.createService(req.body);

      res.status(201).json({
        success: true,
        message: 'Service created successfully',
        messageAr: 'تم إنشاء الخدمة بنجاح',
        data: service
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update service (Admin)
   * PUT /api/services/:id
   */
  async updateService(req, res, next) {
    try {
      const service = await serviceCatalogService.updateService(req.params.id, req.body);

      res.json({
        success: true,
        message: 'Service updated successfully',
        messageAr: 'تم تحديث الخدمة بنجاح',
        data: service
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete service (Admin)
   * DELETE /api/services/:id
   */
  async deleteService(req, res, next) {
    try {
      await serviceCatalogService.deleteService(req.params.id);

      res.json({
        success: true,
        message: 'Service deleted successfully',
        messageAr: 'تم حذف الخدمة بنجاح'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ServiceController();
