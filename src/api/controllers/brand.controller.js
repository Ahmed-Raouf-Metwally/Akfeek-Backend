const prisma = require('../../utils/database/prisma');
const logger = require('../../utils/logger/logger');

class BrandController {
    /**
     * Get all brands
     * GET /api/brands
     */
    async getAllBrands(req, res, next) {
        try {
            const { includeModels = 'false', activeOnly = 'true' } = req.query;

            const where = activeOnly === 'true' ? { isActive: true } : {};

            const brands = await prisma.vehicleBrand.findMany({
                where,
                include: {
                    models: includeModels === 'true' ? {
                        where: { isActive: true },
                        orderBy: [
                            { year: 'desc' },
                            { name: 'asc' }
                        ]
                    } : false,
                    _count: {
                        select: { models: true }
                    }
                },
                orderBy: { name: 'asc' }
            });

            res.json({
                success: true,
                data: brands,
                meta: {
                    total: brands.length
                }
            });
        } catch (error) {
            logger.error('getAllBrands error:', error);
            next(error);
        }
    }

    /**
     * Get brand by ID with all models
     * GET /api/brands/:id
     */
    async getBrandById(req, res, next) {
        try {
            const { id } = req.params;

            const brand = await prisma.vehicleBrand.findUnique({
                where: { id },
                include: {
                    models: {
                        where: { isActive: true },
                        orderBy: [
                            { year: 'desc' },
                            { name: 'asc' }
                        ]
                    },
                    _count: {
                        select: { models: true }
                    }
                }
            });

            if (!brand) {
                return res.status(404).json({
                    success: false,
                    error: 'Brand not found',
                    errorAr: 'الماركة غير موجودة',
                    code: 'BRAND_NOT_FOUND'
                });
            }

            res.json({
                success: true,
                data: brand
            });
        } catch (error) {
            logger.error('getBrandById error:', error);
            next(error);
        }
    }

    /**
     * Create new brand (Admin only)
     * POST /api/brands
     */
    async createBrand(req, res, next) {
        try {
            const { name, nameAr, logo } = req.body;

            // Validation
            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Brand name is required',
                    errorAr: 'اسم الماركة مطلوب',
                    code: 'VALIDATION_ERROR'
                });
            }

            // Check if brand already exists
            const existing = await prisma.vehicleBrand.findUnique({
                where: { name }
            });

            if (existing) {
                return res.status(409).json({
                    success: false,
                    error: 'Brand already exists',
                    errorAr: 'الماركة موجودة بالفعل',
                    code: 'BRAND_EXISTS'
                });
            }

            const brand = await prisma.vehicleBrand.create({
                data: {
                    name,
                    nameAr,
                    logo
                }
            });

            logger.info(`Brand created: ${brand.id} (${brand.name})`);

            res.status(201).json({
                success: true,
                data: brand,
                message: 'Brand created successfully',
                messageAr: 'تم إنشاء الماركة بنجاح'
            });
        } catch (error) {
            logger.error('createBrand error:', error);
            next(error);
        }
    }

    /**
     * Update brand (Admin only)
     * PATCH /api/brands/:id
     */
    async updateBrand(req, res, next) {
        try {
            const { id } = req.params;
            const { name, nameAr, logo, isActive } = req.body;

            // Check if brand exists
            const existing = await prisma.vehicleBrand.findUnique({
                where: { id }
            });

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Brand not found',
                    errorAr: 'الماركة غير موجودة',
                    code: 'BRAND_NOT_FOUND'
                });
            }

            // Check for duplicate name
            if (name && name !== existing.name) {
                const duplicate = await prisma.vehicleBrand.findUnique({
                    where: { name }
                });

                if (duplicate) {
                    return res.status(409).json({
                        success: false,
                        error: 'Brand name already exists',
                        errorAr: 'اسم الماركة موجود بالفعل',
                        code: 'BRAND_EXISTS'
                    });
                }
            }

            const brand = await prisma.vehicleBrand.update({
                where: { id },
                data: {
                    ...(name && { name }),
                    ...(nameAr !== undefined && { nameAr }),
                    ...(logo !== undefined && { logo }),
                    ...(isActive !== undefined && { isActive })
                }
            });

            logger.info(`Brand updated: ${brand.id} (${brand.name})`);

            res.json({
                success: true,
                data: brand,
                message: 'Brand updated successfully',
                messageAr: 'تم تحديث الماركة بنجاح'
            });
        } catch (error) {
            logger.error('updateBrand error:', error);
            next(error);
        }
    }

    /**
     * Delete brand (Admin only)
     * DELETE /api/brands/:id
     * Note: This is a soft delete (sets isActive = false) by default
     */
    async deleteBrand(req, res, next) {
        try {
            const { id } = req.params;
            const { hardDelete = 'false' } = req.query;

            // Check if brand exists
            const existing = await prisma.vehicleBrand.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: { models: true }
                    }
                }
            });

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Brand not found',
                    errorAr: 'الماركة غير موجودة',
                    code: 'BRAND_NOT_FOUND'
                });
            }

            if (hardDelete === 'true') {
                // Hard delete - will cascade to models
                await prisma.vehicleBrand.delete({
                    where: { id }
                });

                logger.warn(`Brand hard deleted: ${id} (${existing.name}) - ${existing._count.models} models removed`);

                res.json({
                    success: true,
                    message: 'Brand permanently deleted',
                    messageAr: 'تم حذف الماركة نهائياً'
                });
            } else {
                // Soft delete
                const brand = await prisma.vehicleBrand.update({
                    where: { id },
                    data: { isActive: false }
                });

                logger.info(`Brand soft deleted: ${id} (${brand.name})`);

                res.json({
                    success: true,
                    data: brand,
                    message: 'Brand deactivated successfully',
                    messageAr: 'تم تعطيل الماركة بنجاح'
                });
            }
        } catch (error) {
            logger.error('deleteBrand error:', error);
            next(error);
        }
    }
}

module.exports = new BrandController();
