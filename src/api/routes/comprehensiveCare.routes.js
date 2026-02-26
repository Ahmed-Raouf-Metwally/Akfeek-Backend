const express = require('express');
const router = express.Router();
const controller = require('../controllers/comprehensiveCare.controller');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * @swagger
 * /api/comprehensive-care/providers:
 *   get:
 *     summary: Get all comprehensive care providers (Merged Vendors & Workshops)
 *     description: Returns a unified list of vendors of type COMPREHENSIVE_CARE and workshops offering care services.
 *     tags: [📱 Customer | Comprehensive Care]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of providers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       name: { type: string }
 *                       nameAr: { type: string }
 *                       type: { type: string, enum: [VENDOR, WORKSHOP] }
 *                       category: { type: string }
 *                       city: { type: string }
 *                       phone: { type: string }
 *                       logo: { type: string }
 *                       averageRating: { type: number }
 */
router.get('/providers', authMiddleware, controller.getProviders);

module.exports = router;
