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

        // Verify user role is CUSTOMER
        if (decoded.role !== 'CUSTOMER') {
          return next(new Error('Unauthorized: Not a customer - غير مصرح: ليس عميلاً'));
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
      logger.info(`✅ Customer connected: ${socket.userId}`);

      // Join user-specific room
      socket.join(`user-${socket.userId}`);

      // Handle location updates (for real-time tracking)
      socket.on('location:update', async (data) => {
        try {
          logger.debug(`Customer ${socket.userId} location updated:`, data);
          
          // You can save location to database or broadcast to relevant parties
          // Example: Update profile location
          // await prisma.profile.update({
          //   where: { userId: socket.userId },
          //   data: {
          //     currentLat: data.lat,
          //     currentLng: data.lng,
          //     lastLocationUpdate: new Date()
          //   }
          // });
        } catch (error) {
          logger.error('Location update error:', error);
          socket.emit('error', {
            code: 'LOCATION_UPDATE_FAILED',
            message: 'Failed to update location',
            messageAr: 'فشل تحديث الموقع'
          });
        }
      });

      // Handle notification read
      socket.on('notification:mark_read', async (data) => {
        try {
          const { notificationId } = data;
          
          // Update notification in database
          // await prisma.notification.update({
          //   where: { id: notificationId, userId: socket.userId },
          //   data: {
          //     isRead: true,
          //     readAt: new Date()
          //   }
          // });
          
          logger.debug(`Customer ${socket.userId} marked notification ${notificationId} as read`);
        } catch (error) {
          logger.error('Mark notification read error:', error);
        }
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        logger.info(`❌ Customer disconnected: ${socket.userId}, reason: ${reason}`);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`Socket error for customer ${socket.userId}:`, error);
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
