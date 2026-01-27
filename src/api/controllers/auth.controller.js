const authService = require('../../services/auth.service');

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
      const { identifier, password } = req.body;
      const result = await authService.login(identifier, password);

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

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
