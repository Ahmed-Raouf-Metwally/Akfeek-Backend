const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/auth.middleware');
const { requireAdmin } = require('../../middlewares/permission.middleware');
const employeeController = require('../../controllers/employee.controller');

router.use(authMiddleware);
router.use(requireAdmin);

/**
 * @swagger
 * /api/admin/employees/permission-keys:
 *   get:
 *     summary: Available employee permission keys + labels (for admin UI)
 *     tags: [Admin Employees]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: keys[], labels{}
 */
router.get('/permission-keys', employeeController.getPermissionKeys);

/**
 * @swagger
 * /api/admin/employees:
 *   get:
 *     summary: List Akfeek employees (paginated)
 *     tags: [Admin Employees]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: vendorId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: OK
 *   post:
 *     summary: Create employee user
 *     tags: [Admin Employees]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               phone: { type: string }
 *               vendorId: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Created
 */
router.get('/', employeeController.listEmployees);
router.post('/', employeeController.createEmployee);

/**
 * @swagger
 * /api/admin/employees/{id}/permissions:
 *   get:
 *     summary: Get employee + permissions + allKeys/labels
 *     tags: [Admin Employees]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Not an employee
 *   put:
 *     summary: Replace employee permissions
 *     tags: [Admin Employees]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [permissions]
 *             properties:
 *               permissions:
 *                 type: array
 *                 items: { type: string }
 *                 example: ['bookings', 'vendors']
 *     responses:
 *       200:
 *         description: Updated
 */
router.get('/:id/permissions', employeeController.getEmployeePermissions);
router.put('/:id/permissions', employeeController.updateEmployeePermissions);

module.exports = router;
