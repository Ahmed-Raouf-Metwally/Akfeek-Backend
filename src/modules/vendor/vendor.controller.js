const vendorService = require('./vendor.service');
const { registerVendorSchema, updateVendorStatusSchema } = require('./vendor.validation');
const { AppError } = require('../../api/middlewares/error.middleware');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * Vendor Controller
 * Handles HTTP requests for vendor onboarding.
 */
class VendorController {
    /**
     * Public: Register a new vendor
     * POST /api/vendors/register
     */
    register = asyncHandler(async (req, res, next) => {
        // Validate request body
        const validatedData = registerVendorSchema.safeParse(req.body);

        if (!validatedData.success) {
            const issues = validatedData.error.issues || [];
            const errorDetails = issues.map(err => ({
                field: err.path.join('.'),
                message: err.message
            }));
            throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', errorDetails);
        }

        const vendor = await vendorService.registerVendor({
            ...validatedData.data,
            userId: req.user.id
        });

        res.status(201).json({
            success: true,
            message: 'Vendor application submitted successfully',
            messageAr: 'تم تقديم طلب المورد بنجاح',
            data: vendor
        });
    });

    /**
     * Admin: List vendors by status
     * GET /api/admin/vendors
     */
    listVendors = asyncHandler(async (req, res, next) => {
        const status = req.query.status;
        const vendors = await vendorService.getVendorsByStatus(status);

        res.json({
            success: true,
            data: vendors
        });
    });

    /**
     * Admin: Update vendor status
     * PATCH /api/admin/vendors/:id/status
     */
    updateStatus = asyncHandler(async (req, res, next) => {
        const { id } = req.params;

        // Validate status
        const validatedStatus = updateVendorStatusSchema.safeParse(req.body);

        if (!validatedStatus.success) {
            throw new AppError('Invalid status provided', 400, 'VALIDATION_ERROR');
        }

        const vendor = await vendorService.updateStatus(id, validatedStatus.data.status);

        res.json({
            success: true,
            message: 'Vendor status updated',
            messageAr: 'تم تحديث حالة المورد',
            data: vendor
        });
    });
}

module.exports = new VendorController();
