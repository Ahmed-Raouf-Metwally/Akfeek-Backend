const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth.middleware');
const role = require('../../middlewares/role.middleware');
const ctrl = require('../../controllers/admin/mobileWorkshopCatalog.admin.controller');

/**
 * @swagger
 * tags:
 *   name: Admin Mobile Workshop Catalog
 *   description: Admin-only management for the design-locked mobile workshop catalog (7 keys only).
 */

/**
 * @swagger
 * /api/admin/mobile-workshop/catalog:
 *   get:
 *     summary: List mobile workshop catalog items (Admin)
 *     tags: [Admin Mobile Workshop Catalog]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of catalog items
 */
router.get('/catalog', auth, role('ADMIN'), ctrl.list);

/**
 * @swagger
 * /api/admin/mobile-workshop/catalog/{key}:
 *   put:
 *     summary: Upsert/update a catalog item by key (Admin)
 *     description: "Design-locked: only the 7 predefined keys are allowed."
 *     tags: [Admin Mobile Workshop Catalog]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *           enum: [BATTERY, TIRE_SERVICE, ENGINE_OIL, ELECTRICAL, ENGINE_PROBLEMS, MAINTENANCE, OTHER_ISSUE]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nameAr: { type: string }
 *               pricingNoteAr: { type: string, nullable: true }
 *               priceMin: { type: number, nullable: true }
 *               priceMax: { type: number, nullable: true }
 *               currency: { type: string, default: "SAR" }
 *               sortOrder: { type: integer }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Saved item
 */
router.put('/catalog/:key', auth, role('ADMIN'), ctrl.upsert);

/**
 * @swagger
 * /api/admin/mobile-workshop/catalog/{key}:
 *   delete:
 *     summary: Delete a catalog item (NOT allowed)
 *     description: Design-locked. Use isActive=false instead.
 *     tags: [Admin Mobile Workshop Catalog]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       405:
 *         description: Not allowed
 */
router.delete('/catalog/:key', auth, role('ADMIN'), ctrl.remove);

module.exports = router;

