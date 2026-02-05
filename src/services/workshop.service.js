const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');

/**
 * Workshop Service
 * Business logic for certified workshop management
 */
class WorkshopService {
    /**
     * Get all active and verified workshops for customers
     */
    async getAllWorkshops(filters = {}) {
        const { city, search, isActive = true, isVerified = true } = filters;

        const where = {
            isActive,
            isVerified
        };

        if (city) {
            where.city = city;
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { nameAr: { contains: search } },
                { city: { contains: search } },
                { cityAr: { contains: search } }
            ];
        }

        const workshops = await prisma.certifiedWorkshop.findMany({
            where,
            orderBy: [
                { averageRating: 'desc' },
                { totalBookings: 'desc' }
            ],
            select: {
                id: true,
                name: true,
                nameAr: true,
                description: true,
                descriptionAr: true,
                city: true,
                cityAr: true,
                address: true,
                addressAr: true,
                latitude: true,
                longitude: true,
                phone: true,
                workingHours: true,
                services: true,
                averageRating: true,
                totalReviews: true,
                totalBookings: true,
                logo: true,
                images: true,
                isVerified: true
            }
        });

        return workshops;
    }

    /**
     * Get all workshops for admin (no filters by default)
     */
    async getAllWorkshopsAdmin(filters = {}) {
        const { city, search, isActive, isVerified } = filters;

        const where = {};

        if (city) {
            where.city = city;
        }

        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
        }

        if (isVerified !== undefined) {
            where.isVerified = isVerified === 'true';
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { nameAr: { contains: search } },
                { city: { contains: search } }
            ];
        }

        const workshops = await prisma.certifiedWorkshop.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        return workshops;
    }

    /**
     * Get workshop by ID
     */
    async getWorkshopById(id) {
        const workshop = await prisma.certifiedWorkshop.findUnique({
            where: { id }
        });

        if (!workshop) {
            throw new AppError('Workshop not found', 404, 'NOT_FOUND');
        }

        return workshop;
    }

    /**
     * Create new certified workshop
     */
    async createWorkshop(data) {
        const {
            name,
            nameAr,
            description,
            descriptionAr,
            address,
            addressAr,
            city,
            cityAr,
            latitude,
            longitude,
            phone,
            email,
            workingHours,
            services,
            logo,
            images,
            isActive,
            isVerified
        } = data;

        // Validate required fields
        if (!name || !city || !address || !phone || !services) {
            throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
        }

        // Validate that either location coordinates are provided
        if (!latitude || !longitude) {
            throw new AppError('Latitude and longitude are required (should be extracted from locationUrl)', 400, 'VALIDATION_ERROR');
        }

        const workshop = await prisma.certifiedWorkshop.create({
            data: {
                name,
                nameAr,
                description,
                descriptionAr,
                address,
                addressAr,
                city,
                cityAr,
                latitude,
                longitude,
                phone,
                email,
                workingHours,
                services,
                logo,
                images,
                isActive: isActive ?? true,
                isVerified: isVerified ?? false
            }
        });

        return workshop;
    }

    /**
     * Update workshop
     */
    async updateWorkshop(id, data) {
        // Check if workshop exists
        await this.getWorkshopById(id);

        const workshop = await prisma.certifiedWorkshop.update({
            where: { id },
            data
        });

        return workshop;
    }

    /**
     * Delete workshop
     */
    async deleteWorkshop(id) {
        // Check if workshop exists
        await this.getWorkshopById(id);

        // Check if workshop has active bookings
        const activeBookings = await prisma.booking.count({
            where: {
                workshopId: id,
                status: {
                    in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS']
                }
            }
        });

        if (activeBookings > 0) {
            throw new AppError('Cannot delete workshop with active bookings', 400, 'ACTIVE_BOOKINGS');
        }

        await prisma.certifiedWorkshop.delete({
            where: { id }
        });
    }

    /**
     * Toggle verification status
     */
    async toggleVerification(id, isVerified) {
        // Check if workshop exists
        await this.getWorkshopById(id);

        const workshop = await prisma.certifiedWorkshop.update({
            where: { id },
            data: {
                isVerified,
                verifiedAt: isVerified ? new Date() : null
            }
        });

        return workshop;
    }
}

module.exports = new WorkshopService();
