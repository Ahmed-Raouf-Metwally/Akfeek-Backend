const prisma = require('../../utils/database/prisma');
const { AppError } = require('../../api/middlewares/error.middleware');
const logger = require('../../utils/logger/logger');

/**
 * Vendor Service
 * Handles business logic for vendor onboarding and management.
 */
class VendorService {
    /**
     * Register a new vendor application
     */
    async registerVendor(vendorData) {
        const { coverageCities, userId, ...rest } = vendorData;

        // Check if user already has a vendor application
        const existingApp = await prisma.vendor.findUnique({
            where: { userId }
        });

        if (existingApp) {
            throw new AppError('You already have a vendor application submitted', 400, 'ALREADY_EXISTS');
        }

        // Check if commercial registration number already exists
        const existingVendor = await prisma.vendor.findFirst({
            where: { commercialRegNo: rest.commercialRegNo }
        });

        if (existingVendor) {
            throw new AppError('Commercial Registration Number already exists', 409, 'ALREADY_EXISTS');
        }

        // Check if email already registered
        const existingEmail = await prisma.vendor.findFirst({
            where: { companyEmail: rest.companyEmail }
        });

        if (existingEmail) {
            throw new AppError('Company email already exists', 409, 'ALREADY_EXISTS');
        }

        try {
            // Create vendor and cities in a transaction
            const vendor = await prisma.$transaction(async (tx) => {
                const newVendor = await tx.vendor.create({
                    data: {
                        ...rest,
                        userId,
                        status: 'PENDING',
                        coverageCities: {
                            create: coverageCities.map((cityName) => ({ cityName }))
                        }
                    },
                    include: {
                        coverageCities: true
                    }
                });

                // Generate a system-generated supplierId (optional but good practice)
                const supplierId = `SUP-${newVendor.id.slice(0, 8).toUpperCase()}`;
                return await tx.vendor.update({
                    where: { id: newVendor.id },
                    data: { supplierId },
                    include: { coverageCities: true }
                });
            });

            logger.info(`New vendor registered: ${vendor.legalName} (ID: ${vendor.id})`);
            return vendor;
        } catch (error) {
            logger.error('Failed to register vendor:', error);
            throw error;
        }
    }

    /**
     * Get vendors by status (Admin)
     */
    async getVendorsByStatus(status) {
        return await prisma.vendor.findMany({
            where: status ? { status } : {},
            include: {
                coverageCities: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Update vendor registration status
     */
    async updateStatus(id, status) {
        const vendor = await prisma.vendor.findUnique({
            where: { id },
            include: { coverageCities: true }
        });

        if (!vendor) {
            throw new AppError('Vendor not found', 404, 'NOT_FOUND');
        }

        try {
            const updatedVendor = await prisma.$transaction(async (tx) => {
                // 1. Update the application status
                const updated = await tx.vendor.update({
                    where: { id },
                    data: { status },
                    include: { coverageCities: true }
                });

                // 2. If approved, upgrade the user and create their operating profile
                if (status === 'APPROVED' && vendor.userId) {
                    // Upgrade user role to VENDOR
                    await tx.user.update({
                        where: { id: vendor.userId },
                        data: { role: 'VENDOR' }
                    });

                    // Check if profile already exists to avoid duplicates
                    const existingProfile = await tx.vendorProfile.findUnique({
                        where: { userId: vendor.userId }
                    });

                    if (!existingProfile) {
                        await tx.vendorProfile.create({
                            data: {
                                userId: vendor.userId,
                                businessName: vendor.tradeName || vendor.legalName,
                                businessNameAr: vendor.legalName, // Fallback or handle translations
                                contactEmail: vendor.companyEmail,
                                contactPhone: vendor.companyPhone,
                                address: vendor.addressLine1,
                                city: vendor.city,
                                country: vendor.country,
                                commercialLicense: vendor.commercialRegNo,
                                taxNumber: vendor.vatNumber,
                                status: 'ACTIVE',
                                isVerified: true,
                                verifiedAt: new Date()
                            }
                        });
                    }
                }

                return updated;
            });

            logger.info(`Vendor application ${id} status updated to: ${status}`);
            return updatedVendor;
        } catch (error) {
            logger.error(`Failed to update vendor status for ${id}:`, error);
            throw error;
        }
    }
}

module.exports = new VendorService();
