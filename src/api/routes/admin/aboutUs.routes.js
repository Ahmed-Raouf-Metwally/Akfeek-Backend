const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const router = express.Router();
const auth = require('../../middlewares/auth.middleware');
const role = require('../../middlewares/role.middleware');
const ctrl = require('../../controllers/aboutUs.controller');
const { AppError } = require('../../middlewares/error.middleware');

const aboutDir = path.join(process.cwd(), 'uploads', 'about-us');
if (!fs.existsSync(aboutDir)) {
  fs.mkdirSync(aboutDir, { recursive: true });
}

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, aboutDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `logo-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const iconStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { id } = req.params;
    if (!id) return cb(new AppError('Core value id is missing', 400));
    const dir = path.join(aboutDir, 'icons', id);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `icon-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const imageFilter = (req, file, cb) => {
  const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/pjpeg', 'image/x-png'].includes(
    String(file.mimetype).toLowerCase()
  );
  cb(ok ? null : new AppError('Only images (JPEG, PNG, WebP) allowed', 400), ok);
};

const uploadLogo = multer({
  storage: logoStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadIcon = multer({
  storage: iconStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

router.use(auth);
router.use(role('ADMIN'));

router.get('/', ctrl.adminGet);
router.put('/', ctrl.adminUpdatePage);
router.post('/logo', uploadLogo.single('logo'), ctrl.adminUploadLogo);
router.post('/core-values', ctrl.adminCreateCoreValue);
router.put('/core-values/:id', ctrl.adminUpdateCoreValue);
router.delete('/core-values/:id', ctrl.adminDeleteCoreValue);
router.post('/core-values/:id/icon', uploadIcon.single('icon'), ctrl.adminUploadCoreValueIcon);

module.exports = router;
