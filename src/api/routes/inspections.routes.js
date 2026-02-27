const express = require('express');
const router = express.Router();
const inspectionController = require('../controllers/inspection.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

router.use(authenticate);

// Admin and Technicians can view inspections. Detailed permission logic can be added later.
router.get('/', authorize('ADMIN', 'TECHNICIAN'), inspectionController.list);
router.get('/:id', authorize('ADMIN', 'TECHNICIAN', 'CUSTOMER'), inspectionController.getById);

module.exports = router;
