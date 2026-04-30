const authService = require('../../services/auth.service');
const userService = require('../../services/user.service');
const prisma = require('../../utils/database/prisma');

/**
 * Authentication Controller
 * Handles HTTP requests/responses for authentication endpoints
 * Delegates business logic to AuthService
 */
class AuthController {
  /**
   * Register new user
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        messageAr: 'تم التسجيل بنجاح',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * User login
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { identifier, email, phone, password, fcm_token, fcmToken, platform, deviceId } = req.body || {};
      const resolvedIdentifier = identifier || email || phone;
      const result = await authService.login(resolvedIdentifier, password, {
        fcmToken: fcm_token || fcmToken || null,
        platform: platform || null,
        deviceId: deviceId || null,
      });

      if (result?.restoreRequired) {
        const { AppError } = require('../middlewares/error.middleware');
        throw new AppError(
          'Account deleted. Restore verification required',
          403,
          result.code || 'ACCOUNT_DELETED_RESTORE_REQUIRED',
          result,
          'الحساب محذوف. يلزم التحقق لاسترجاع الحساب'
        );
      }

      res.json({
        success: true,
        message: 'Login successful',
        messageAr: 'تم تسجيل الدخول بنجاح',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request deleted-account restore OTP (resend / change channel)
   * POST /api/auth/account-restore/request
   */
  async requestAccountRestore(req, res, next) {
    try {
      const { restoreToken, channel } = req.body || {};
      const data = await authService.requestDeletedAccountRestore(restoreToken, channel);
      res.json({
        success: true,
        message: 'Restore OTP sent',
        messageAr: 'تم إرسال رمز استرجاع الحساب',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Confirm deleted-account restore with OTP
   * POST /api/auth/account-restore/confirm
   */
  async confirmAccountRestore(req, res, next) {
    try {
      const { restoreToken, channel, code } = req.body || {};
      const data = await authService.confirmDeletedAccountRestore(restoreToken, channel, code);
      res.json({
        success: true,
        message: 'Account restored successfully',
        messageAr: 'تم استرجاع الحساب بنجاح',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Forgot password: send OTP + resetToken
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req, res, next) {
    try {
      const { identifier, channel } = req.body || {};
      const data = await authService.forgotPassword(identifier, channel);
      res.json({
        success: true,
        message: 'If the account exists, reset instructions have been sent',
        messageAr: 'إذا كان الحساب موجودًا، تم إرسال تعليمات إعادة التعيين',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password with OTP + resetToken
   * POST /api/auth/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      const { resetToken, code, newPassword } = req.body || {};
      const data = await authService.resetPassword(resetToken, code, newPassword);
      res.json({
        success: true,
        message: 'Password reset successful',
        messageAr: 'تم إعادة تعيين كلمة المرور بنجاح',
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send OTP to phone
   * POST /api/auth/send-otp
   */
  async sendOTP(req, res, next) {
    try {
      const { phone } = req.body;
      const result = await authService.sendOTP(phone);

      res.json({
        success: true,
        message: 'OTP sent successfully',
        messageAr: 'تم إرسال رمز التحقق بنجاح',
        data: result || {},
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify OTP
   * POST /api/auth/verify-otp
   */
  async verifyOTP(req, res, next) {
    try {
      const { phone, code } = req.body;
      await authService.verifyOTP(phone, code);

      res.json({
        success: true,
        message: 'Phone verified successfully',
        messageAr: 'تم التحقق من رقم الهاتف بنجاح'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current authenticated user
   * GET /api/auth/me
   */
  async getCurrentUser(req, res, next) {
    try {
      if (!req.user) {
        const { AppError } = require('../middlewares/error.middleware');
        throw new AppError(
          'Authentication required',
          401,
          'UNAUTHORIZED'
        );
      }

      const user = await authService.getUserById(req.user.id);

      if (user.role === 'VENDOR') {
        const profile = await prisma.vendorProfile.findUnique({
          where: { userId: req.user.id },
          select: { vendorType: true },
        });
        user.vendorType = profile?.vendorType != null ? String(profile.vendorType) : 'AUTO_PARTS';
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete current authenticated account
   * DELETE /api/auth/account
   */
  async deleteMyAccount(req, res, next) {
    try {
      await userService.deleteUser(req.user.id);
      res.json({
        success: true,
        message: 'Account deleted successfully',
        messageAr: 'تم حذف الحساب بنجاح',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
