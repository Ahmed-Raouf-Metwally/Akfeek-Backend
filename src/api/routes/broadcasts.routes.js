const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', (req, res) => {
  res.json({ success: true, message: 'broadcasts endpoint - Coming soon' });
});

module.exports = router;
