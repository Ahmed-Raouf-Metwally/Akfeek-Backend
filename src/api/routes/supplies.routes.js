const express = require('express');
const router = express.Router();
const supplyController = require('../controllers/supply.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

router.use(authenticate);

router.get('/', authorize('ADMIN', 'SUPPLIER', 'TECHNICIAN'), supplyController.list);
router.get('/:id', authorize('ADMIN', 'SUPPLIER', 'TECHNICIAN'), supplyController.getById);

module.exports = router;
