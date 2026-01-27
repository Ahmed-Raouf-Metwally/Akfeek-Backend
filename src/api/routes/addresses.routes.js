const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const addressController = require('../controllers/address.controller');

router.use(authMiddleware);

router.get('/', addressController.getMyAddresses);
router.get('/:id', addressController.getById);
router.post('/', addressController.create);
router.put('/:id', addressController.update);
router.delete('/:id', addressController.delete);

module.exports = router;
