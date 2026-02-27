const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/auth.middleware');
const controller = require('../../controllers/admin/finance.controller');
const roleMiddleware = require('../../middlewares/role.middleware');

// Protect all finance routes
router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN']));


/**
 * @swagger
 * /api/admin/finance/wallets:
 *   get:
 *     summary: Get all wallets with pagination and search
 *     tags: [⚙️ Admin | Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by email, phone, or name
 *     responses:
 *       200:
 *         description: List of wallets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     wallets:
 *                       type: array
 *                       items:
 *                         type: object
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get('/wallets', controller.getAllWallets);

/**
 * @swagger
 * /api/admin/finance/wallet/credit:
 *   post:
 *     summary: Credit a user's wallet
 *     tags: [⚙️ Admin | Finance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - amount
 *             properties:
 *               userId:
 *                 type: string
 *               amount:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Wallet credited successfully
 */
router.post('/wallet/credit', controller.creditWallet);

/**
 * @swagger
 * /api/admin/finance/wallet/debit:
 *   post:
 *     summary: Debit a user's wallet
 *     tags: [⚙️ Admin | Finance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - amount
 *             properties:
 *               userId:
 *                 type: string
 *               amount:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Wallet debited successfully
 */
router.post('/wallet/debit', controller.debitWallet);

/**
 * @swagger
 * /api/admin/finance/wallet/{walletId}/transactions:
 *   get:
 *     summary: Get wallet transactions history
 *     tags: [⚙️ Admin | Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get('/wallet/:walletId/transactions', controller.getWalletTransactions);

/**
 * @swagger
 * /api/admin/finance/points/audit:
 *   get:
 *     summary: Get points audit log
 *     tags: [⚙️ Admin | Finance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Points audit log
 */
router.get('/points/audit', controller.getPointsAudit);

/**
 * @swagger
 * /api/admin/finance/points/adjust:
 *   post:
 *     summary: Adjust user points (Credit/Debit)
 *     tags: [⚙️ Admin | Finance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - amount
 *             properties:
 *               userId:
 *                 type: string
 *               amount:
 *                 type: integer
 *                 description: Positive to add, negative to subtract
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Points adjusted successfully
 */
router.post('/points/adjust', controller.adjustPoints);

/**
 * @swagger
 * /api/admin/finance/points/settings:
 *   get:
 *     summary: Get points conversion rate settings
 *     tags: [⚙️ Admin | Finance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Points settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     points:
 *                       type: number
 *                     currency:
 *                       type: number
 */
router.get('/points/settings', controller.getPointsSettings);

/**
 * @swagger
 * /api/admin/finance/points/settings:
 *   post:
 *     summary: Update points conversion rate settings
 *     tags: [⚙️ Admin | Finance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - points
 *               - currency
 *             properties:
 *               points:
 *                 type: number
 *                 description: Number of points
 *               currency:
 *                 type: number
 *                 description: Equivalent currency value
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.post('/points/settings', controller.updatePointsSettings);

module.exports = router;
