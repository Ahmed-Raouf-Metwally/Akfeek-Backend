const jwt = require('jsonwebtoken');
const logger = require('../../utils/logger/logger');

module.exports = {
  init(namespace) {
    // Authentication middleware
    namespace.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication required - مطلوب مصادقة'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verify user role is ADMIN
        if (decoded.role !== 'ADMIN') {
          return next(new Error('Unauthorized: Not an admin - غير مصرح: ليس مسؤولاً'));
        }

        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
        next();
      } catch (error) {
        logger.error('Socket authentication failed:', error);
        next(new Error('Authentication failed - فشلت المصادقة'));
      }
    });

    namespace.on('connection', (socket) => {
      logger.info(`✅ Admin connected: ${socket.userId}`);

      // Join admin global room
      socket.join('admin-global');

      // Admins can monitor system events
      socket.on('disconnect', (reason) => {
        logger.info(`❌ Admin disconnected: ${socket.userId}, reason: ${reason}`);
      });

      // Send welcome message
      socket.emit('connected', {
        message: 'Connected successfully',
        messageAr: 'تم الاتصال بنجاح',
        userId: socket.userId
      });
    });
  }
};
