const express = require('express');
const router = express.Router();
const carWashController = require('../controllers/carwash.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');

// Protect all routes
router.use(authMiddleware);
router.use(requireRole(['CUSTOMER']));

// Create car wash request
router.post('/request', carWashController.requestWash);

// Get offers for a broadcast
router.get('/:broadcastId/offers', carWashController.getOffers);

// Accept an offer
router.post('/:broadcastId/offers/:offerId/accept', carWashController.acceptOffer);

module.exports = router;
