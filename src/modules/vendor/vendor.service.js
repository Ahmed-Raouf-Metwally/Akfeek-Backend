const prisma = require('../../utils/database/prisma');
const { AppError } = require('../../api/middlewares/error.middleware');
const logger = require('../../utils/logger/logger');

/**
 * ربط mainService بنوع الفيندور (vendorType) عند عدم وجود vendorType صريح
 * @param {string} vendorType - القيمة المحددة من الفيندور
 * @param {string} mainService - الخدمة الرئيسية كـ string
 * @returns {string} - أحد قيم: AUTO_PARTS | COMPREHENSIVE_CARE | CERTIFIED_WORKSHOP | CAR_WASH
 */
function resolveVendorType(vendorType, mainService) {
    const VALID_TYPES = ['AUTO_PARTS', 'COMPREHENSIVE_CARE', 'CERTIFIED_WORKSHOP', 'CAR_WASH'];
    if (vendorType && VALID_TYPES.includes(vendorType)) return vendorType;

    // Fallback: استنتاج النوع من mainService إذا لم يُحدَّد صراحةً
    const svc = (mainService || '').toLowerCase();
    if (svc.includes('wash') || svc.includes('غسيل') || svc.includes('cleaning')) return 'CAR_WASH';
    if (svc.includes('workshop') || svc.includes('ورشة') || svc.includes('certified')) return 'CERTIFIED_WORKSHOP';
    if (svc.includes('comprehensive') || svc.includes('عناية') || svc.includes('care')) return 'COMPREHENSIVE_CARE';
    return 'AUTO_PARTS'; // default
}

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
                        // ✅ تحديد vendorType الصحيح من طلب الـ Onboarding
                        const resolvedVendorType = resolveVendorType(
                            vendor.vendorType,
                            vendor.mainService
                        );

                        const vendorProfile = await tx.vendorProfile.create({
                            data: {
                                userId: vendor.userId,
                                vendorType: resolvedVendorType,
                                businessName: vendor.tradeName || vendor.legalName,
                                businessNameAr: vendor.legalName,
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

                        // ✅ إنشاء سجل ورشة تلقائياً لو النوع CERTIFIED_WORKSHOP
                        if (resolvedVendorType === 'CERTIFIED_WORKSHOP') {
                            await tx.certifiedWorkshop.create({
                                data: {
                                    vendorId: vendorProfile.id,
                                    name: vendor.tradeName || vendor.legalName,
                                    nameAr: vendor.legalName,
                                    address: vendor.addressLine1,
                                    city: vendor.city,
                                    phone: vendor.companyPhone,
                                    email: vendor.companyEmail,
                                    services: vendor.mainService || 'General Maintenance',
                                    isActive: true,
                                    isVerified: true,
                                    verifiedAt: new Date(),
                                    latitude: 0, // قيم افتراضية يتم تحديثها لاحقاً
                                    longitude: 0
                                }
                            });
                            logger.info(`CertifiedWorkshop automatically created for vendorProfileId=${vendorProfile.id}`);
                        }

                        logger.info(`VendorProfile created for userId=${vendor.userId} with vendorType=${resolvedVendorType}`);
                    }
                }

                return updated;
            });

            // ✅ إرسال إشعار للفيندور عند تحديث الحالة
            if (vendor.userId) {
                try {
                    const notificationData = {
                        userId: vendor.userId,
                        type: 'SYSTEM',
                        title: status === 'APPROVED'
                            ? 'تم قبول طلبك كفيندور'
                            : status === 'REJECTED'
                                ? 'تم رفض طلبك كفيندور'
                                : 'تم تحديث حالة حسابك',
                        titleEn: status === 'APPROVED'
                            ? 'Your vendor application has been approved'
                            : status === 'REJECTED'
                                ? 'Your vendor application has been rejected'
                                : 'Your vendor account status has been updated',
                        message: status === 'APPROVED'
                            ? 'مبروك! تم قبول طلبك. يمكنك الآن الدخول إلى لوحة التحكم الخاصة بك.'
                            : status === 'REJECTED'
                                ? 'نأسف، تم رفض طلبك. يمكنك التواصل مع الدعم لمزيد من المعلومات.'
                                : `تم تغيير حالة حسابك إلى ${status}`,
                        isRead: false,
                    };

                    await tx.notification.create({ data: notificationData });

                    // Socket.io real-time notification (best-effort)
                    try {
                        const { emitNotification } = require('../../socket');
                        emitNotification(vendor.userId, notificationData);
                    } catch (_socketErr) {
                        // Socket may not be initialized in all envs — log only
                        logger.warn('Socket not available for vendor notification');
                    }

                    logger.info(`Notification sent to vendor userId=${vendor.userId} for status=${status}`);
                } catch (notifErr) {
                    // لا نوقف العملية لو الإشعار فشل
                    logger.warn(`Failed to create notification for vendor ${id}: ${notifErr.message}`);
                }
            }

            logger.info(`Vendor application ${id} status updated to: ${status}`);
            return updatedVendor;
        } catch (error) {
            logger.error(`Failed to update vendor status for ${id}:`, error);
            throw error;
        }
    }
}

module.exports = new VendorService();
