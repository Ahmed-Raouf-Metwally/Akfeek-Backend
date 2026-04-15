const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');

const UI_DOC_TYPES = ['drivingLicense', 'registrationForm', 'insurance', 'inspectionReport'];
const UPLOAD_OPTIONS = ['drivingLicense', 'registrationForm', 'insurance', 'inspectionReport'];
const VALID_DOC_TYPES = ['drivingLicense', 'registrationForm', 'insurance', 'inspectionReport'];
const VALID_UPLOAD_TYPES = ['drivingLicense', 'registrationForm', 'insurance', 'inspectionReport'];

function calculateStatus(expiryDate) {
  if (!expiryDate) return 'renewalRequired';

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'expired';
  if (diffDays <= 7) return 'expiring';
  return 'renewed';
}

function toIsoDate(date) {
  if (!date) return null;
  return new Date(date).toISOString().slice(0, 10);
}

function validateDocType(type) {
  if (!VALID_DOC_TYPES.includes(type)) {
    throw new AppError(
      `Invalid document type. Must be one of: ${VALID_DOC_TYPES.join(', ')}`,
      400,
      'VALIDATION_ERROR'
    );
  }
}

function parseDate(value, fieldName) {
  if (!value) return null;
  const dateStr = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new AppError(`${fieldName} must be in YYYY-MM-DD format`, 400, 'VALIDATION_ERROR');
  }
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new AppError('Invalid date', 400, 'VALIDATION_ERROR');
  }
  return date;
}

function mapDocument(record) {
  return {
    type: record.type,
    status: calculateStatus(record.expiryDate),
    expiryDate: toIsoDate(record.expiryDate),
    fileUrl: record.fileUrl || null,
  };
}

class VehicleDocumentService {
  async assertVehicleOwner(vehicleId, userId) {
    const vehicle = await prisma.userVehicle.findFirst({
      where: { id: vehicleId, userId },
      select: { id: true },
    });
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404, 'NOT_FOUND');
    }
  }

  async list(vehicleId, userId) {
    await this.assertVehicleOwner(vehicleId, userId);

    const records = await prisma.userVehicleDocument.findMany({
      where: {
        vehicleId,
        type: { in: UI_DOC_TYPES },
      },
    });

    return {
      documents: records.map(mapDocument),
      uploadOptions: UPLOAD_OPTIONS,
    };
  }

  async create(vehicleId, userId, data) {
    await this.assertVehicleOwner(vehicleId, userId);
    validateDocType(data.type);

    const expiryDate = parseDate(data.expiryDate, 'expiryDate');

    await prisma.userVehicleDocument.upsert({
      where: {
        vehicleId_type: { vehicleId, type: data.type },
      },
      update: { expiryDate },
      create: {
        vehicleId,
        type: data.type,
        expiryDate,
      },
    });

    return this.list(vehicleId, userId);
  }

  async update(vehicleId, userId, type, data) {
    await this.assertVehicleOwner(vehicleId, userId);
    validateDocType(type);

    const existing = await prisma.userVehicleDocument.findUnique({
      where: { vehicleId_type: { vehicleId, type } },
    });

    if (!existing) {
      throw new AppError('Document not found', 404, 'NOT_FOUND');
    }

    const expiryDate = parseDate(data.expiryDate, 'expiryDate');

    await prisma.userVehicleDocument.update({
      where: { vehicleId_type: { vehicleId, type } },
      data: { expiryDate },
    });

    return this.list(vehicleId, userId);
  }

  async remove(vehicleId, userId, type) {
    await this.assertVehicleOwner(vehicleId, userId);
    validateDocType(type);

    await prisma.userVehicleDocument.delete({
      where: { vehicleId_type: { vehicleId, type } },
    });

    return this.list(vehicleId, userId);
  }

  async upload(vehicleId, userId, type, fileUrl) {
    await this.assertVehicleOwner(vehicleId, userId);

    if (!VALID_UPLOAD_TYPES.includes(type)) {
      throw new AppError(
        `Invalid document type. Must be one of: ${VALID_UPLOAD_TYPES.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }

    await prisma.userVehicleDocument.upsert({
      where: { vehicleId_type: { vehicleId, type } },
      update: { fileUrl, status: 'renewalRequired' },
      create: { vehicleId, type, fileUrl, status: 'renewalRequired' },
    });

    return this.list(vehicleId, userId);
  }
}

module.exports = new VehicleDocumentService();
