const express = require('express');
const router = express.Router();
const carWashController = require('../controllers/carwash.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

// Protect all routes
router.use(protect);
router.use(authorize('CUSTOMER'));

// Create car wash request
router.post('/request', carWashController.requestWash);

// Get offers for a broadcast
router.get('/:broadcastId/offers', carWashController.getOffers);

// Accept an offer
router.post('/:broadcastId/offers/:offerId/accept', carWashController.acceptOffer);

module.exports = router;
