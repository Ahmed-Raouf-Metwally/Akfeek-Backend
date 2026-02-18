const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');
const logger = require('../utils/logger/logger');

/**
 * Authentication Service
 * Handles all authentication business logic
 */
class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Object} Created user and JWT token
   */
  async register(userData) {
    const { email, phone, password, role, firstName, lastName, preferredLanguage = 'AR' } = userData;

    // Validate required fields
    if (!email || !password || !role || !firstName || !lastName) {
      throw new AppError(
        'Missing required fields',
        400,
        'VALIDATION_ERROR'
      );
    }

    // Validate role
    if (!['CUSTOMER', 'TECHNICIAN', 'SUPPLIER'].includes(role)) {
      throw new AppError(
        'Invalid role',
        400,
        'VALIDATION_ERROR'
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : [])
        ]
      }
    });

    if (existingUser) {
      throw new AppError(
        'Email or phone already registered',
        409,
        'ALREADY_EXISTS'
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with profile
    const user = await prisma.user.create({
      data: {
        email,
        phone,
        passwordHash,
        role,
        preferredLanguage,
        profile: {
          create: {
            firstName,
            lastName
          }
        }
      },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        preferredLanguage: true,
        emailVerified: true,
        phoneVerified: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    // Generate JWT token
    const token = this.generateToken(user);

    logger.info(`New user registered: ${user.id} (${user.role})`);

    return { user, token };
  }

  /**
   * Authenticate user and generate token
   * @param {string} identifier - Email or phone number
   * @param {string} password - User password
   * @returns {Object} User data and JWT token
   */
  async login(identifier, password) {
    if (!identifier || !password) {
      throw new AppError(
        'Email/Phone and password are required',
        400,
        'VALIDATION_ERROR'
      );
    }

    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier }
        ]
      },
      select: {
        id: true,
        email: true,
        phone: true,
        passwordHash: true,
        role: true,
        status: true,
        preferredLanguage: true,
        emailVerified: true,
        phoneVerified: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    if (!user) {
      throw new AppError(
        'Invalid credentials',
        401,
        'UNAUTHORIZED'
      );
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError(
        'Invalid credentials',
        401,
        'UNAUTHORIZED'
      );
    }

    // Check if user is active
    if (user.status !== 'ACTIVE' && user.status !== 'PENDING_VERIFICATION') {
      throw new AppError(
        'Account is suspended',
        403,
        'FORBIDDEN'
      );
    }

    // Generate JWT token
    const token = this.generateToken(user);

    // Remove password from response
    const { passwordHash, ...userWithoutPassword } = user;

    if (userWithoutPassword.role === 'VENDOR') {
      const vendor = await prisma.vendorProfile.findUnique({
        where: { userId: user.id },
        select: { vendorType: true }
      });
      userWithoutPassword.vendorType = vendor?.vendorType != null ? String(vendor.vendorType) : 'AUTO_PARTS';
    }

    logger.info(`User logged in: ${user.id} (${user.role})`);

    return { user: userWithoutPassword, token };
  }

  /**
   * Generate OTP code for phone verification
   * @param {string} phone - Phone number
   * @returns {Object} OTP code (in development mode)
   */
  async sendOTP(phone) {
    if (!phone) {
      throw new AppError(
        'Phone number is required',
        400,
        'VALIDATION_ERROR'
      );
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // TODO: Send SMS via Twilio/Unifonic
    // For now, just log it (in production, remove this)
    logger.info(`OTP for ${phone}: ${otpCode}`);

    // TODO: Store OTP in database with expiry
    // You might want to create an OTP table for this

    return {
      // In development, include OTP (remove in production!)
      ...(process.env.NODE_ENV === 'development' && { otp: otpCode })
    };
  }

  /**
   * Verify OTP code
   * @param {string} phone - Phone number
   * @param {string} code - OTP code
   */
  async verifyOTP(phone, code) {
    if (!phone || !code) {
      throw new AppError(
        'Phone and OTP code are required',
        400,
        'VALIDATION_ERROR'
      );
    }

    // TODO: Verify OTP from database
    // For now, accept any 6-digit code
    if (code.length !== 6) {
      throw new AppError(
        'Invalid OTP code',
        400,
        'VALIDATION_ERROR'
      );
    }

    // Update user phone verification status
    const result = await prisma.user.updateMany({
      where: { phone },
      data: { phoneVerified: true }
    });

    if (result.count === 0) {
      throw new AppError(
        'Phone number not found',
        404,
        'NOT_FOUND'
      );
    }

    logger.info(`Phone verified: ${phone}`);
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Object} User data
   */
  async getUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        preferredLanguage: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
            bio: true,
            bioAr: true,
            // Technician fields
            licenseNumber: true,
            yearsExperience: true,
            specializations: true,
            isAvailable: true,
            // Supplier fields
            businessName: true,
            businessNameAr: true,
            businessLicense: true
          }
        }
      }
    });

    if (!user) {
      throw new AppError(
        'User not found',
        404,
        'NOT_FOUND'
      );
    }

    return user;
  }

  /**
   * Generate JWT token for user
   * @param {Object} user - User object
   * @returns {string} JWT token
   */
  generateToken(user) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET is not set in environment');
      throw new AppError('Server configuration error: JWT_SECRET missing', 500, 'SERVER_ERROR');
    }
    return jwt.sign(
      {
        userId: user.id,
        role: user.role,
        email: user.email
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );
  }
}

module.exports = new AuthService();
