const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');
const logger = require('../utils/logger/logger');

const PACKAGE_DEAL_TYPES = ['STANDARD', 'PERCENT_SUBSCRIPTION'];

function normalizePackageDealType(raw) {
  if (raw === undefined || raw === null || raw === '') return 'STANDARD';
  const v = String(raw).trim().toUpperCase();
  if (!PACKAGE_DEAL_TYPES.includes(v)) {
    throw new AppError(`dealType must be one of: ${PACKAGE_DEAL_TYPES.join(', ')}`, 400, 'VALIDATION_ERROR');
  }
  return v;
}

class PackageService {
  assertPercentSubscriptionFields(discountPercent, usageCount, serviceIds) {
    const d = discountPercent === undefined || discountPercent === null ? null : Number(discountPercent);
    if (d === null || Number.isNaN(d) || d < 1 || d > 100) {
      throw new AppError('PERCENT_SUBSCRIPTION requires discountPercent between 1 and 100', 400, 'VALIDATION_ERROR');
    }
    const u = usageCount === undefined || usageCount === null ? null : Number(usageCount);
    if (u === null || Number.isNaN(u) || u < 1) {
      throw new AppError('PERCENT_SUBSCRIPTION requires usageCount (included washes) >= 1', 400, 'VALIDATION_ERROR');
    }
    if (!Array.isArray(serviceIds) || serviceIds.length < 1) {
      throw new AppError('PERCENT_SUBSCRIPTION requires at least one linked service', 400, 'VALIDATION_ERROR');
    }
  }

  async getAllPackages(filters = {}) {
    const { isActive = true, includeServices = true, dealType } = filters;

    const where = { isActive };
    if (dealType) {
      const dt = String(dealType).trim().toUpperCase();
      if (PACKAGE_DEAL_TYPES.includes(dt)) {
        where.dealType = dt;
      }
    }

    const packages = await prisma.package.findMany({
      where,
      include: {
        services: includeServices ? {
          include: {
            service: true
          }
        } : false
      },
      orderBy: {
        sortOrder: 'asc'
      }
    });

    return packages;
  }

  async getPackageById(id, includeDetails = true) {
    const pkg = await prisma.package.findUnique({
      where: { id },
      include: includeDetails ? {
        services: {
          include: {
            service: true
          }
        }
      } : false
    });

    if (!pkg) {
      throw new AppError('Package not found', 404, 'NOT_FOUND');
    }

    return pkg;
  }

  async createPackage(data) {
    const {
      name,
      nameAr,
      description,
      descriptionAr,
      price,
      usageCount,
      validityDays,
      serviceIds,
      imageUrl,
      sortOrder = 0,
      dealType: rawDealType,
      discountPercent,
      listPriceTotal,
    } = data;

    const dealType = normalizePackageDealType(rawDealType);
    if (dealType === 'PERCENT_SUBSCRIPTION') {
      this.assertPercentSubscriptionFields(discountPercent, usageCount, serviceIds);
    } else if (discountPercent != null || listPriceTotal != null) {
      throw new AppError('discountPercent and listPriceTotal are only allowed when dealType is PERCENT_SUBSCRIPTION', 400, 'VALIDATION_ERROR');
    }

    const pkg = await prisma.package.create({
      data: {
        name,
        nameAr,
        description,
        descriptionAr,
        price,
        usageCount,
        validityDays,
        imageUrl,
        sortOrder,
        dealType,
        discountPercent: dealType === 'PERCENT_SUBSCRIPTION' ? Number(discountPercent) : null,
        listPriceTotal:
          dealType === 'PERCENT_SUBSCRIPTION' && listPriceTotal !== undefined && listPriceTotal !== null && listPriceTotal !== ''
            ? listPriceTotal
            : null,
        services: serviceIds ? {
          create: serviceIds.map(serviceId => ({ serviceId }))
        } : undefined
      },
      include: {
        services: {
          include: {
            service: true
          }
        }
      }
    });

    logger.info(`Package created: ${pkg.id}`);
    return pkg;
  }

