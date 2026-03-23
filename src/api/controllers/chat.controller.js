const prisma = require('../../utils/database/prisma');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Get chat messages for a booking (customer or vendor of mobile workshop can access)
 * GET /api/bookings/:bookingId/chat/messages
 */
async function getMessages(req, res, next) {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        customerId: true,
        technicianId: true,
        mobileWorkshopId: true,
        chatRoom: { select: { id: true } },
        mobileWorkshop: { select: { vendorId: true, vendor: { select: { userId: true } } } },
      },
    });
    if (!booking) throw new AppError('Booking not found', 404, 'NOT_FOUND');
    const vendorUserId = booking.mobileWorkshop?.vendor?.userId || null;
    const canAccess = booking.customerId === userId || booking.technicianId === userId || vendorUserId === userId;
    if (!canAccess) throw new AppError('Not authorized to view this chat', 403, 'FORBIDDEN');
    if (!booking.chatRoom) {
      return res.json({ success: true, data: [], roomId: null });
    }
    const messages = await prisma.chatMessage.findMany({
      where: { roomId: booking.chatRoom.id },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } } },
    });
    res.json({
      success: true,
      data: messages.map((m) => ({
        id: m.id,
        content: m.content,
        isRead: m.isRead,
        createdAt: m.createdAt,
        userId: m.userId,
        userName: m.user?.profile ? `${m.user.profile.firstName || ''} ${m.user.profile.lastName || ''}`.trim() : null,
      })),
      roomId: booking.chatRoom.id,
    });
  } catch (err) { next(err); }
}

/**
 * Send a chat message (persists to DB; socket can broadcast separately)
 * POST /api/bookings/:bookingId/chat/messages
 * Body: { content }
 */
async function sendMessage(req, res, next) {
  try {
    const { bookingId } = req.params;
    const { content } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new AppError('content is required', 400, 'VALIDATION_ERROR');
    }
    const userId = req.user.id;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        chatRoom: true,
        mobileWorkshop: { select: { vendor: { select: { userId: true } } } },
      },
    });
    if (!booking) throw new AppError('Booking not found', 404, 'NOT_FOUND');
    const vendorUserId = booking.mobileWorkshop?.vendor?.userId || null;
    const canAccess = booking.customerId === userId || booking.technicianId === userId || vendorUserId === userId;
    if (!canAccess) throw new AppError('Not authorized to send messages in this chat', 403, 'FORBIDDEN');
    let room = booking.chatRoom;
    if (!room) {
      room = await prisma.chatRoom.create({ data: { bookingId } });
    }
    const message = await prisma.chatMessage.create({
      data: {
        roomId: room.id,
        userId,
        content: content.trim().slice(0, 2000),
      },
      include: { user: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } } },
    });
    res.status(201).json({
      success: true,
      data: {
        id: message.id,
        content: message.content,
        isRead: message.isRead,
        createdAt: message.createdAt,
        userId: message.userId,
        userName: message.user?.profile ? `${message.user.profile.firstName || ''} ${message.user.profile.lastName || ''}`.trim() : null,
      },
    });
  } catch (err) { next(err); }
}

module.exports = { getMessages, sendMessage };
