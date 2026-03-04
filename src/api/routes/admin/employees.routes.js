const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/auth.middleware');
const { requireAdmin } = require('../../middlewares/permission.middleware');
const employeeController = require('../../controllers/employee.controller');

router.use(authMiddleware);
router.use(requireAdmin);

router.get('/permission-keys', employeeController.getPermissionKeys);
router.get('/', employeeController.listEmployees);
router.post('/', employeeController.createEmployee);
router.get('/:id/permissions', employeeController.getEmployeePermissions);
router.put('/:id/permissions', employeeController.updateEmployeePermissions);

module.exports = router;
