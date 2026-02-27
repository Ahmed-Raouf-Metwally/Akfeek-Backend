const vendorService = require('../../services/vendor.service');

/**
 * Vendor Controller
 * Handles requests for vendor management
 */
class VendorController {
  /**
   * Get all vendors
   * GET /api/vendors
   */
  async getAllVendors(req, res, next) {
    try {
      const { status, search, isVerified } = req.query;
      const vendors = await vendorService.getAllVendors({
        status,
        search,
        isVerified,
      });

      res.json({
        success: true,
        data: vendors,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get vendor by ID
   * GET /api/vendors/:id
   */
  async getVendorById(req, res, next) {
    try {
      const vendor = await vendorService.getVendorById(req.params.id);

      res.json({
        success: true,
        data:vendor,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user's vendor profile
   * GET /api/vendors/profile/me
   */
  async getMyVendorProfile(req, res, next) {
    try {
      const vendor = await vendorService.getVendorByUserId(req.user.id);

      res.json({
        success: true,
        data: vendor,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get comprehensive care bookings for current vendor (مواعيد الحجوزات)
   * GET /api/vendors/profile/me/comprehensive-care-bookings
   */
  async getMyComprehensiveCareBookings(req, res, next) {
    try {
      const result = await vendorService.getComprehensiveCareBookings(req.user.id, {
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
      });

      res.json({
        success: true,
        data: result.list,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new vendor profile
   * POST /api/vendors
   */
  async createVendor(req, res, next) {
    try {
      // If admin, use userId from request body; otherwise use authenticated user's ID
      const userId = req.user.role === 'ADMIN' && req.body.userId 
        ? req.body.userId 
        : req.user.id;

      const vendor = await vendorService.createVendor(userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Vendor profile created successfully',
        messageAr: 'تم إنشاء ملف المورد بنجاح',
        data: vendor,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update vendor profile
   * PUT /api/vendors/:id
   */
  async updateVendor(req, res, next) {
    try {
      // If vendor, ensure they can only update their own profile
      if (req.user.role === 'VENDOR') {
        const vendorProfile = await vendorService.getVendorByUserId(req.user.id);
        if (vendorProfile.id !== req.params.id) {
          return res.status(403).json({
            success: false,
            message: 'You can only update your own profile',
            messageAr: 'يمكنك فقط تحديث ملفك الشخصي',
          });
        }
      }

      const vendor = await vendorService.updateVendor(req.params.id, req.body);

      res.json({
        success: true,
        message: 'Vendor profile updated successfully',
        messageAr: 'تم تحديث ملف المورد بنجاح',
        data: vendor,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update vendor status (Admin only)
   * PUT /api/vendors/:id/status
   */
  async updateVendorStatus(req, res, next) {
    try {
      const { status } = req.body;
      const vendor = await vendorService.updateVendorStatus(req.params.id, status);

      res.json({
        success: true,
        message: 'Vendor status updated successfully',
        messageAr: 'تم تحديث حالة المورد بنجاح',
        data: vendor,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get vendor statistics
   * GET /api/vendors/:id/stats
   */
  async getVendorStats(req, res, next) {
    try {
      const stats = await vendorService.getVendorStats(req.params.id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete vendor (Admin only)
   * DELETE /api/vendors/:id
   */
  async deleteVendor(req, res, next) {
    try {
      await vendorService.deleteVendor(req.params.id);

      res.json({
        success: true,
        message: 'Vendor deleted successfully',
        messageAr: 'تم حذف المورد بنجاح',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VendorController();
