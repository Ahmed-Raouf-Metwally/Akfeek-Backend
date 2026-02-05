const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AppError } = require('../api/middlewares/error.middleware');

/**
 * Image Upload Configuration
 * Handles file uploads for workshop images and logos
 */

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../uploads/workshops');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const workshopId = req.params.id;
        const workshopDir = path.join(uploadDir, workshopId);

        // Create workshop-specific directory
        if (!fs.existsSync(workshopDir)) {
            fs.mkdirSync(workshopDir, { recursive: true });
        }

        cb(null, workshopDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        cb(null, `${basename}-${uniqueSuffix}${ext}`);
    }
});

// File filter - only images
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError('Only image files are allowed (JPEG, PNG, WebP)', 400, 'INVALID_FILE_TYPE'), false);
    }
};

// Multer configuration
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
        files: 10 // Max 10 files at once
    }
});

/**
 * Delete uploaded file
 * @param {string} filePath - Absolute path to file
 */
const deleteFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error('Error deleting file:', error);
    }
};

/**
 * Get file URL from path
 * @param {string} filePath - Relative file path
 * @returns {string} Full URL
 */
const getFileUrl = (filePath) => {
    // In production, this would be your CDN URL
    // For now, return relative path that will be served by Express static
    return `/uploads/workshops/${filePath}`;
};

/**
 * Validate image dimensions (optional)
 * @param {string} filePath - Path to image file
 * @returns {Promise<{width: number, height: number}>}
 */
const getImageDimensions = async (filePath) => {
    // This would require sharp or similar library
    // For now, return placeholder
    return { width: 0, height: 0 };
};

module.exports = {
    upload,
    deleteFile,
    getFileUrl,
    getImageDimensions,
    uploadDir
};
