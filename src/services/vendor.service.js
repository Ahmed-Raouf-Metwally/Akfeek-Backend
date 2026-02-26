const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');
const logger = require('../utils/logger/logger');

/**
 * Vendor Management Service
 * Handles CRUD operations for auto parts vendors
 */
class VendorService {
  /**
   * Get all vendors with optional filters
   * @param {Object} filters - Filter options (status, search)
   * @returns {Array} List of vendors
   */
  async getAllVendors(filters = {}) {
    const { status, search, isVerified, vendorType } = filters;

    const where = {
      ...(status && { status }),
      ...(vendorType && { vendorType }),
      ...(isVerified !== undefined && { isVerified: isVerified === 'true' }),
    };

    const searchTerm = typeof search === 'string' ? search.trim() : '';
    if (searchTerm) {
      where.OR = [
        { businessName: { contains: searchTerm } },
        { businessNameAr: { contains: searchTerm } },
        { contactEmail: { contains: searchTerm } },
      ];
    }

    const vendors = await prisma.vendorProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            status: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            parts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return vendors;
  }

  /**
   * Get vendor by ID
   * @param {string} id - Vendor profile ID
   * @returns {Object} Vendor details
   */
  async getVendorById(id) {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            status: true,
            role: true,
          },
        },
        parts: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            sku: true,
            name: true,
            nameAr: true,
            price: true,
            stockQuantity: true,
            isApproved: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            parts: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    }

    return vendor;
  }

  /**
   * Get vendor profile by user ID
   * @param {string} userId - User ID
   * @returns {Object} Vendor profile
   */
  async getVendorByUserId(userId) {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId },
      include: {
        _count: {
          select: {
            parts: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new AppError('Vendor profile not found', 404, 'VENDOR_NOT_FOUND');
    }

    return vendor;
  }

  /**
   * Create new vendor profile
   * @param {string} userId - User ID
   * @param {Object} data - Vendor data
   * @returns {Object} Created vendor
   */
  async createVendor(userId, data) {
    const {
      businessName,
      businessNameAr,
      description,
      descriptionAr,
      commercialLicense,
      taxNumber,
      contactPhone,
      contactEmail,
      address,
      city,
      country,
      logo,
      banner,
      status,
      vendorType,
    } = data;

    // Check if user already has a vendor profile
    const existing = await prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new AppError(
        'User already has a vendor profile',
        400,
        'VENDOR_EXISTS'
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const vendor = await prisma.$transaction(async (tx) => {
      // 1. Upgrade user role to VENDOR if not already
      if (user.role !== 'VENDOR') {
        await tx.user.update({
          where: { id: userId },
          data: { role: 'VENDOR' }
        });
        logger.info(`User role upgraded to VENDOR for userId=${userId}`);
      }

      // 2. Create vendor profile
      return await tx.vendorProfile.create({
        data: {
          userId,
          ...(vendorType && { vendorType: ['AUTO_PARTS', 'COMPREHENSIVE_CARE', 'CERTIFIED_WORKSHOP', 'CAR_WASH', 'ADHMN_AKFEEK'].includes(vendorType) ? vendorType : 'AUTO_PARTS' }),
          businessName,
          businessNameAr,
          description,
          descriptionAr,
          commercialLicense,
          taxNumber,
          contactPhone,
          contactEmail,
          address,
          city,
          country: country || 'SA',
          logo,
          banner,
          status: status || 'PENDING_APPROVAL',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
            },
          },
        },
      });
    });

    logger.info(`Vendor profile created: ${vendor.businessName} (${vendor.id})`);
    return vendor;
  }

  /**
   * Update vendor profile
   * @param {string} id - Vendor profile ID
   * @param {Object} data - Updates
   * @returns {Object} Updated vendor
   */
  async updateVendor(id, data) {
    // Check if vendor exists
    await this.getVendorById(id);

    const {
      businessName,
      businessNameAr,
      description,
      descriptionAr,
      commercialLicense,
      taxNumber,
      contactPhone,
      contactEmail,
      address,
      city,
      country,
      logo,
      banner,
      vendorType,
    } = data;

    const validVendorTypes = ['AUTO_PARTS', 'COMPREHENSIVE_CARE', 'CERTIFIED_WORKSHOP', 'CAR_WASH', 'ADHMN_AKFEEK'];
    const vendor = await prisma.vendorProfile.update({
      where: { id },
      data: {
        ...(businessName !== undefined && { businessName }),
        ...(businessNameAr !== undefined && { businessNameAr }),
        ...(description !== undefined && { description }),
        ...(descriptionAr !== undefined && { descriptionAr }),
        ...(commercialLicense !== undefined && { commercialLicense }),
        ...(taxNumber !== undefined && { taxNumber }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(country !== undefined && { country }),
        ...(logo !== undefined && { logo }),
        ...(banner !== undefined && { banner }),
        ...(vendorType !== undefined && validVendorTypes.includes(vendorType) && { vendorType }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    logger.info(`Vendor updated: ${id}`);
    return vendor;
  }

  /**
   * Update vendor status (Admin only)
   * @param {string} id - Vendor profile ID
   * @param {string} status - New status (PENDING_APPROVAL, ACTIVE, SUSPENDED, REJECTED)
   * @returns {Object} Updated vendor
   */
  async updateVendorStatus(id, status) {
    await this.getVendorById(id);

    const validStatuses = ['PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid status', 400, 'INVALID_STATUS');
    }

    const updateData = { status };

    // Set isVerified and verifiedAt when approving
    if (status === 'ACTIVE') {
      updateData.isVerified = true;
      updateData.verifiedAt = new Date();
    } else if (status === 'SUSPENDED' || status === 'REJECTED') {
      updateData.isVerified = false;
    }

    const vendor = await prisma.$transaction(async (tx) => {
      const updated = await tx.vendorProfile.update({
        where: { id },
        data: updateData,
        include: { user: true }
      });

      // مزامنة الـ Role الخاص بالمستخدم
      if (updated.user) {
        let newRole = updated.user.role;
        if (status === 'ACTIVE') {
          newRole = 'VENDOR';
        } else if (status === 'SUSPENDED' || status === 'REJECTED') {
          // ترجيعه لمستخدم عادي لو تم إيقافه
          newRole = 'CUSTOMER';
        }

        if (newRole !== updated.user.role) {
          await tx.user.update({
            where: { id: updated.userId },
            data: { role: newRole }
          });
          logger.info(`User role updated to ${newRole} for userId=${updated.userId} due to vendor status change`);
        }
      }

      return updated;
    });

    logger.info(`Vendor status updated: ${id} -> ${status}`);
    return vendor;
  }

  /**
   * Get vendor statistics
   * @param {string} vendorId - Vendor profile ID
   * @returns {Object} Vendor stats
   */
  async getVendorStats(vendorId) {
    const vendor = await this.getVendorById(vendorId);
    let extraStats = {};

    // 1. قطع الغيار (Auto Parts)
    if (vendor.vendorType === 'AUTO_PARTS' || !vendor.vendorType) {
      const totalParts = await prisma.autoPart.count({ where: { vendorId } });
      const activeParts = await prisma.autoPart.count({ where: { vendorId, isActive: true, isApproved: true } });
      const pendingParts = await prisma.autoPart.count({ where: { vendorId, isApproved: false } });
      extraStats = { totalParts, activeParts, pendingParts };
    }

    // 2. الحجوزات (للعناية الشاملة، الغسيل، والورش)
    if (['COMPREHENSIVE_CARE', 'CAR_WASH', 'CERTIFIED_WORKSHOP'].includes(vendor.vendorType)) {
      // البحث عن الحجوزات المرتبطة بخدمات هذا الفيندور
      // ملاحظة: الورش مرتبطة مباشرة عبر workshopId، العناية والغسيل عبر خدماتهم
      let bookingWhere = {};

      if (vendor.vendorType === 'CERTIFIED_WORKSHOP') {
        const workshop = await prisma.certifiedWorkshop.findUnique({ where: { vendorId } });
        bookingWhere = workshop ? { workshopId: workshop.id } : { id: 'none' };
      } else {
        bookingWhere = {
          services: {
            some: {
              service: { vendorId: vendor.id }
            }
          }
        };
      }

      const totalBookings = await prisma.booking.count({ where: bookingWhere });
      const completedBookings = await prisma.booking.count({
        where: { ...bookingWhere, status: 'COMPLETED' }
      });
      const pendingBookings = await prisma.booking.count({
        where: { ...bookingWhere, status: 'PENDING' }
      });

      // حساب إجمالي الإيرادات من الحجوزات المكتملة
      const revenue = await prisma.booking.aggregate({
        where: { ...bookingWhere, status: 'COMPLETED' },
        _sum: { totalPrice: true }
      });

      extraStats = {
        totalBookings,
        completedBookings,
        pendingBookings,
        revenue: Number(revenue._sum.totalPrice || 0)
      };
    }

    return {
      vendor: {
        id: vendor.id,
        businessName: vendor.businessName,
        vendorType: vendor.vendorType,
        status: vendor.status,
        isVerified: vendor.isVerified,
      },
      stats: {
        ...extraStats,
        totalSales: vendor.totalSales,
        averageRating: vendor.averageRating,
        totalReviews: vendor.totalReviews,
      },
    };
  }

  /**
   * Delete vendor (Admin only - soft delete by setting status to REJECTED)
   * @param {string} id - Vendor profile ID
   */
  async deleteVendor(id) {
    await this.getVendorById(id);

    // Soft delete by setting status to REJECTED and deactivating all parts
    await prisma.$transaction(async (tx) => {
      // Deactivate all vendor's parts
      await tx.autoPart.updateMany({
        where: { vendorId: id },
        data: { isActive: false },
      });

      // Update vendor status
      await tx.vendorProfile.update({
        where: { id },
        data: { status: 'REJECTED', isVerified: false },
      });
    });

    logger.info(`Vendor deleted (soft): ${id}`);
  }

  /**
   * Get bookings for comprehensive care vendor (حجوزات العناية الشاملة)
   * Bookings where at least one BookingService has service.vendorId = this vendor
   * @param {string} userId - Vendor user ID
   * @param {Object} query - page, limit, status
   * @returns {{ list: Array, pagination: Object }}
   */
  async getComprehensiveCareBookings(userId, query = {}) {
    const profile = await this.getVendorByUserId(userId);
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
    const skip = (page - 1) * limit;
    const status = query.status || undefined;

    const where = {
      services: {
        some: {
          service: {
            vendorId: profile.id,
          },
        },
      },
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ scheduledDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          customer: {
            select: {
              id: true,
              email: true,
              phone: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
          vehicle: {
            select: {
              id: true,
              plateNumber: true,
              vehicleModel: {
                select: { name: true, year: true, brand: { select: { name: true } } },
              },
            },
          },
          services: {
            where: { service: { vendorId: profile.id } },
            include: { service: { select: { id: true, name: true, nameAr: true } } },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      list: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Submit or update customer review for a vendor (1-5 stars)
   * @param {string} vendorId - Vendor profile ID
   * @param {string} userId - Customer user ID
   * @param {Object} data - { rating (1-5), comment?, orderId? }
   * @returns {Object} Created/updated review and updated vendor average
   */
  async submitVendorReview(vendorId, userId, data) {
    const { rating, comment, orderId } = data;
    if (!rating || rating < 1 || rating > 5) {
      throw new AppError('Rating must be between 1 and 5', 400, 'INVALID_RATING');
    }

    const vendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

    const review = await prisma.vendorReview.upsert({
      where: {
        vendorId_userId: { vendorId, userId },
      },
      create: {
        vendorId,
        userId,
        orderId: orderId || null,
        rating: Number(rating),
        comment: comment || null,
      },
      update: {
        orderId: orderId || undefined,
        rating: Number(rating),
        comment: comment || null,
      },
      include: {
        user: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
      },
    });

    const agg = await prisma.vendorReview.aggregate({
      where: { vendorId },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.vendorProfile.update({
      where: { id: vendorId },
      data: {
        averageRating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
        totalReviews: agg._count,
      },
    });

    logger.info(`Vendor review: ${review.id} for vendor ${vendorId} by user ${userId} (${rating}/5)`);
    return { review, averageRating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0, totalReviews: agg._count };
  }

  /**
   * Get reviews for a vendor (paginated)
   */
  async getVendorReviews(vendorId, { page = 1, limit = 10 } = {}) {
    const vendor = await prisma.vendorProfile.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

    const skip = (Number(page) - 1) * Number(limit);
    const [reviews, total] = await Promise.all([
      prisma.vendorReview.findMany({
        where: { vendorId },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } },
        },
      }),
      prisma.vendorReview.count({ where: { vendorId } }),
    ]);

    return {
      reviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
      averageRating: vendor.averageRating ?? 0,
      totalReviews: vendor.totalReviews ?? 0,
    };
  }
  /**
   * Get all comprehensive care providers (merged from Certified Workshops and VendorProfiles)
   */
  async getComprehensiveCareProviders(filters = {}) {
    const { city, search } = filters;

    // 1. Get Comprehensive Care Vendors
    const vendorWhere = {
      vendorType: 'COMPREHENSIVE_CARE',
      status: 'ACTIVE'
    };
    if (city) vendorWhere.city = city;

    const searchTerm = typeof search === 'string' ? search.trim() : '';
    if (searchTerm) {
      vendorWhere.OR = [
        { businessName: { contains: searchTerm } },
        { businessNameAr: { contains: searchTerm } }
      ];
    }

    const careVendors = await prisma.vendorProfile.findMany({
      where: vendorWhere,
      select: {
        id: true,
        businessName: true,
        businessNameAr: true,
        city: true,
        contactPhone: true,
        logo: true,
        isVerified: true,
        averageRating: true,
        totalReviews: true,
        vendorType: true
      }
    });

    // 2. Get Certified Workshops with "care/comprehensive" services
    const workshopWhere = {
      isActive: true,
      isVerified: true,
      OR: [
        { services: { contains: 'comprehensive' } },
        { services: { contains: 'عناية' } },
        { services: { contains: 'شاملة' } },
        { services: { contains: 'care' } }
      ]
    };
    if (city) workshopWhere.city = city;
    if (searchTerm) {
      workshopWhere.OR.push(
        { name: { contains: searchTerm } },
        { nameAr: { contains: searchTerm } }
      );
    }

    const careWorkshops = await prisma.certifiedWorkshop.findMany({
      where: workshopWhere,
      select: {
        id: true,
        name: true,
        nameAr: true,
        city: true,
        phone: true,
        logo: true,
        isVerified: true,
        averageRating: true,
        totalReviews: true,
        services: true
      }
    });

    // 3. Normalize and Merge
    const normalizedVendors = careVendors.map(v => ({
      id: v.id,
      name: v.businessName,
      nameAr: v.businessNameAr,
      city: v.city,
      phone: v.contactPhone,
      logo: v.logo,
      isVerified: v.isVerified,
      averageRating: v.averageRating,
      totalReviews: v.totalReviews,
      type: 'VENDOR',
      category: 'COMPREHENSIVE_CARE'
    }));

    const normalizedWorkshops = careWorkshops.map(w => ({
      id: w.id,
      name: w.name,
      nameAr: w.nameAr,
      city: w.city,
      phone: w.phone,
      logo: w.logo,
      isVerified: w.isVerified,
      averageRating: w.averageRating,
      totalReviews: w.totalReviews,
      type: 'WORKSHOP',
      category: 'CERTIFIED_WORKSHOP',
      services: w.services
    }));

    return [...normalizedVendors, ...normalizedWorkshops].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
  }
}

module.exports = new VendorService();
