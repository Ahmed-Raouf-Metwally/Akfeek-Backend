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

        // Verify user role is TECHNICIAN
        if (decoded.role !== 'TECHNICIAN') {
          return next(new Error('Unauthorized: Not a technician - غير مصرح: ليس فنياً'));
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
      logger.info(`✅ Technician connected: ${socket.userId}`);

      // Join user-specific room
      socket.join(`user-${socket.userId}`);

      // Handle location updates (important for job broadcasts)
      socket.on('location:update', async (data) => {
        try {
          const { lat, lng, accuracy } = data;
          
          logger.debug(`Technician ${socket.userId} location updated: lat=${lat}, lng=${lng}`);
          
          // Save to database for broadcast radius calculations
          // await prisma.profile.update({
          //   where: { userId: socket.userId },
          //   data: {
          //     currentLat: lat,
          //     currentLng: lng,
          //     lastLocationUpdate: new Date()
          //   }
          // });
          
          socket.emit('location:updated', {
            success: true,
            message: 'Location updated',
            messageAr: 'تم تحديث الموقع'
          });
        } catch (error) {
          logger.error('Location update error:', error);
          socket.emit('error', {
            code: 'LOCATION_UPDATE_FAILED',
            message: 'Failed to update location',
            messageAr: 'فشل تحديث الموقع'
          });
        }
      });

      // Handle availability toggle
      socket.on('availability:toggle', async (data) => {
        try {
          const { isAvailable } = data;
          
          // Update availability in database
          // await prisma.profile.update({
          //   where: { userId: socket.userId },
          //   data: { isAvailable }
          // });
          
          logger.info(`Technician ${socket.userId} availability set to: ${isAvailable}`);
          
          socket.emit('availability:updated', {
            success: true,
            isAvailable,
            message: 'Availability updated',
            messageAr: 'تم تحديث التوفر'
          });
        } catch (error) {
          logger.error('Availability toggle error:', error);
        }
      });

      // Handle offer submission (Indrive model)
      socket.on('offer:submit', async (data) => {
        try {
          const { broadcastId, bidAmount, estimatedArrival, message } = data;
          
          logger.info(`Technician ${socket.userId} submitted offer for broadcast ${broadcastId}`);
          
          // This will be handled by the broadcast controller
          // Just emit confirmation here
          socket.emit('offer:submitted', {
            success: true,
            message: 'Offer submitted successfully',
            messageAr: 'تم تقديم العرض بنجاح'
          });
        } catch (error) {
          logger.error('Offer submission error:', error);
        }
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        logger.info(`❌ Technician disconnected: ${socket.userId}, reason: ${reason}`);
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
