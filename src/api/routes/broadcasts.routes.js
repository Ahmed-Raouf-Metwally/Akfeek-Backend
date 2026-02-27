const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const requireRole = require('../middlewares/role.middleware');
const broadcastController = require('../controllers/broadcast.controller');

router.use(authMiddleware);

router.get('/', requireRole('ADMIN'), broadcastController.getAllBroadcasts);
router.get('/:id', requireRole('ADMIN'), broadcastController.getBroadcastById);

module.exports = router;
