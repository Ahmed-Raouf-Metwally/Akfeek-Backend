const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const ctrl = require('../controllers/mobileWorkshopType.controller');

// Public: list types with typeServices (for app - filter workshops by type/service)
router.get('/', ctrl.getAllTypes);
// خدمات نوع الورشة — يجب أن تأتي قبل /:id حتى لا يُفسَّر "services" كـ id
router.get('/:typeId/services', ctrl.getTypeServices);
router.get('/:id', ctrl.getTypeById);

// Admin only
router.post('/', auth, role('ADMIN'), ctrl.createType);
router.put('/:id', auth, role('ADMIN'), ctrl.updateType);
router.delete('/:id', auth, role('ADMIN'), ctrl.deleteType);

// Admin: إدارة خدمات نوع الورشة (داخل كل نوع)
router.post('/:typeId/services', auth, role('ADMIN'), ctrl.createTypeService);
router.put('/:typeId/services/:serviceId', auth, role('ADMIN'), ctrl.updateTypeService);
router.delete('/:typeId/services/:serviceId', auth, role('ADMIN'), ctrl.deleteTypeService);

module.exports = router;
