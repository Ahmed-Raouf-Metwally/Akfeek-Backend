const express = require('express');
const router = express.Router();
const technicianCarWashController = require('../controllers/technicianCarwash.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

// Protect all routes
router.use(protect);
router.use(authorize('TECHNICIAN'));

// Get active broadcasts
router.get('/broadcasts', technicianCarWashController.getBroadcasts);

// Submit offer
router.post('/:broadcastId/offers', technicianCarWashController.submitOffer);

module.exports = router;
