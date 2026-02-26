const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const broadcastController = require('../controllers/broadcast.controller');

router.use(authMiddleware);

/**
 * @swagger
 * /api/broadcasts:
 *   get:
 *     summary: List all active broadcasts (Admin)
 *     tags: [📱 Customer | Emergency Broadcasts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of broadcasts
 */
router.get('/', requireRole('ADMIN'), broadcastController.getAllBroadcasts);

/**
 * @swagger
 * /api/broadcasts/{id}:
 *   get:
 *     summary: Get broadcast by ID (Admin)
 *     tags: [📱 Customer | Emergency Broadcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Broadcast details
 */
router.get('/:id', requireRole('ADMIN'), broadcastController.getBroadcastById);

module.exports = router;

