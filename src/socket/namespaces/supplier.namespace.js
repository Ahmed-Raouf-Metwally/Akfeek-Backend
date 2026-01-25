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

        // Verify user role is SUPPLIER
        if (decoded.role !== 'SUPPLIER') {
          return next(new Error('Unauthorized: Not a supplier - غير مصرح: ليس مورداً'));
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
      logger.info(`✅ Supplier connected: ${socket.userId}`);

      // Join user-specific room
      socket.join(`user-${socket.userId}`);

      // Handle supply request status updates
      socket.on('supply:update_status', async (data) => {
        try {
          const { requestId, status, estimatedDelivery } = data;
          
          logger.info(`Supplier ${socket.userId} updated supply request ${requestId} to ${status}`);
          
          // This will be handled by the supply controller
          socket.emit('supply:status_updated', {
            success: true,
            message: 'Status updated successfully',
            messageAr: 'تم تحديث الحالة بنجاح'
          });
        } catch (error) {
          logger.error('Supply status update error:', error);
        }
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        logger.info(`❌ Supplier disconnected: ${socket.userId}, reason: ${reason}`);
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
