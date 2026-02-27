const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');
const logger = require('../utils/logger/logger');

/**
 * Auto Part Service
 * Handles CRUD operations for auto parts with role-based access control
 */
class AutoPartService {
  /**
   * Get all auto parts with filters and access control
   * @param {Object} filters - Filter options
   * @param {Object} requestingUser - Current user making the request
   * @returns {Array} List of parts
   */
  async getAllParts(filters = {}, requestingUser = null) {
    const { category, vendor, vehicleModel, search, isActive, isApproved, status } = filters;

    const where = {
      ...(category && { categoryId: category }),
      ...(vendor && { vendorId: vendor }),
      // Default: only active parts (exclude soft-deleted). Pass isActive=false to see inactive.
      ...(isActive === undefined && { isActive: true }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
    };

    // Role-based filtering
    if (requestingUser) {
      if (requestingUser.role === 'VENDOR') {
        // Vendor sees only their own products
        const vendorProfile = await prisma.vendorProfile.findUnique({
          where: { userId: requestingUser.id },
        });

        if (vendorProfile) {
          where.vendorId = vendorProfile.id;
        } else {
          where.vendorId = 'no-profile'; // No profile = no parts
        }
      } else if (requestingUser.role !== 'ADMIN') {
        // Non-admin, non-vendor users only see approved parts
        where.isApproved = true;
      }
      // Admins see all parts (no additional filter)
    } else {
      // Public access - only approved parts
      where.isApproved = true;
    }

    // Apply approval status filter if specified
    if (isApproved !== undefined) {
      where.isApproved = isApproved === 'true';
    }

    // Search filter
    const searchTerm = typeof search === 'string' ? search.trim() : '';
    if (searchTerm) {
      where.OR = [
        ...( where.OR || []),
        { name: { contains: searchTerm } },
        { nameAr: { contains: searchTerm } },
        { brand: { contains: searchTerm } },
        { sku: { contains: searchTerm } },
      ];
    }

    // Vehicle compatibility filter
    if (vehicleModel) {
      where.compatibility = {
        some: {
          vehicleModelId: vehicleModel,
        },
      };
    }

    const parts = await prisma.autoPart.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            nameAr: true,
          },
        },
        vendor: {
          select: {
            id: true,
            businessName: true,
            businessNameAr: true,
            logo: true,
            status: true,
          },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
        _count: {
          select: {
            compatibility: true,
            images: true,
          },
        },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });

    return parts;
  }

  /**
   * Get part by ID with access control
   * @param {string} id - Part ID
   * @param {Object} requestingUser - Current user
   * @returns {Object} Part details
   */
  async getPartById(id, requestingUser = null) {
    const part = await prisma.autoPart.findUnique({
      where: { id },
      include: {
        category: true,
        vendor: {
          include: {
            user: {
              select: {
                email: true,
                phone: true,
              },
            },
          },
        },
        createdByUser: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        compatibility: {
          include: {
            vehicleModel: {
              include: {
                brand: true,
              },
            },
          },
        },
      },
    });

    if (!part) {
      throw new AppError('Auto part not found', 404, 'PART_NOT_FOUND');
    }

    // Access control check
    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      if (requestingUser && requestingUser.role === 'VENDOR') {
        const vendorProfile = await prisma.vendorProfile.findUnique({
          where: { userId: requestingUser.id },
        });

        // Vendor can see their own parts or approved parts
        if (part.vendorId !== vendorProfile?.id && !part.isApproved) {
          throw new AppError(
            'You do not have permission to view this part',
            403,
            'FORBIDDEN'
          );
        }
      } else if (!part.isApproved) {
        // Public users can only see approved parts
        throw new AppError(' Part not found', 404, 'PART_NOT_FOUND');
      }
    }

    return part;
  }

  /**
   * Get parts by vendor
   * @param {string} vendorId - Vendor profile ID
   * @returns {Array} Vendor's parts
   */
  async getPartsByVendor(vendorId) {
    const parts = await prisma.autoPart.findMany({
      where: { vendorId },
      include: {
        category: true,
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return parts;
  }

  /**
   * Get parts compatible with a vehicle
   * @param {string} vehicleModelId - Vehicle model ID
   * @returns {Array} Compatible parts (approved only)
   */
  async getPartsByVehicle(vehicleModelId) {
    const parts = await prisma.autoPart.findMany({
      where: {
        isActive: true,
        isApproved: true,
        compatibility: {
          some: {
            vehicleModelId,
          },
        },
      },
      include: {
        category: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
            businessNameAr: true,
            logo: true,
          },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
    });

    return parts;
  }

  /**
   * Create new auto part with role-based defaults
   * @param {Object} data - Part data
   * @param {Object} requestingUser - Current user
   * @returns {Object} Created part
   */
  async createPart(data, requestingUser) {
    const {
      sku,
      name,
      nameAr,
      description,
      descriptionAr,
      vendorId,
      categoryId,
      brand,
      partNumber,
      oemNumber,
      price,
      compareAtPrice,
      cost,
      stockQuantity,
      lowStockThreshold,
      weight,
      dimensions,
      specifications,
      isActive,
      isFeatured,
      images,
      compatibility,
    } = data;

    // Validate category
    const category = await prisma.autoPartCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }

    // Check SKU uniqueness
    const existingSKU = await prisma.autoPart.findUnique({
      where: { sku },
    });

    if (existingSKU) {
      throw new AppError('SKU already exists', 400, 'DUPLICATE_SKU');
    }

    // Determine ownership and approval based on user role
    let finalVendorId = null;
    let isApproved = true;

    if (requestingUser.role === 'VENDOR') {
      // Vendor creates their own parts - added and live immediately (no admin approval)
      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: { userId: requestingUser.id },
      });

      if (!vendorProfile) {
        throw new AppError(
          'Vendor profile not found',
          404,
          'VENDOR_PROFILE_NOT_FOUND'
        );
      }

      finalVendorId = vendorProfile.id;
      isApproved = true; // Vendor parts go live immediately
    } else if (requestingUser.role === 'ADMIN') {
      // Admin can create platform-owned or vendor-owned parts
      finalVendorId = vendorId || null;
      isApproved = true; // Admin-created parts are auto-approved
    } else {
      throw new AppError(
        'Only vendors and admins can create parts',
        403,
        'FORBIDDEN'
      );
    }

    const part = await prisma.autoPart.create({
      data: {
        sku,
        name,
        nameAr,
        description,
        descriptionAr,
        vendorId: finalVendorId,
        createdByUserId: requestingUser.id,
        categoryId,
        brand,
        partNumber,
        oemNumber,
        price: parseFloat(price),
        compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
        cost: cost ? parseFloat(cost) : null,
        stockQuantity: stockQuantity !== undefined ? parseInt(stockQuantity) : 0,
        lowStockThreshold:
          lowStockThreshold !== undefined ? parseInt(lowStockThreshold) : 10,
        weight: weight ? parseFloat(weight) : null,
        dimensions,
        specifications,
        isActive: isActive !== undefined ? isActive : true,
        isFeatured: isFeatured !== undefined ? isFeatured : false,
        isApproved,
        approvedAt: isApproved ? new Date() : null,
        // Create images
        images: images
          ? {
              create: images.map((img, index) => ({
                url: img.url,
                altText: img.altText,
                sortOrder: img.sortOrder !== undefined ? img.sortOrder : index,
                isPrimary:
                  img.isPrimary !== undefined ? img.isPrimary : index === 0,
              })),
            }
          : undefined,
        // Create compatibility
        compatibility: compatibility
          ? {
              create: compatibility.map((comp) => ({
                vehicleModelId: comp.vehicleModelId,
                notes: comp.notes,
                fitmentType: comp.fitmentType,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        vendor: true,
        images: true,
        compatibility: {
          include: {
            vehicleModel: {
              include: {
                brand: true,
              },
            },
          },
        },
      },
    });

    logger.info(`Auto part created: ${part.name} (${part.sku}) by ${requestingUser.email}`);
    return part;
  }

  /**
   * Update auto part with ownership check
   * @param {string} id - Part ID
   * @param {Object} data - Updates
   * @param {Object} requestingUser - Current user
   * @returns {Object} Updated part
   */
  async updatePart(id, data, requestingUser) {
    const part = await this.getPartById(id, requestingUser);

    // Check ownership
    if (requestingUser.role === 'VENDOR') {
      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: { userId: requestingUser.id },
      });

      if (part.vendorId !== vendorProfile?.id) {
        throw new AppError(
          'You can only update your own parts',
          403,
          'FORBIDDEN'
        );
      }
    }

    const {
      name,
      nameAr,
      description,
      descriptionAr,
      brand,
      partNumber,
      oemNumber,
      price,
      compareAtPrice,
      cost,
      stockQuantity,
      lowStockThreshold,
      weight,
      dimensions,
      specifications,
      isActive,
      isFeatured,
      categoryId,
      vendorId,
    } = data;

    // Only admin can change category or vendor assignment
    const updateData = {
      ...(name !== undefined && { name }),
      ...(nameAr !== undefined && { nameAr }),
      ...(description !== undefined && { description }),
      ...(descriptionAr !== undefined && { descriptionAr }),
      ...(brand !== undefined && { brand }),
      ...(partNumber !== undefined && { partNumber }),
      ...(oemNumber !== undefined && { oemNumber }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(compareAtPrice !== undefined && {
        compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
      }),
      ...(cost !== undefined && { cost: cost ? parseFloat(cost) : null }),
      ...(stockQuantity !== undefined && {
        stockQuantity: parseInt(stockQuantity),
      }),
      ...(lowStockThreshold !== undefined && {
        lowStockThreshold: parseInt(lowStockThreshold),
      }),
      ...(weight !== undefined && {
        weight: weight ? parseFloat(weight) : null,
      }),
      ...(dimensions !== undefined && { dimensions }),
      ...(specifications !== undefined && { specifications }),
      ...(isActive !== undefined && { isActive }),
      ...(isFeatured !== undefined && { isFeatured }),
    };
    if (requestingUser.role === 'ADMIN') {
      if (categoryId !== undefined) updateData.categoryId = categoryId;
      if (vendorId !== undefined) updateData.vendorId = vendorId || null;
    }

    const updatedPart = await prisma.autoPart.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        vendor: true,
        images: true,
        compatibility: {
          include: {
            vehicleModel: {
              include: {
                brand: true,
              },
            },
          },
        },
      },
    });

    logger.info(`Auto part updated: ${id}`);
    return updatedPart;
  }

  /**
   * Update part approval status (Admin only)
   * @param {string} id - Part ID
   * @param {boolean} isApproved - Approval status
   * @returns {Object} Updated part
   */
  async updatePartApproval(id, isApproved) {
    const part = await prisma.autoPart.findUnique({
      where: { id },
    });

    if (!part) {
      throw new AppError('Auto part not found', 404, 'PART_NOT_FOUND');
    }

    const updatedPart = await prisma.autoPart.update({
      where: { id },
      data: {
        isApproved,
        approvedAt: isApproved ? new Date() : null,
      },
      include: {
        vendor: true,
      },
    });

    logger.info(`Auto part approval updated: ${id} -> ${isApproved}`);
    return updatedPart;
  }

  /**
   * Delete auto part with ownership check
   * @param {string} id - Part ID
   * @param {Object} requestingUser - Current user
   */
  async deletePart(id, requestingUser) {
    const part = await this.getPartById(id, requestingUser);

    // Check ownership for vendors
    if (requestingUser.role === 'VENDOR') {
      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: { userId: requestingUser.id },
      });

      if (part.vendorId !== vendorProfile?.id) {
        throw new AppError(
          'You can only delete your own parts',
          403,
          'FORBIDDEN'
        );
      }
    }

    // Soft delete by setting isActive to false
    await prisma.autoPart.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info(`Auto part deleted (soft): ${id}`);
  }

  /**
   * Add images to a part with ownership check
   * @param {string} partId - Part ID
   * @param {Array} images - Array of image data
   * @param {Object} requestingUser - Current user
   * @returns {Array} Created images
   */
  async addPartImages(partId, images, requestingUser) {
    const part = await this.getPartById(partId, requestingUser);

    // Check ownership for vendors
    if (requestingUser.role === 'VENDOR') {
      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: { userId: requestingUser.id },
      });

      if (part.vendorId !== vendorProfile?.id) {
        throw new AppError(
          'You can only add images to your own parts',
          403,
          'FORBIDDEN'
        );
      }
    }

    const hasPrimary = images.some((img) => img.isPrimary);
    if (hasPrimary) {
      await prisma.autoPartImage.updateMany({
        where: { partId },
        data: { isPrimary: false },
      });
    }

    const createdImages = await prisma.autoPartImage.createMany({
      data: images.map((img, index) => ({
        partId,
        url: img.url,
        altText: img.altText,
        sortOrder: img.sortOrder !== undefined ? img.sortOrder : index,
        isPrimary: img.isPrimary !== undefined ? img.isPrimary : false,
      })),
    });

    logger.info(`Added ${images.length} images to part: ${partId}`);
    return createdImages;
  }

  /**
   * Delete one image from a part (ownership check)
   */
  async deletePartImage(partId, imageId, requestingUser) {
    const part = await this.getPartById(partId, requestingUser);

    if (requestingUser.role === 'VENDOR') {
      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: { userId: requestingUser.id },
      });
      if (part.vendorId !== vendorProfile?.id) {
        throw new AppError(
          'You can only delete images from your own parts',
          403,
          'FORBIDDEN'
        );
      }
    }

    const image = await prisma.autoPartImage.findFirst({
      where: { id: imageId, partId },
    });
    if (!image) {
      throw new AppError('Image not found', 404, 'NOT_FOUND');
    }

    await prisma.autoPartImage.delete({ where: { id: imageId } });
    logger.info(`Deleted image ${imageId} from part ${partId}`);
    return { deleted: true };
  }

  /**
   * Set one image as primary (ownership check)
   */
  async setPrimaryPartImage(partId, imageId, requestingUser) {
    const part = await this.getPartById(partId, requestingUser);

    if (requestingUser.role === 'VENDOR') {
      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: { userId: requestingUser.id },
      });
      if (part.vendorId !== vendorProfile?.id) {
        throw new AppError(
          'You can only update images for your own parts',
          403,
          'FORBIDDEN'
        );
      }
    }

    const image = await prisma.autoPartImage.findFirst({
      where: { id: imageId, partId },
    });
    if (!image) {
      throw new AppError('Image not found', 404, 'NOT_FOUND');
    }

    await prisma.$transaction([
      prisma.autoPartImage.updateMany({
        where: { partId },
        data: { isPrimary: false },
      }),
      prisma.autoPartImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      }),
    ]);
    const updated = await prisma.autoPart.findUnique({
      where: { id: partId },
      include: { images: true },
    });
    logger.info(`Set primary image ${imageId} for part ${partId}`);
    return updated.images;
  }

  /**
   * Update stock quantity with ownership check
   * @param {string} partId - Part ID
   * @param {number} quantity - New quantity
   * @param {Object} requestingUser - Current user
   * @returns {Object} Updated part
   */
  async updatePartStock(partId, quantity, requestingUser) {
    const part = await this.getPartById(partId, requestingUser);

    // Check ownership for vendors
    if (requestingUser.role === 'VENDOR') {
      const vendorProfile = await prisma.vendorProfile.findUnique({
        where: { userId: requestingUser.id },
      });

      if (part.vendorId !== vendorProfile?.id) {
        throw new AppError(
          'You can only update stock for your own parts',
          403,
          'FORBIDDEN'
        );
      }
    }

    const updatedPart = await prisma.autoPart.update({
      where: { id: partId },
      data: {
        stockQuantity: parseInt(quantity),
      },
    });

    logger.info(`Stock updated for part ${partId}: ${quantity}`);
    return updatedPart;
  }
}

module.exports = new AutoPartService();
