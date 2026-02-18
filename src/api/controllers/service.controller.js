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
      const { category, type, search, isActive, vendorId } = req.query;
      const services = await serviceCatalogService.getAllServices(
        { category, type, search, isActive, vendorId },
        req.user
      );

      res.json({
        success: true,
        data: services
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload service image (returns URL for imageUrl field)
   * POST /api/services/upload-image
   */
  async uploadImage(req, res, next) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
          errorAr: 'لم يتم رفع أي صورة',
        });
      }
      const url = '/uploads/services/' + file.filename;
      res.json({ success: true, data: url });
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
   * Get available appointment slots for a service on a date (Comprehensive Care).
   * GET /api/services/:id/available-slots?date=YYYY-MM-DD
   */
  async getAvailableSlots(req, res, next) {
    try {
      const { id } = req.params;
      const date = req.query.date;
      if (!date) {
        return res.status(400).json({
          success: false,
          error: 'Query "date" (YYYY-MM-DD) is required',
          errorAr: 'المعامل date مطلوب بصيغة YYYY-MM-DD'
        });
      }
      const slots = await serviceCatalogService.getAvailableSlots(id, date);
      res.json({ success: true, data: slots });
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
      const service = await serviceCatalogService.createService(req.body, req.user);

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
      const service = await serviceCatalogService.updateService(req.params.id, req.body, req.user);

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
      await serviceCatalogService.deleteService(req.params.id, req.user);

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
