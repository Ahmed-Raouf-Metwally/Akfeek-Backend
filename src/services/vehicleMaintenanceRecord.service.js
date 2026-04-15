const prisma = require('../utils/database/prisma');
const { AppError } = require('../api/middlewares/error.middleware');

const MAINTENANCE_TYPE_LABELS = {
  OIL_CHANGE: 'Oil Change',
  ENGINE_REPAIR: 'Engine Repair',
  BRAKES: 'Brakes',
  TIRES: 'Tires',
  AC: 'A/C',
  ELECTRICAL: 'Electrical',
  SUSPENSION: 'Suspension',
  BODY_REPAIR: 'Body Repair',
  PAINTING: 'Painting',
  DIAGNOSIS: 'Diagnosis',
  BATTERY: 'Battery',
  TRANSMISSION: 'Transmission',
  DETAILING: 'Detailing',
  GLASS: 'Glass',
  GENERAL_MAINTENANCE: 'General Maintenance',
  OTHER: 'Other',
};

const MAINTENANCE_TYPE_BY_LABEL = Object.entries(MAINTENANCE_TYPE_LABELS).reduce((acc, [key, label]) => {
  acc[label.toLowerCase()] = key;
  return acc;
}, {});

function toIsoDate(value) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

function mapMaintenance(record, dateField = 'date') {
  return {
    date: toIsoDate(record[dateField]),
    type: MAINTENANCE_TYPE_LABELS[record.type] || record.type,
    workshopName: record.workshopName || '',
    cost: record.cost == null ? 0 : Number(record.cost),
    note: record.notes || '',
  };
}

function parseDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    throw new AppError('Date must be in YYYY-MM-DD format', 400, 'VALIDATION_ERROR');
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new AppError('Invalid date', 400, 'VALIDATION_ERROR');
  }

  return date;
}

function optionalCost(value) {
  if (value == null || value === '') return null;

  const cost = Number(value);
  if (!Number.isFinite(cost) || cost < 0) {
    throw new AppError('Cost must be a non-negative number', 400, 'VALIDATION_ERROR');
  }
  return cost;
}

function requireText(value, fieldName) {
  const text = value == null ? '' : String(value).trim();
  if (!text) {
    throw new AppError(`${fieldName} is required`, 400, 'VALIDATION_ERROR');
  }
  return text;
}

function optionalText(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function parseMaintenanceType(value) {
  const rawType = requireText(value, 'type');
  const normalizedType = rawType
    .toUpperCase()
    .replace(/&/g, 'AND')
    .replace(/\//g, '')
    .replace(/[\s-]+/g, '_');

  const type = MAINTENANCE_TYPE_BY_LABEL[rawType.toLowerCase()] || normalizedType;

  if (!MAINTENANCE_TYPE_LABELS[type]) {
    throw new AppError('Invalid maintenance type', 400, 'VALIDATION_ERROR');
  }

  return type;
}

function rejectServiceId(data) {
  if (Object.prototype.hasOwnProperty.call(data, 'serviceId')) {
    throw new AppError('serviceId is not used for maintenance records', 400, 'VALIDATION_ERROR');
  }
}

class VehicleMaintenanceRecordService {
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

    const records = await prisma.vehicleMaintenanceRecord.findMany({
      where: { vehicleId },
      orderBy: { date: 'desc' },
    });

    return records.map((record) => mapMaintenance(record));
  }

  async listUpcoming(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromToday = new Date(today);
    sevenDaysFromToday.setDate(today.getDate() + 7);
    sevenDaysFromToday.setHours(23, 59, 59, 999);

    const records = await prisma.vehicleMaintenanceRecord.findMany({
      where: {
        nextMaintenanceDate: {
          lte: sevenDaysFromToday,
        },
        vehicle: {
          userId,
        },
      },
      orderBy: {
        nextMaintenanceDate: 'asc',
      },
    });

    return records.map((record) => mapMaintenance(record, 'nextMaintenanceDate'));
  }

  async getNextMaintenance(vehicleId, userId) {
    await this.assertVehicleOwner(vehicleId, userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await prisma.vehicleMaintenanceRecord.findFirst({
      where: {
        vehicleId,
        nextMaintenanceDate: {
          gte: today,
        },
      },
      orderBy: {
        nextMaintenanceDate: 'asc',
      },
      select: {
        type: true,
        nextMaintenanceDate: true,
      },
    });

    if (!record || !record.nextMaintenanceDate) {
      return { nextMaintenance: null };
    }

    const MAINTENANCE_TYPE_LABELS = {
      OIL_CHANGE: 'Oil Change',
      ENGINE_REPAIR: 'Engine Repair',
      BRAKES: 'Brakes',
      TIRES: 'Tires',
      AC: 'A/C',
      ELECTRICAL: 'Electrical',
      SUSPENSION: 'Suspension',
      BODY_REPAIR: 'Body Repair',
      PAINTING: 'Painting',
      DIAGNOSIS: 'Diagnosis',
      BATTERY: 'Battery',
      TRANSMISSION: 'Transmission',
      DETAILING: 'Detailing',
      GLASS: 'Glass',
      GENERAL_MAINTENANCE: 'General Maintenance',
      OTHER: 'Other',
    };

    return {
      nextMaintenance: {
        type: MAINTENANCE_TYPE_LABELS[record.type] || record.type,
        date: record.nextMaintenanceDate.toISOString().slice(0, 10),
      },
    };
  }

  async get(vehicleId, recordId, userId) {
    await this.assertVehicleOwner(vehicleId, userId);

    const record = await prisma.vehicleMaintenanceRecord.findFirst({
      where: { id: recordId, vehicleId },
    });

    if (!record) {
      throw new AppError('Maintenance record not found', 404, 'NOT_FOUND');
    }

    return mapMaintenance(record);
  }

  async create(vehicleId, userId, data) {
    rejectServiceId(data);
    await this.assertVehicleOwner(vehicleId, userId);

    const record = await prisma.vehicleMaintenanceRecord.create({
      data: {
        vehicleId,
        date: parseDate(data.date),
        type: parseMaintenanceType(data.type),
        workshopName: optionalText(data.workshopName),
        cost: optionalCost(data.cost),
        nextMaintenanceDate: data.nextMaintenanceDate ? parseDate(data.nextMaintenanceDate) : null,
        notes: data.notes == null ? null : String(data.notes),
      },
    });

    return mapMaintenance(record);
  }

  async update(vehicleId, recordId, userId, data) {
    rejectServiceId(data);
    await this.get(vehicleId, recordId, userId);

    const updateData = {};
    if (data.date !== undefined) updateData.date = parseDate(data.date);
    if (data.type !== undefined) updateData.type = parseMaintenanceType(data.type);
    if (data.workshopName !== undefined) updateData.workshopName = optionalText(data.workshopName);
    if (data.cost !== undefined) updateData.cost = optionalCost(data.cost);
    if (data.nextMaintenanceDate !== undefined) {
      updateData.nextMaintenanceDate = data.nextMaintenanceDate ? parseDate(data.nextMaintenanceDate) : null;
    }
    if (data.notes !== undefined) updateData.notes = data.notes == null ? null : String(data.notes);

    const record = await prisma.vehicleMaintenanceRecord.update({
      where: { id: recordId },
      data: updateData,
    });

    return mapMaintenance(record);
  }

  async delete(vehicleId, recordId, userId) {
    await this.get(vehicleId, recordId, userId);

    await prisma.vehicleMaintenanceRecord.delete({
      where: { id: recordId },
    });
  }
}

module.exports = new VehicleMaintenanceRecordService();
