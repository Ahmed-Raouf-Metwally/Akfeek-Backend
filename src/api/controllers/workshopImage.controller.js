const workshopService = require('../../services/workshop.service');
const { upload, deleteFile, getFileUrl } = require('../../utils/imageUpload');
const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Workshop Image Controller
 * Handles image uploads for workshops
 */
class WorkshopImageController {
    /**
     * Upload workshop logo
     * POST /api/workshops/:id/logo
     */
    async uploadLogo(req, res, next) {
        try {
            const { id: workshopId } = req.params;

            if (!req.file) {
                throw new AppError('No file uploaded', 400, 'VALIDATION_ERROR');
            }

            // Get workshop
            const workshop = await prisma.certifiedWorkshop.findUnique({
                where: { id: workshopId }
            });

            if (!workshop) {
                // Delete uploaded file
                deleteFile(req.file.path);
                throw new AppError('Workshop not found', 404, 'NOT_FOUND');
            }

            // Delete old logo if exists
            if (workshop.logo) {
                const oldLogoPath = workshop.logo.replace('/uploads/workshops/', '');
                deleteFile(`uploads/workshops/${oldLogoPath}`);
            }

            // Update workshop with new logo
            const logoUrl = getFileUrl(`${workshopId}/${req.file.filename}`);
            const updated = await prisma.certifiedWorkshop.update({
                where: { id: workshopId },
                data: { logo: logoUrl }
            });

            res.json({
                success: true,
                message: 'Logo uploaded successfully',
                messageAr: 'تم رفع الشعار بنجاح',
                data: {
                    logo: updated.logo
                }
            });
        } catch (error) {
            // Clean up uploaded file on error
            if (req.file) {
                deleteFile(req.file.path);
            }
            next(error);
        }
    }

    /**
     * Upload workshop images
     * POST /api/workshops/:id/images
     */
    async uploadImages(req, res, next) {
        try {
            const { id: workshopId } = req.params;

            if (!req.files || req.files.length === 0) {
                throw new AppError('No files uploaded', 400, 'VALIDATION_ERROR');
            }

            // Get workshop
            const workshop = await prisma.certifiedWorkshop.findUnique({
                where: { id: workshopId }
            });

            if (!workshop) {
                // Delete uploaded files
                req.files.forEach(file => deleteFile(file.path));
                throw new AppError('Workshop not found', 404, 'NOT_FOUND');
            }

            // Get existing images
            const existingImages = workshop.images ? JSON.parse(JSON.stringify(workshop.images)) : [];

            // Add new images
            const newImages = req.files.map(file =>
                getFileUrl(`${workshopId}/${file.filename}`)
            );

            const allImages = [...existingImages, ...newImages];

            // Limit to 10 images
            if (allImages.length > 10) {
                // Delete uploaded files
                req.files.forEach(file => deleteFile(file.path));
                throw new AppError('Maximum 10 images allowed per workshop', 400, 'LIMIT_EXCEEDED');
            }

            // Update workshop
            const updated = await prisma.certifiedWorkshop.update({
                where: { id: workshopId },
                data: { images: allImages }
            });

            res.json({
                success: true,
                message: `${newImages.length} image(s) uploaded successfully`,
                messageAr: `تم رفع ${newImages.length} صورة بنجاح`,
                data: {
                    images: updated.images,
                    newImages
                }
            });
        } catch (error) {
            // Clean up uploaded files on error
            if (req.files) {
                req.files.forEach(file => deleteFile(file.path));
            }
            next(error);
        }
    }

    /**
     * Delete workshop image
     * DELETE /api/workshops/:id/images/:imageIndex
     */
    async deleteImage(req, res, next) {
        try {
            const { id: workshopId, imageIndex } = req.params;
            const index = parseInt(imageIndex);

            // Get workshop
            const workshop = await prisma.certifiedWorkshop.findUnique({
                where: { id: workshopId }
            });

            if (!workshop) {
                throw new AppError('Workshop not found', 404, 'NOT_FOUND');
            }

            const images = workshop.images ? JSON.parse(JSON.stringify(workshop.images)) : [];

            if (index < 0 || index >= images.length) {
                throw new AppError('Invalid image index', 400, 'VALIDATION_ERROR');
            }

            // Get image URL and delete file
            const imageUrl = images[index];
            const imagePath = imageUrl.replace('/uploads/workshops/', '');
            deleteFile(`uploads/workshops/${imagePath}`);

            // Remove from array
            images.splice(index, 1);

            // Update workshop
            const updated = await prisma.certifiedWorkshop.update({
                where: { id: workshopId },
                data: { images: images.length > 0 ? images : null }
            });

            res.json({
                success: true,
                message: 'Image deleted successfully',
                messageAr: 'تم حذف الصورة بنجاح',
                data: {
                    images: updated.images
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete workshop logo
     * DELETE /api/workshops/:id/logo
     */
    async deleteLogo(req, res, next) {
        try {
            const { id: workshopId } = req.params;

            // Get workshop
            const workshop = await prisma.certifiedWorkshop.findUnique({
                where: { id: workshopId }
            });

            if (!workshop) {
                throw new AppError('Workshop not found', 404, 'NOT_FOUND');
            }

            if (!workshop.logo) {
                throw new AppError('Workshop has no logo', 400, 'VALIDATION_ERROR');
            }

            // Delete file
            const logoPath = workshop.logo.replace('/uploads/workshops/', '');
            deleteFile(`uploads/workshops/${logoPath}`);

            // Update workshop
            await prisma.certifiedWorkshop.update({
                where: { id: workshopId },
                data: { logo: null }
            });

            res.json({
                success: true,
                message: 'Logo deleted successfully',
                messageAr: 'تم حذف الشعار بنجاح'
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new WorkshopImageController();