  async updatePackage(id, data) {
    const {
      name,
      nameAr,
      description,
      descriptionAr,
      price,
      usageCount,
      validityDays,
      isActive,
      serviceIds,
      imageUrl,
      sortOrder,
      dealType: rawDealType,
      discountPercent,
      listPriceTotal,
    } = data;

    const existing = await prisma.package.findUnique({
      where: { id },
      include: { services: { select: { serviceId: true } } },
    });
    if (!existing) {
      throw new AppError('Package not found', 404, 'NOT_FOUND');
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (nameAr !== undefined) updateData.nameAr = nameAr;
    if (description !== undefined) updateData.description = description;
    if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr;
    if (price !== undefined) updateData.price = price;
    if (usageCount !== undefined) updateData.usageCount = usageCount;
    if (validityDays !== undefined) updateData.validityDays = validityDays;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    if (rawDealType !== undefined) {
      updateData.dealType = normalizePackageDealType(rawDealType);
      if (updateData.dealType === 'STANDARD') {
        updateData.discountPercent = null;
        updateData.listPriceTotal = null;
      }
    }
    if (discountPercent !== undefined) {
      updateData.discountPercent =
        discountPercent === null || discountPercent === '' ? null : Number(discountPercent);
    }
    if (listPriceTotal !== undefined) {
      updateData.listPriceTotal =
        listPriceTotal === null || listPriceTotal === '' ? null : listPriceTotal;
    }

    if (serviceIds !== undefined) {
      await prisma.packageService.deleteMany({ where: { packageId: id } });
      if (serviceIds.length > 0) {
        updateData.services = {
          create: serviceIds.map(serviceId => ({ serviceId }))
        };
      }
    }

    const nextDeal = updateData.dealType ?? existing.dealType;
    const nextUsage = updateData.usageCount !== undefined ? updateData.usageCount : existing.usageCount;
    const nextDisc = updateData.discountPercent !== undefined ? updateData.discountPercent : existing.discountPercent;
    const nextServiceIds =
      serviceIds !== undefined ? serviceIds : existing.services.map((s) => s.serviceId);

    if (nextDeal === 'PERCENT_SUBSCRIPTION') {
      this.assertPercentSubscriptionFields(nextDisc, nextUsage, nextServiceIds);
    } else {
      const mergedList =
        updateData.listPriceTotal !== undefined ? updateData.listPriceTotal : existing.listPriceTotal;
      if (nextDisc != null || mergedList != null) {
        throw new AppError(
          'discountPercent and listPriceTotal are only allowed when dealType is PERCENT_SUBSCRIPTION',
          400,
          'VALIDATION_ERROR'
        );
      }
    }

    const pkg = await prisma.package.update({
      where: { id },
      data: updateData,
      include: {
        services: {
          include: {
            service: true
          }
        }
      }
    });

    logger.info(`Package updated: ${id}`);
    return pkg;
  }

  async deletePackage(id) {
    const existing = await prisma.package.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Package not found', 404, 'NOT_FOUND');
    }

    await prisma.package.delete({ where: { id } });
    logger.info(`Package deleted: ${id}`);
  }

  async purchasePackage(userId, packageId) {
    const pkg = await this.getPackageById(packageId, true);
    
    if (!pkg.isActive) {
      throw new AppError('Package is not active', 400, 'INVALID_PACKAGE');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + pkg.validityDays);

    const existingPurchase = await prisma.userPackage.findFirst({
      where: {
        userId,
        packageId,
        isActive: true,
        expiresAt: { gt: new Date() }
      }
    });

    if (existingPurchase) {
      throw new AppError('You already have an active package', 400, 'PACKAGE_ALREADY_PURCHASED');
    }

    const userPackage = await prisma.userPackage.create({
      data: {
        userId,
        packageId,
        expiresAt,
        isActive: true
      },
      include: {
        package: {
          include: {
            services: {
              include: {
                service: true
              }
            }
          }
        }
      }
    });

    if (pkg.services && pkg.services.length > 0) {
      const usageRecords = pkg.services.map(ps => ({
        userPackageId: userPackage.id,
        serviceId: ps.serviceId,
        usedCount: 0
      }));

      await prisma.userPackageServiceUsage.createMany({
        data: usageRecords
      });
    }

    logger.info(`User ${userId} purchased package ${packageId}`);
    return userPackage;
  }

