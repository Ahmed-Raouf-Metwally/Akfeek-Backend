const userService = require('../../services/user.service');

/**
 * User Controller
 * Handles HTTP requests for user management
 */
class UserController {
  /**
   * Get current user profile
   * GET /api/users/profile
   */
  async getProfile(req, res, next) {
    try {
      const user = await userService.getUserProfile(req.user.id);

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   * PUT /api/users/profile
   */
  async updateProfile(req, res, next) {
    try {
      const user = await userService.updateProfile(req.user.id, req.body);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        messageAr: 'تم تحديث الملف الشخصي بنجاح',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update technician profile
   * PUT /api/users/technician-profile
   */
  async updateTechnicianProfile(req, res, next) {
    try {
      const profile = await userService.updateTechnicianProfile(req.user.id, req.body);

      res.json({
        success: true,
        message: 'Technician profile updated',
        messageAr: 'تم تحديث ملف الفني',
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update supplier profile
   * PUT /api/users/supplier-profile
   */
  async updateSupplierProfile(req, res, next) {
    try {
      const profile = await userService.updateSupplierProfile(req.user.id, req.body);

      res.json({
        success: true,
        message: 'Supplier profile updated',
        messageAr: 'تم تحديث ملف المورد',
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update language preference
   * PUT /api/users/language
   */
  async updateLanguage(req, res, next) {
    try {
      const { language } = req.body;
      const user = await userService.updateLanguage(req.user.id, language);

      res.json({
        success: true,
        message: 'Language updated',
        messageAr: 'تم تحديث اللغة',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all users (Admin only)
   * GET /api/users
   */
  async getAllUsers(req, res, next) {
    try {
      const { role, status, search, page, limit } = req.query;
      
      const result = await userService.getAllUsers(
        { role, status, search },
        { page: parseInt(page), limit: parseInt(limit) }
      );

      res.json({
        success: true,
        data: result.users,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID (Admin only)
   * GET /api/users/:id
   */
  async getUserById(req, res, next) {
    try {
      const user = await userService.getUserProfile(req.params.id);

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user status (Admin only)
   * PATCH /api/users/:id/status
   */
  async updateUserStatus(req, res, next) {
    try {
      const { status } = req.body;
      const user = await userService.updateUserStatus(req.params.id, status);

      res.json({
        success: true,
        message: 'User status updated',
        messageAr: 'تم تحديث حالة المستخدم',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user (Admin only)
   * DELETE /api/users/:id
   */
  async deleteUser(req, res, next) {
    try {
      await userService.deleteUser(req.params.id);

      res.json({
        success: true,
        message: 'User deleted successfully',
        messageAr: 'تم حذف المستخدم بنجاح'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
