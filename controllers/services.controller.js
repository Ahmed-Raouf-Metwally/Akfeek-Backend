const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get all services
const getAllServices = async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
    });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching services', error: error.message });
  }
};

// Create a new service
const createService = async (req, res) => {
  try {
    const { name, description, price, duration, imageUrl } = req.body;
    
    // Basic validation
    if (!name || !price || !duration) {
      return res.status(400).json({ message: 'Name, price, and duration are required' });
    }

    const service = await prisma.service.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        duration: parseInt(duration),
        imageUrl,
      },
    });
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ message: 'Error creating service', error: error.message });
  }
};

// Update a service
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, duration, imageUrl, isActive } = req.body;

    const service = await prisma.service.update({
      where: { id },
      data: {
        name,
        description,
        price: price ? parseFloat(price) : undefined,
        duration: duration ? parseInt(duration) : undefined,
        imageUrl,
        isActive,
      },
    });
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: 'Error updating service', error: error.message });
  }
};

// Delete a service (Soft delete by setting isActive to false)
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.service.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting service', error: error.message });
  }
};

module.exports = {
  getAllServices,
  createService,
  updateService,
  deleteService,
};
