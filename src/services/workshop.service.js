const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');
const { validateWorkingHours } = require('../utils/validateWorkingHours');

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
     * Get workshop linked to certified workshop vendor (by user id)
     * @param {string} userId - Vendor user id
     * @returns {Object|null} Workshop or null if none linked
     */
    async getWorkshopByVendorUserId(userId) {
        const vendorService = require('./vendor.service');
        let profile;
        try {
            profile = await vendorService.getVendorByUserId(userId);
        } catch (e) {
            if (e.statusCode) throw e;
            throw new AppError('Vendor profile not found', 403, 'FORBIDDEN');
        }
        const vendorType = profile.vendorType === undefined ? null : String(profile.vendorType);
        if (vendorType !== 'CERTIFIED_WORKSHOP') {
            throw new AppError('Not a certified workshop vendor', 403, 'FORBIDDEN');
        }
        if (!profile.id) {
            throw new AppError('Vendor profile invalid', 403, 'FORBIDDEN');
        }
        try {
            const workshop = await prisma.certifiedWorkshop.findUnique({
                where: { vendorId: profile.id }
            });
            return workshop;
        } catch (e) {
            if (e.statusCode) throw e;
            if (e.code === 'P2025') return null;
            if (e.code && String(e.code).startsWith('P')) {
                throw new AppError(e.message || 'Database error', 500, 'INTERNAL_ERROR');
            }
            const msg = e.message || '';
            if (msg.includes('Unknown column') || msg.includes('vendorId') || e.meta?.cause) {
                throw new AppError(
                    'Database schema may be outdated. Please run: npx prisma migrate deploy',
                    503,
                    'SCHEMA_OUTDATED'
                );
            }
            throw new AppError('Failed to load workshop', 500, 'INTERNAL_ERROR');
        }
    }

    /**
     * Update workshop by vendor (only their linked workshop)
     */
    async updateWorkshopByVendor(userId, data) {
        const workshop = await this.getWorkshopByVendorUserId(userId);
        if (!workshop) {
            throw new AppError('No workshop linked to your account', 404, 'NOT_FOUND');
        }
        const updated = await prisma.certifiedWorkshop.update({
            where: { id: workshop.id },
            data
        });
        return updated;
    }

    /**
     * Get bookings for vendor's workshop
     */
    async getWorkshopBookingsByVendorUserId(userId, query = {}) {
        const workshop = await this.getWorkshopByVendorUserId(userId);
        if (!workshop) {
            return { list: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
        }
        const page = Math.max(1, parseInt(query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
        const skip = (page - 1) * limit;
        const status = query.status || undefined;

        const where = { workshopId: workshop.id, ...(status && { status }) };

        const [list, total] = await Promise.all([
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
                            profile: { select: { firstName: true, lastName: true } }
                        }
                    },
                    vehicle: {
                        select: {
                            id: true,
                            plateNumber: true,
                            vehicleModel: {
                                select: { name: true, year: true, brand: { select: { name: true } } }
                            }
                        }
                    }
                }
            }),
            prisma.booking.count({ where })
        ]);

        return {
            list,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit))
            }
        };
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
        if (!name || !city || !address || !phone) {
            throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
        }

        const servicesStr = services == null
            ? ''
            : Array.isArray(services)
                ? JSON.stringify(services)
                : String(services);
        if (!servicesStr.trim()) {
            throw new AppError('Services are required', 400, 'VALIDATION_ERROR');
        }

        const lat = latitude != null ? Number(latitude) : NaN;
        const lng = longitude != null ? Number(longitude) : NaN;
        if (Number.isNaN(lat) || Number.isNaN(lng)) {
            throw new AppError('Latitude and longitude are required (should be extracted from locationUrl)', 400, 'VALIDATION_ERROR');
        }

        // Validate working hours if provided
        if (workingHours && typeof workingHours === 'object' && Object.keys(workingHours).length > 0) {
            const validation = validateWorkingHours(workingHours);
            if (!validation.isValid) {
                throw new AppError(
                    `Invalid working hours: ${validation.errors.join(', ')}`,
                    400,
                    'VALIDATION_ERROR'
                );
            }
        }

        const createData = {
            name: String(name).trim(),
            nameAr: nameAr ? String(nameAr).trim() : null,
            description: description ? String(description).trim() : null,
            descriptionAr: descriptionAr ? String(descriptionAr).trim() : null,
            address: String(address).trim(),
            addressAr: addressAr ? String(addressAr).trim() : null,
            city: String(city).trim(),
            cityAr: cityAr ? String(cityAr).trim() : null,
            latitude: lat,
            longitude: lng,
            phone: String(phone).trim(),
            email: email ? String(email).trim() || null : null,
            services: servicesStr.trim(),
            isActive: isActive !== false,
            isVerified: isVerified === true
        };

        if (workingHours && typeof workingHours === 'object' && Object.keys(workingHours).length > 0) {
            createData.workingHours = workingHours;
        }
        if (logo != null && logo !== '') createData.logo = String(logo);
        if (images != null) createData.images = images;
        if (data.vendorId) createData.vendorId = data.vendorId;

        const workshop = await prisma.certifiedWorkshop.create({
            data: createData
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