  async getUserPackages(userId, includeExpired = false) {
    const where = {
      userId
    };

    if (!includeExpired) {
      where.expiresAt = { gt: new Date() };
    }

    const packages = await prisma.userPackage.findMany({
      where,
      include: {
        package: {
          include: {
            services: {
              include: {
                service: true
              }
            }
          }
        },
        usages: true
      },
      orderBy: {
        purchasedAt: 'desc'
      }
    });

    return packages.map(up => ({
      ...up,
      isExpired: new Date(up.expiresAt) < new Date(),
      remainingDays: Math.ceil((new Date(up.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
    }));
  }

  async getUserPackageById(userId, userPackageId) {
    const userPackage = await prisma.userPackage.findFirst({
      where: {
        id: userPackageId,
        userId
      },
      include: {
        package: {
          include: {
            services: {
              include: {
                service: true
              }
            }
          }
        },
        usages: true
      }
    });

    if (!userPackage) {
      throw new AppError('Package not found', 404, 'NOT_FOUND');
    }

    return userPackage;
  }

  isPackageValid(userPackage) {
    if (!userPackage.isActive) return { valid: false, reason: 'Package is inactive' };
    if (new Date(userPackage.expiresAt) < new Date()) return { valid: false, reason: 'Package has expired' };
    return { valid: true };
  }

  calculateRemainingUsage(userPackage) {
    const pkg = userPackage.package;
    if (!pkg.usageCount) return { unlimited: true, remaining: null };
    
    const totalUsed = userPackage.usages?.reduce((sum, u) => sum + u.usedCount, 0) || 0;
    return {
      unlimited: false,
      total: pkg.usageCount,
      used: totalUsed,
      remaining: pkg.usageCount - totalUsed
    };
  }

  async applyPackageToBooking(userId, bookingId, userPackageId, serviceId) {
    const userPackage = await this.getUserPackageById(userId, userPackageId);
    
    const validation = this.isPackageValid(userPackage);
    if (!validation.valid) {
      throw new AppError(validation.reason, 400, 'PACKAGE_INVALID');
    }

    const usageInfo = this.calculateRemainingUsage(userPackage);
    if (!usageInfo.unlimited && usageInfo.remaining <= 0) {
      throw new AppError('Package usage limit reached', 400, 'USAGE_LIMIT_REACHED');
    }

    const packageService = userPackage.package.services?.find(ps => ps.serviceId === serviceId);
    if (!packageService) {
      throw new AppError('This service is not included in the package', 400, 'SERVICE_NOT_INCLUDED');
    }

    const usageRecord = userPackage.usages?.find(u => u.serviceId === serviceId);
    if (usageRecord && !usageInfo.unlimited && usageRecord.usedCount >= (userPackage.package.usageCount || 0)) {
      throw new AppError('Service usage limit reached', 400, 'USAGE_LIMIT_REACHED');
    }

    await prisma.userPackageServiceUsage.upsert({
      where: {
        id: usageRecord?.id || undefined
      },
      create: {
        userPackageId,
        serviceId,
        usedCount: 1,
        lastUsedAt: new Date()
      },
      update: {
        usedCount: { increment: 1 },
        lastUsedAt: new Date()
      }
    });

    logger.info(`Package ${userPackageId} applied to booking ${bookingId} for service ${serviceId}`);
    return { success: true, serviceId, discount: 100 };
  }

  async getEligiblePackages(serviceIds) {
    if (!serviceIds || serviceIds.length === 0) {
      return [];
    }

    const packages = await prisma.package.findMany({
      where: {
        isActive: true,
        services: {
          some: {
            serviceId: { in: serviceIds }
          }
        }
      },
      include: {
        services: {
          include: {
            service: true
          }
        }
      },
      orderBy: {
        sortOrder: 'asc'
      }
    });

    return packages;
  }

  async getUserEligiblePackages(userId, serviceIds) {
    if (!serviceIds || serviceIds.length === 0) {
      return [];
    }

    const userPackages = await prisma.userPackage.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
        package: {
          isActive: true,
          services: {
            some: {
              serviceId: { in: serviceIds }
            }
          }
        }
      },
      include: {
        package: {
          include: {
            services: {
              include: {
                service: true
              }
            }
          }
        },
        usages: true
      }
    });

    return userPackages.map(up => ({
      ...up,
      isExpired: new Date(up.expiresAt) < new Date(),
      remainingDays: Math.ceil((new Date(up.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
    }));
  }

  async getAllServices() {
    return prisma.service.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        nameAr: true,
        type: true,
        category: true
      },
      orderBy: { name: 'asc' }
    });
  }

  async getAllSubscriptions(filters = {}) {
    const { packageId, isActive, search } = filters;

    const where = {};

    if (packageId) {
      where.packageId = packageId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { user: { profile: { firstName: { contains: search, mode: 'insensitive' } } } },
        { user: { profile: { lastName: { contains: search, mode: 'insensitive' } } } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const subscriptions = await prisma.userPackage.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            email: true,
            phone: true
          }
        },
        package: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            usageCount: true,
            validityDays: true,
            price: true
          }
        },
        usages: {
          select: {
            serviceId: true,
            usedCount: true,
            lastUsedAt: true
          }
        }
      },
      orderBy: {
        purchasedAt: 'desc'
      }
    });

    // Transform data to include calculated fields
    return subscriptions.map(sub => ({
      id: sub.id,
      userId: sub.userId,
      user: {
        ...sub.user,
        firstName: sub.user.profile?.firstName,
        lastName: sub.user.profile?.lastName,
        fullName: `${sub.user.profile?.firstName || ''} ${sub.user.profile?.lastName || ''}`.trim()
      },
      package: sub.package,
      purchasedAt: sub.purchasedAt,
      expiresAt: sub.expiresAt,
      isActive: sub.isActive,
      isExpired: new Date() > new Date(sub.expiresAt),
      daysRemaining: Math.ceil((new Date(sub.expiresAt) - new Date()) / (1000 * 3600 * 24)),
      totalUsageCount: sub.package.usageCount,
      usedCount: sub.usages.reduce((sum, usage) => sum + usage.usedCount, 0),
      remainingCount: sub.package.usageCount ? sub.package.usageCount - sub.usages.reduce((sum, usage) => sum + usage.usedCount, 0) : null,
      usages: sub.usages
    }));
  }
}

module.exports = new PackageService();
