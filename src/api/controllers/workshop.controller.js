const workshopService = require('../../services/workshop.service');
const { parseGoogleMapsUrl } = require('../../utils/mapsParser');

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
            const payload = { ...req.body };

            console.log('🔍 Received payload:', JSON.stringify(payload, null, 2));

            // If locationUrl is provided, try to extract coordinates
            if (payload.locationUrl) {
                console.log('📍 Parsing locationUrl:', payload.locationUrl);
                const coords = await parseGoogleMapsUrl(payload.locationUrl);
                console.log('📍 Extracted coords:', coords);

                if (coords && coords.latitude && coords.longitude) {
                    payload.latitude = coords.latitude;
                    payload.longitude = coords.longitude;
                } else {
                    // If URL provided but parsing failed
                    throw new Error('Invalid Google Maps URL. Could not extract coordinates.');
                }

                // Remove locationUrl from payload as it's not in schema
                delete payload.locationUrl;
            } else {
                // If it was empty string, just remove it
                delete payload.locationUrl;
            }

            // Check if we have coordinates (either from URL or raw payload)
            if (!payload.latitude || !payload.longitude) {
                throw new Error('Location is required. Please provide a valid Google Maps URL.');
            }

            console.log('✅ Final payload to service:', JSON.stringify(payload, null, 2));

            const workshop = await workshopService.createWorkshop(payload);

            res.status(201).json({
                success: true,
                message: 'Certified workshop created successfully',
                messageAr: 'تم إنشاء الورشة المعتمدة بنجاح',
                data: workshop
            });
        } catch (error) {
            console.error('❌ Error creating workshop:', error.message);
            next(error);
        }
    }

    /**
     * Update certified workshop (Admin)
     * PUT /api/admin/workshops/:id
     */
    async updateWorkshop(req, res, next) {
        try {
            const payload = { ...req.body };

            // If locationUrl is provided, extract and update coordinates
            if (payload.locationUrl) {
                const coords = await parseGoogleMapsUrl(payload.locationUrl);
                if (coords && coords.latitude && coords.longitude) {
                    payload.latitude = coords.latitude;
                    payload.longitude = coords.longitude;
                } else {
                    throw new Error('Invalid Google Maps URL. Could not extract coordinates.');
                }
                // Remove locationUrl from payload as it's not in schema
                delete payload.locationUrl;
            } else if (payload.hasOwnProperty('locationUrl')) {
                // If specifically set to empty/null but passed, remove it
                delete payload.locationUrl;
            }

            const workshop = await workshopService.updateWorkshop(req.params.id, payload);

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

    /**
     * Get current vendor's workshop (VENDOR with CERTIFIED_WORKSHOP only)
     * GET /api/workshops/profile/me
     */
    async getMyWorkshop(req, res, next) {
        try {
            const workshop = await workshopService.getWorkshopByVendorUserId(req.user.id);
            if (!workshop) {
                return res.status(404).json({
                    success: false,
                    error: 'No workshop linked to your account',
                    errorAr: 'لا توجد ورشة مرتبطة بحسابك. تواصل مع الإدارة لربط ورشتك.'
                });
            }
            res.json({ success: true, data: workshop });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update current vendor's workshop
     * PUT /api/workshops/profile/me
     */
    async updateMyWorkshop(req, res, next) {
        try {
            const payload = { ...req.body };
            if (payload.locationUrl) {
                const coords = await parseGoogleMapsUrl(payload.locationUrl);
                if (coords?.latitude && coords?.longitude) {
                    payload.latitude = coords.latitude;
                    payload.longitude = coords.longitude;
                }
                delete payload.locationUrl;
            }
            const workshop = await workshopService.updateWorkshopByVendor(req.user.id, payload);
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
     * Get bookings for current vendor's workshop
     * GET /api/workshops/profile/me/bookings
     */
    async getMyWorkshopBookings(req, res, next) {
        try {
            const result = await workshopService.getWorkshopBookingsByVendorUserId(req.user.id, req.query);
            res.json({
                success: true,
                data: result.list,
                pagination: result.pagination
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new WorkshopController();
