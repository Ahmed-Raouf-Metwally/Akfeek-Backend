const express = require('express');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const router  = express.Router();
const auth    = require('../middlewares/auth.middleware');
const role    = require('../middlewares/role.middleware');
const ctrl    = require('../controllers/mobileWorkshop.controller');
const prisma  = require('../../utils/database/prisma');

const mwUploadDir = path.join(__dirname, '../../../uploads/mobile-workshops');
if (!fs.existsSync(mwUploadDir)) fs.mkdirSync(mwUploadDir, { recursive: true });

const mwStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(mwUploadDir, req.params.id);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const type = req.body?.type || req.query?.type || 'image';
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${type}-${Date.now()}${ext}`);
  },
});
const mwUpload = multer({
  storage: mwStorage,
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Only images (JPEG, PNG, WebP) allowed'), ok);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(auth);

router.get('/',     ctrl.getAll);
router.get('/:id',  ctrl.getById);
router.post('/',    role('ADMIN'), ctrl.create);
router.put('/:id',  role('ADMIN'), ctrl.update);
router.delete('/:id', role('ADMIN'), ctrl.remove);

// رفع صورة: صورة الفني/الشعار (type=logo) أو صورة المركبة (type=vehicle)
router.post(
  '/:id/upload-image',
  role('ADMIN'),
  mwUpload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'No image uploaded' });
      const workshop = await prisma.mobileWorkshop.findUnique({ where: { id: req.params.id } });
      if (!workshop) return res.status(404).json({ success: false, error: 'Mobile workshop not found' });
      const type = (req.body?.type || 'logo').toLowerCase();
      const imageUrl = `/uploads/mobile-workshops/${req.params.id}/${req.file.filename}`;
      const updateData = type === 'vehicle' ? { vehicleImageUrl: imageUrl } : { imageUrl };
      await prisma.mobileWorkshop.update({
        where: { id: req.params.id },
        data: updateData,
      });
      res.json({ success: true, imageUrl, field: type === 'vehicle' ? 'vehicleImageUrl' : 'imageUrl' });
    } catch (err) {
      next(err);
    }
  }
);

// Services per workshop
router.post('/:id/services',             role('ADMIN'), ctrl.addService);
router.put('/:id/services/:svcId',       role('ADMIN'), ctrl.updateService);
router.delete('/:id/services/:svcId',    role('ADMIN'), ctrl.removeService);

module.exports = router;
