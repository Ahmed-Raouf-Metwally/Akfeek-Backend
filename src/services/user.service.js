const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');
const logger = require('../utils/logger/logger');

/**
 * User Service
 * Handles user profile and management business logic
 */
class UserService {
  /**
   * Get user profile by ID
   * @param {string} userId - User ID
   * @returns {Object} User profile data
   */
  async getUserProfile(userId) {
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
        updatedAt: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
            bio: true,
            bioAr: true,
            licenseNumber: true,
            yearsExperience: true,
            specializations: true,
            isAvailable: true,
            businessName: true,
            businessNameAr: true,
            businessLicense: true
          }
        }
      }
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    return user;
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Profile data to update
   * @returns {Object} Updated user profile
   */
  async updateProfile(userId, updateData) {
    const { firstName, lastName, bio, bioAr, avatar } = updateData;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true }
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Update profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        profile: {
          update: {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(bio !== undefined && { bio }),
            ...(bioAr !== undefined && { bioAr }),
            ...(avatar !== undefined && { avatar })
          }
        }
      },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
            bio: true,
            bioAr: true
          }
        }
      }
    });

    logger.info(`Profile updated for user: ${userId}`);

    return updatedUser;
  }

  /**
   * Update technician-specific profile
   * @param {string} userId - Technician user ID
   * @param {Object} techData - Technician data
   */
  async updateTechnicianProfile(userId, techData) {
    const { licenseNumber, yearsExperience, specializations, isAvailable } = techData;

    // Verify user is a technician
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || user.role !== 'TECHNICIAN') {
      throw new AppError('User is not a technician', 403, 'FORBIDDEN');
    }

    const updated = await prisma.profile.update({
      where: { userId },
      data: {
        ...(licenseNumber && { licenseNumber }),
        ...(yearsExperience !== undefined && { yearsExperience }),
        ...(specializations && { specializations }),
        ...(isAvailable !== undefined && { isAvailable })
      }
    });

    logger.info(`Technician profile updated: ${userId}`);

    return updated;
  }

  /**
   * Update supplier-specific profile
   * @param {string} userId - Supplier user ID
   * @param {Object} supplierData - Supplier data
   */
  async updateSupplierProfile(userId, supplierData) {
    const { businessName, businessNameAr, businessLicense } = supplierData;

    // Verify user is a supplier
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || user.role !== 'SUPPLIER') {
      throw new AppError('User is not a supplier', 403, 'FORBIDDEN');
    }

    const updated = await prisma.profile.update({
      where: { userId },
      data: {
        ...(businessName && { businessName }),
        ...(businessNameAr && { businessNameAr }),
        ...(businessLicense && { businessLicense })
      }
    });

    logger.info(`Supplier profile updated: ${userId}`);

    return updated;
  }

  /**
   * Update user language preference
   * @param {string} userId - User ID
   * @param {string} language - Language (AR or EN)
   */
  async updateLanguage(userId, language) {
    if (!['AR', 'EN'].includes(language)) {
      throw new AppError('Invalid language', 400, 'VALIDATION_ERROR');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { preferredLanguage: language },
      select: {
        id: true,
        preferredLanguage: true
      }
    });

    logger.info(`Language updated for user ${userId}: ${language}`);

    return user;
  }

  /**
   * Get all users (Admin only)
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Object} Users list with pagination
   */
  async getAllUsers(filters = {}, pagination = {}) {
    const { role, status, search } = filters;
    const { page = 1, limit = 10 } = pagination;

    const skip = (page - 1) * limit;

    const where = {
      ...(role && { role }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { email: { contains: search } },
          { phone: { contains: search } },
          { profile: { firstName: { contains: search } } },
          { profile: { lastName: { contains: search } } }
        ]
      })
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
          phoneVerified: true,
          createdAt: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          _count: {
            select: {
              vehicles: true,
              addresses: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update user status (Admin only)
   * @param {string} userId - User ID
   * @param {string} status - New status
   */
  async updateUserStatus(userId, status) {
    const validStatuses = ['ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'BANNED'];
    
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid status', 400, 'VALIDATION_ERROR');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        email: true,
        status: true
      }
    });

    logger.info(`User ${userId} status updated to: ${status}`);

    return user;
  }

  /**
   * Delete user account
   * @param {string} userId - User ID
   */
  async deleteUser(userId) {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Soft delete: update status to DELETED
    await prisma.user.update({
      where: { id: userId },
      data: { 
        status: 'SUSPENDED',
        // Could add deletedAt timestamp if schema has it
      }
    });

    logger.info(`User deleted: ${userId}`);
  }
}

module.exports = new UserService();
