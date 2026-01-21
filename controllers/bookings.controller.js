const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Create a new booking
const createBooking = async (req, res) => {
  try {
    const { serviceId, date, notes } = req.body;
    const userId = req.user.userId; // Retrieved from Auth Middleware (to be implemented/verified)

    if (!serviceId || !date) {
      return res.status(400).json({ message: 'Service and date are required' });
    }

    const booking = await prisma.booking.create({
      data: {
        userId,
        serviceId,
        date: new Date(date),
        notes,
        status: 'PENDING',
      },
      include: {
        service: true,
      },
    });

    res.status(201).json({ message: 'Booking created successfully', booking });
  } catch (error) {
    console.error('Create Booking Error:', error);
    res.status(500).json({ message: 'Error creating booking', error: error.message });
  }
};

// Get bookings for the logged-in user
const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        service: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bookings', error: error.message });
  }
};

// Admin: Get all bookings
const getAllBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        service: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching all bookings', error: error.message });
  }
};

// Update booking status
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // PENDING, CONFIRMED, COMPLETED, CANCELLED

    const booking = await prisma.booking.update({
      where: { id },
      data: { status },
    });
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Error updating booking status', error: error.message });
  }
};

module.exports = {
  createBooking,
  getUserBookings,
  getAllBookings,
  updateBookingStatus,
};
