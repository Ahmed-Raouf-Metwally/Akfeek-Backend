const workshopService = require('../../services/workshop.service');

/**
 * Certified Workshop Controller
 * Handles requests for certified workshop management
 */
class WorkshopController {
    /**
     * Get all certified workshops (Customer)
     * GET /api/workshops
     */
    async getAllWorkshops(req, res, next) {
        try {
            const { city, search, isActive = true, isVerified = true } = req.query;
            const workshops = await workshopService.getAllWorkshops({
                city,
                search,
                isActive: isActive === 'true',
                isVerified: isVerified === 'true'
            });

            res.json({
                success: true,
                data: workshops
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get workshop by ID (Customer)
     * GET /api/workshops/:id
     */
    async getWorkshopById(req, res, next) {
        try {
            const workshop = await workshopService.getWorkshopById(req.params.id);

            res.json({
                success: true,
                data: workshop
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all workshops for admin (Admin)
     * GET /api/admin/workshops
     */
    async getAllWorkshopsAdmin(req, res, next) {
        try {
            const { city, search, isActive, isVerified } = req.query;
            const workshops = await workshopService.getAllWorkshopsAdmin({
                city,
                search,
                isActive,
                isVerified
            });

            res.json({
                success: true,
                data: workshops
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create certified workshop (Admin)
     * POST /api/admin/workshops
     */
    async createWorkshop(req, res, next) {
        try {
            const workshop = await workshopService.createWorkshop(req.body);

            res.status(201).json({
                success: true,
                message: 'Certified workshop created successfully',
                messageAr: 'تم إنشاء الورشة المعتمدة بنجاح',
                data: workshop
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update certified workshop (Admin)
     * PUT /api/admin/workshops/:id
     */
    async updateWorkshop(req, res, next) {
        try {
            const workshop = await workshopService.updateWorkshop(req.params.id, req.body);

            res.json({
                success: true,
                message: 'Workshop updated successfully',
                messageAr: 'تم تحديث الورشة بنجاح',
                data: workshop
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete certified workshop (Admin)
     * DELETE /api/admin/workshops/:id
     */
    async deleteWorkshop(req, res, next) {
        try {
            await workshopService.deleteWorkshop(req.params.id);

            res.json({
                success: true,
                message: 'Workshop deleted successfully',
                messageAr: 'تم حذف الورشة بنجاح'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Verify/Unverify workshop (Admin)
     * PATCH /api/admin/workshops/:id/verify
     */
    async toggleVerification(req, res, next) {
        try {
            const { isVerified } = req.body;
            const workshop = await workshopService.toggleVerification(req.params.id, isVerified);

            res.json({
                success: true,
                message: isVerified ? 'Workshop verified successfully' : 'Workshop unverified',
                messageAr: isVerified ? 'تم التحقق من الورشة بنجاح' : 'تم إلغاء التحقق من الورشة',
                data: workshop
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new WorkshopController();
