const prisma = require('../../utils/database/prisma');
const logger = require('../../utils/logger/logger');

class ModelController {
    /**
     * Get all models with optional filters
     * GET /api/models?brandId=xxx&year=2023&size=MEDIUM
     */
    async getAllModels(req, res, next) {
        try {
            const { brandId, year, size, activeOnly = 'true' } = req.query;

            const where = {};

            if (activeOnly === 'true') {
                where.isActive = true;
            }

            if (brandId) {
                where.brandId = brandId;
            }

            if (year) {
                where.year = parseInt(year);
            }

            if (size) {
                where.size = size;
            }

            const models = await prisma.vehicleModel.findMany({
                where,
                include: {
                    brand: {
                        select: {
                            id: true,
                            name: true,
                            nameAr: true,
                            logo: true
                        }
                    },
                    _count: {
                        select: {
                            userVehicles: true
                        }
                    }
                },
                orderBy: [
                    { year: 'desc' },
                    { name: 'asc' }
                ]
            });

            res.json({
                success: true,
                data: models,
                meta: {
                    total: models.length,
                    filters: { brandId, year, size }
                }
            });
        } catch (error) {
            logger.error('getAllModels error:', error);
            next(error);
        }
    }

    /**
     * Get model by ID
     * GET /api/models/:id
     */
    async getModelById(req, res, next) {
        try {
            const { id } = req.params;

            const model = await prisma.vehicleModel.findUnique({
                where: { id },
                include: {
                    brand: true,
                    _count: {
                        select: {
                            userVehicles: true,
                            compatibleAutoParts: true
                        }
                    }
                }
            });

            if (!model) {
                return res.status(404).json({
                    success: false,
                    error: 'Model not found',
                    errorAr: 'الموديل غير موجود',
                    code: 'MODEL_NOT_FOUND'
                });
            }

            res.json({
                success: true,
                data: model
            });
        } catch (error) {
            logger.error('getModelById error:', error);
            next(error);
        }
    }

    /**
     * Create new model (Admin only)
     * POST /api/models
     */
    async createModel(req, res, next) {
        try {
            const { brandId, name, nameAr, year, size, imageUrl } = req.body;

            // Validation
            if (!brandId || !name || !year || !size) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: brandId, name, year, size',
                    errorAr: 'حقول مطلوبة مفقودة: الماركة، الاسم، السنة، الحجم',
                    code: 'VALIDATION_ERROR'
                });
            }

            // Check if brand exists
            const brand = await prisma.vehicleBrand.findUnique({
                where: { id: brandId }
            });

            if (!brand) {
                return res.status(404).json({
                    success: false,
                    error: 'Brand not found',
                    errorAr: 'الماركة غير موجودة',
                    code: 'BRAND_NOT_FOUND'
                });
            }

            // Check if model already exists
            const existing = await prisma.vehicleModel.findFirst({
                where: {
                    brandId,
                    name,
                    year: parseInt(year)
                }
            });

            if (existing) {
                return res.status(409).json({
                    success: false,
                    error: 'Model already exists for this brand and year',
                    errorAr: 'الموديل موجود بالفعل لهذه الماركة والسنة',
                    code: 'MODEL_EXISTS'
                });
            }

            const model = await prisma.vehicleModel.create({
                data: {
                    brandId,
                    name,
                    nameAr,
                    year: parseInt(year),
                    size,
                    imageUrl
                },
                include: {
                    brand: true
                }
            });

            logger.info(`Model created: ${model.id} (${brand.name} ${model.name} ${model.year})`);

            res.status(201).json({
                success: true,
                data: model,
                message: 'Model created successfully',
                messageAr: 'تم إنشاء الموديل بنجاح'
            });
        } catch (error) {
            logger.error('createModel error:', error);
            next(error);
        }
    }

    /**
     * Update model (Admin only)
     * PATCH /api/models/:id
     */
    async updateModel(req, res, next) {
        try {
            const { id } = req.params;
            const { brandId, name, nameAr, year, size, imageUrl, isActive } = req.body;

            // Check if model exists
            const existing = await prisma.vehicleModel.findUnique({
                where: { id }
            });

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Model not found',
                    errorAr: 'الموديل غير موجود',
                    code: 'MODEL_NOT_FOUND'
                });
            }

            // If brandId is being changed, check if new brand exists
            if (brandId && brandId !== existing.brandId) {
                const brand = await prisma.vehicleBrand.findUnique({
                    where: { id: brandId }
                });

                if (!brand) {
                    return res.status(404).json({
                        success: false,
                        error: 'New brand not found',
                        errorAr: 'الماركة الجديدة غير موجودة',
                        code: 'BRAND_NOT_FOUND'
                    });
                }
            }

            // Check for duplicate
            if (name || year || brandId) {
                const duplicate = await prisma.vehicleModel.findFirst({
                    where: {
                        id: { not: id },
                        brandId: brandId || existing.brandId,
                        name: name || existing.name,
                        year: year ? parseInt(year) : existing.year
                    }
                });

                if (duplicate) {
                    return res.status(409).json({
                        success: false,
                        error: 'Model with these details already exists',
                        errorAr: 'الموديل بهذه التفاصيل موجود بالفعل',
                        code: 'MODEL_EXISTS'
                    });
                }
            }

            const model = await prisma.vehicleModel.update({
                where: { id },
                data: {
                    ...(brandId && { brandId }),
                    ...(name && { name }),
                    ...(nameAr !== undefined && { nameAr }),
                    ...(year && { year: parseInt(year) }),
                    ...(size && { size }),
                    ...(imageUrl !== undefined && { imageUrl }),
                    ...(isActive !== undefined && { isActive })
                },
                include: {
                    brand: true
                }
            });

            logger.info(`Model updated: ${model.id}`);

            res.json({
                success: true,
                data: model,
                message: 'Model updated successfully',
                messageAr: 'تم تحديث الموديل بنجاح'
            });
        } catch (error) {
            logger.error('updateModel error:', error);
            next(error);
        }
    }

    /**
     * Delete model (Admin only)
     * DELETE /api/models/:id
     */
    async deleteModel(req, res, next) {
        try {
            const { id } = req.params;
            const { hardDelete = 'false' } = req.query;

            // Check if model exists
            const existing = await prisma.vehicleModel.findUnique({
                where: { id },
                include: {
                    brand: true,
                    _count: {
                        select: { userVehicles: true }
                    }
                }
            });

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: 'Model not found',
                    errorAr: 'الموديل غير موجود',
                    code: 'MODEL_NOT_FOUND'
                });
            }

            if (hardDelete === 'true') {
                // Hard delete
                await prisma.vehicleModel.delete({
                    where: { id }
                });

                logger.warn(
                    `Model hard deleted: ${id} (${existing.brand.name} ${existing.name} ${existing.year}) - ` +
                    `${existing._count.userVehicles} user vehicles will be orphaned`
                );

                res.json({
                    success: true,
                    message: 'Model permanently deleted',
                    messageAr: 'تم حذف الموديل نهائياً'
                });
            } else {
                // Soft delete
                const model = await prisma.vehicleModel.update({
                    where: { id },
                    data: { isActive: false },
                    include: {
                        brand: true
                    }
                });

                logger.info(`Model soft deleted: ${id} (${model.brand.name} ${model.name} ${model.year})`);

                res.json({
                    success: true,
                    data: model,
                    message: 'Model deactivated successfully',
                    messageAr: 'تم تعطيل الموديل بنجاح'
                });
            }
        } catch (error) {
            logger.error('deleteModel error:', error);
            next(error);
        }
    }
}

module.exports = new ModelController();
