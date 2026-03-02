const express = require('express');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const router  = express.Router();
const auth    = require('../middlewares/auth.middleware');
const role    = require('../middlewares/role.middleware');
const ctrl    = require('../controllers/winch.controller');
const prisma  = require('../../utils/database/prisma');

const winchUploadDir = path.join(__dirname, '../../../uploads/winches');
if (!fs.existsSync(winchUploadDir)) fs.mkdirSync(winchUploadDir, { recursive: true });

const winchStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(winchUploadDir, req.params.id);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `image-${Date.now()}${ext}`);
  },
});
const winchUpload = multer({
  storage: winchStorage,
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Only images (JPEG, PNG, WebP) allowed'), ok);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(auth);

router.get('/',     ctrl.getAllWinches);
router.get('/:id',  ctrl.getWinchById);
router.post('/',    role('ADMIN'), ctrl.createWinch);
router.put('/:id',  role('ADMIN'), ctrl.updateWinch);
router.delete('/:id', role('ADMIN'), ctrl.deleteWinch);

router.post(
  '/:id/upload-image',
  role('ADMIN'),
  winchUpload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'No image uploaded' });
      const winch = await prisma.winch.findUnique({ where: { id: req.params.id } });
      if (!winch) return res.status(404).json({ success: false, error: 'Winch not found' });
      const imageUrl = `/uploads/winches/${req.params.id}/${req.file.filename}`;
      await prisma.winch.update({
        where: { id: req.params.id },
        data: { imageUrl },
      });
      res.json({ success: true, imageUrl });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
