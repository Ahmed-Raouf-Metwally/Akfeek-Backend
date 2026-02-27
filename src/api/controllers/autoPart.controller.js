const autoPartService = require('../../services/autoPart.service');

/**
 * Auto Part Controller
 * Handles requests for auto part management with role-based access
 */
class AutoPartController {
  /**
   * Get all auto parts with filters
   * GET /api/auto-parts
   */
  async getAllParts(req, res, next) {
    try {
      const { category, vendor, vehicleModel, search, isActive, isApproved, status } = req.query;
      const parts = await autoPartService.getAllParts(
        { category, vendor, vehicleModel, search, isActive, isApproved, status },
        req.user
      );

      res.json({
        success: true,
        data: parts,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get part by ID
   * GET /api/auto-parts/:id
   */
  async getPartById(req, res, next) {
    try {
      const part = await autoPartService.getPartById(req.params.id, req.user);

      res.json({
        success: true,
        data: part,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get parts by vendor
   * GET /api/auto-parts/vendor/:vendorId
   */
  async getPartsByVendor(req, res, next) {
    try {
      const parts = await autoPartService.getPartsByVendor(req.params.vendorId);

      res.json({
        success: true,
        data: parts,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get parts by vehicle model
   * GET /api/auto-parts/vehicle/:vehicleModelId
   */
  async getPartsByVehicle(req, res, next) {
    try {
      const parts = await autoPartService.getPartsByVehicle(req.params.vehicleModelId);

      res.json({
        success: true,
        data: parts,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new auto part
   * POST /api/auto-parts
   */
  async createPart(req, res, next) {
    try {
      const part = await autoPartService.createPart(req.body, req.user);

      res.status(201).json({
        success: true,
        message: 'Auto part created successfully',
        messageAr: 'تم إنشاء قطعة الغيار بنجاح',
        data: part,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update auto part
   * PUT /api/auto-parts/:id
   */
  async updatePart(req, res, next) {
    try {
      const part = await autoPartService.updatePart(
        req.params.id,
        req.body,
        req.user
      );

      res.json({
        success: true,
        message: 'Auto part updated successfully',
        messageAr: 'تم تحديث قطعة الغيار بنجاح',
        data: part,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve or reject part (Admin only)
   * PUT /api/auto-parts/:id/approve
   */
  async updatePartApproval(req, res, next) {
    try {
      const { isApproved } = req.body;
      const part = await autoPartService.updatePartApproval(req.params.id, isApproved);

      res.json({
        success: true,
        message: isApproved ? 'Part approved successfully' : 'Part rejected',
        messageAr: isApproved ? 'تم قبول القطعة بنجاح' : 'تم رفض القطعة',
        data: part,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete auto part
   * DELETE /api/auto-parts/:id
   */
  async deletePart(req, res, next) {
    try {
      await autoPartService.deletePart(req.params.id, req.user);

      res.json({
        success: true,
        message: 'Auto part deleted successfully',
        messageAr: 'تم حذف قطعة الغيار بنجاح',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload image(s) for auto part (returns URLs to use in create/update)
   * POST /api/auto-parts/upload-image
   */
  async uploadImage(req, res, next) {
    try {
      const files = req.files || (req.file ? [req.file] : []);
      if (!files.length) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
          errorAr: 'لم يتم رفع أي ملف',
        });
      }
      const urls = files.map((f) => '/uploads/auto-parts/' + f.filename);
      res.json({
        success: true,
        data: urls.length === 1 ? urls[0] : urls,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add images to part
   * POST /api/auto-parts/:id/images
   */
  async addPartImages(req, res, next) {
    try {
      const { images } = req.body;
      const result = await autoPartService.addPartImages(
        req.params.id,
        images,
        req.user
      );

      res.json({
        success: true,
        message: 'Images added successfully',
        messageAr: 'تم إضافة الصور بنجاح',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete one image from part
   * DELETE /api/auto-parts/:id/images/:imageId
   */
  async deletePartImage(req, res, next) {
    try {
      await autoPartService.deletePartImage(
        req.params.id,
        req.params.imageId,
        req.user
      );
      res.json({
        success: true,
        message: 'Image deleted',
        messageAr: 'تم حذف الصورة',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set primary image for part
   * PATCH /api/auto-parts/:id/images/:imageId/primary
   */
  async setPrimaryPartImage(req, res, next) {
    try {
      const images = await autoPartService.setPrimaryPartImage(
        req.params.id,
        req.params.imageId,
        req.user
      );
      res.json({
        success: true,
        message: 'Primary image updated',
        messageAr: 'تم تحديث الصورة الرئيسية',
        data: images,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update stock quantity
   * PUT /api/auto-parts/:id/stock
   */
  async updatePartStock(req, res, next) {
    try {
      const { quantity } = req.body;
      const part = await autoPartService.updatePartStock(
        req.params.id,
        quantity,
        req.user
      );

      res.json({
        success: true,
        message: 'Stock updated successfully',
        messageAr: 'تم تحديث المخزون بنجاح',
        data: part,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AutoPartController();
