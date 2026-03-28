const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const addressController = require('../controllers/address.controller');

router.use(authMiddleware);

/**
 * @swagger
 * /api/addresses:
 *   get:
 *     summary: List my addresses
 *     tags: [Addresses]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 *   post:
 *     summary: Create address
 *     tags: [Addresses]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: See Address model (label, lat, lng, city, etc.)
 *     responses:
 *       201:
 *         description: Created
 */
router.get('/', addressController.getMyAddresses);
router.post('/', addressController.create);

/**
 * @swagger
 * /api/addresses/{id}:
 *   get:
 *     summary: Get address by ID
 *     tags: [Addresses]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: OK
 *   put:
 *     summary: Update address
 *     tags: [Addresses]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: OK
 *   delete:
 *     summary: Delete address
 *     tags: [Addresses]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/:id', addressController.getById);
router.put('/:id', addressController.update);
router.delete('/:id', addressController.delete);

module.exports = router;
