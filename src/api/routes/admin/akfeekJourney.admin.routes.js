const express = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/role.middleware');
const ctrl = require('../../controllers/akfeekJourney.controller');

const router = express.Router();

router.use(authMiddleware, requireRole(['ADMIN']));

/**
 * @swagger
 * /api/admin/akfeek-journey:
 *   get:
 *     summary: List Akfeek journeys (admin)
 *     tags: [Akfeek Journey]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, COMPLETED, ABANDONED] }
 *     responses:
 *       200:
 *         description: items[], total, page, limit
 */
router.get('/', ctrl.adminList);

/**
 * @swagger
 * /api/admin/akfeek-journey/{id}/documents/{documentId}/file:
 *   get:
 *     summary: Download / inline open journey document file (admin)
 *     tags: [Akfeek Journey]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Binary file (Content-Type from stored mime)
 *       404:
 *         description: Journey or file not found
 */
router.get('/:id/documents/:documentId/file', ctrl.adminDownloadDocument);

/**
 * @swagger
 * /api/admin/akfeek-journey/{id}:
 *   get:
 *     summary: Journey detail for admin (steps breakdown, invoice, documents meta)
 *     tags: [Akfeek Journey]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: journey, steps[], workshopInvoice, workshopInvoicePaid
 *       404:
 *         description: Not found
 */
router.get('/:id', ctrl.adminGetById);

module.exports = router;
