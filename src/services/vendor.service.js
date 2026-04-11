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
    const { status, search, isVerified, vendorType, page = 1, limit = 12 } = filters;

    const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(100, Math.max(1, parseInt(limit)));
    const take = Math.min(100, Math.max(1, parseInt(limit)));

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
        { contactPhone: { contains: searchTerm } },
        { city: { contains: searchTerm } },
      ];
    }

    const [vendors, total] = await Promise.all([
      prisma.vendorProfile.findMany({
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
            select: { parts: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.vendorProfile.count({ where }),
    ]);

    return {
      data: vendors,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        totalPages: Math.max(1, Math.ceil(total / take)),
      },
    };
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
            images: { select: { url: true }, take: 1 },
          },
        },
        comprehensiveCareServices: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          where: {
            category: { in: ['COMPREHENSIVE_CARE', 'CLEANING'] },
          },
          select: {
            id: true,
            name: true,
            nameAr: true,
            type: true,
            category: true,
            isActive: true,
            estimatedDuration: true,
            imageUrl: true,
            pricing: {
              select: { vehicleType: true, basePrice: true, isActive: true },
              take: 3,
            },
          },
        },
        winch: {
          select: {
            id: true, name: true, nameAr: true, plateNumber: true,
            vehicleModel: true, year: true, capacity: true,
            imageUrl: true, city: true,
            isAvailable: true, isActive: true, isVerified: true,
            basePrice: true, pricePerKm: true, minPrice: true, currency: true,
            totalTrips: true, averageRating: true, totalReviews: true,
          },
        },
        mobileWorkshop: {
          select: {
            id: true, name: true, nameAr: true, description: true,
            vehicleType: true, vehicleModel: true, year: true, plateNumber: true,
            servicesOffered: true,
            city: true, serviceRadius: true,
            imageUrl: true, vehicleImageUrl: true,
            isAvailable: true, isActive: true, isVerified: true,
            basePrice: true, pricePerKm: true, hourlyRate: true, minPrice: true, currency: true,
            totalJobs: true, averageRating: true, totalReviews: true,
            services: {
              where: { isActive: true },
              orderBy: { createdAt: 'asc' },
              select: { id: true, serviceType: true, name: true, nameAr: true, description: true, price: true, currency: true, estimatedDuration: true },
            },
          },
        },
        workshop: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            city: true,
            cityAr: true,
            phone: true,
            email: true,
            address: true,
            logo: true,
            averageRating: true,
            totalReviews: true,
            totalBookings: true,
            isVerified: true,
            isActive: true,
            workshopServices: {
              where: { isActive: true },
              orderBy: { createdAt: 'asc' },
              select: { id: true, serviceType: true, name: true, nameAr: true, description: true, price: true, currency: true, estimatedDuration: true },
            },
          },
        },
        _count: {
          select: {
            parts: true,
            comprehensiveCareServices: true,
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

    // Validate the linked user
    const existing = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (existing) {
      throw new AppError('User already has a vendor profile', 400, 'VENDOR_EXISTS');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    // Accept VENDOR role or users being promoted; if not VENDOR yet, update their role
    if (user.role !== 'VENDOR') {
      await prisma.user.update({ where: { id: userId }, data: { role: 'VENDOR' } });
    }

    const vendor = await prisma.vendorProfile.create({
      data: {
        userId,
        ...(vendorType && { vendorType: ['AUTO_PARTS', 'COMPREHENSIVE_CARE', 'CERTIFIED_WORKSHOP', 'CAR_WASH', 'MOBILE_WORKSHOP', 'TOWING_SERVICE', 'ADHMN_AKFEEK'].includes(vendorType) ? vendorType : 'AUTO_PARTS' }),
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
      termsAndConditions,
      termsAndConditionsAr,
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
      commissionPercent,
    } = data;

    // Validate commissionPercent only when a real value is provided (not empty/null)
    if (commissionPercent !== undefined && commissionPercent !== null && commissionPercent !== '') {
      const pct = parseFloat(commissionPercent);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        throw new AppError('commissionPercent must be a number between 0 and 100', 400, 'VALIDATION_ERROR');
      }
    }

    const validVendorTypes = ['AUTO_PARTS', 'COMPREHENSIVE_CARE', 'CERTIFIED_WORKSHOP', 'CAR_WASH', 'MOBILE_WORKSHOP', 'TOWING_SERVICE', 'ADHMN_AKFEEK'];
    const vendor = await prisma.vendorProfile.update({
      where: { id },
      data: {
        ...(businessName !== undefined && { businessName }),
        ...(businessNameAr !== undefined && { businessNameAr }),
        ...(description !== undefined && { description }),
        ...(descriptionAr !== undefined && { descriptionAr }),
        ...(termsAndConditions !== undefined && { termsAndConditions }),
        ...(termsAndConditionsAr !== undefined && { termsAndConditionsAr }),
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
        // commissionPercent: null = use global setting; a number = override for this vendor
        ...(commissionPercent !== undefined && {
          commissionPercent: commissionPercent === null || commissionPercent === ''
            ? null
            : parseFloat(commissionPercent),
        }),
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
    }

    const vendor = await prisma.vendorProfile.update({
      where: { id },
      data: updateData,
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

    const stats = await prisma.autoPart.groupBy({
      by: ['isApproved', 'isActive'],
      where: { vendorId },
      _count: true,
    });

    const totalParts = await prisma.autoPart.count({
      where: { vendorId },
    });

    const activeParts = await prisma.autoPart.count({
      where: { vendorId, isActive: true, isApproved: true },
    });

    const pendingParts = await prisma.autoPart.count({
      where: { vendorId, isApproved: false },
    });

    return {
      vendor: {
        id: vendor.id,
        businessName: vendor.businessName,
        status: vendor.status,
        isVerified: vendor.isVerified,
      },
      stats: {
        totalParts,
        activeParts,
        pendingParts,
        totalSales: vendor.totalSales,
        averageRating: vendor.averageRating,
        totalReviews: vendor.totalReviews,
      },
    };
  }

  /**
   * Delete vendor (Admin only) — حذف فعلي من قاعدة البيانات
   * يزيل VendorProfile وجميع البيانات المرتبطة (كوبونات، تقييمات، مستندات، قطع غيار، إلخ).
   * الورشة/الونش/الورشة المتنقلة تُفصل (vendorId = null) ولا تُحذف.
   * @param {string} id - Vendor profile ID
   */
  async deleteVendor(id) {
    const vendor = await this.getVendorById(id);

    await prisma.$transaction(async (tx) => {
      // فصل عناصر الطلبات التي تشير للفيندور (إن لم يكن عليها onDelete في الـ schema)
      await tx.marketplaceOrderItem.updateMany({
        where: { vendorId: id },
        data: { vendorId: null },
      });

      // حذف الفيندور — Prisma/DB ستطبق Cascade على (Coupon, VendorReview, VendorDocument, AutoPart, AutoPartVendor)
      // و SetNull على (CertifiedWorkshop, Winch, MobileWorkshop, Service, BookingAutoPart)
      await tx.vendorProfile.delete({
        where: { id },
      });
    });

    logger.info(`Vendor deleted (hard) from database: ${id} (${vendor.businessName})`);
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
}

module.exports = new VendorService();
