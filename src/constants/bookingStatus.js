/**
 * Simplified booking status groups for UI filter and display.
 */

const SIMPLIFIED_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

/**
 * Each simplified status maps to raw status values.
 */
const STATUS_GROUP_TO_RAW = {
  PENDING: ['PENDING'],
  CONFIRMED: [
    'CONFIRMED',
    'BROADCASTING',
    'OFFERS_RECEIVED',
    'TECHNICIAN_ASSIGNED',
    'PICKUP_SCHEDULED',
    'QUOTE_PENDING',
    'QUOTE_APPROVED',
  ],
  IN_PROGRESS: [
    'IN_PROGRESS',
    'PARTS_NEEDED',
    'PARTS_ORDERED',
    'PARTS_DELIVERED',
    'IN_TRANSIT_PICKUP',
    'INSPECTING',
    'TECHNICIAN_EN_ROUTE',
    'ON_THE_WAY',
    'ARRIVED',
    'IN_SERVICE',
    'READY_FOR_DELIVERY',
    'IN_TRANSIT_DELIVERY',
  ],
  COMPLETED: ['COMPLETED', 'DELIVERED'],
  CANCELLED: ['CANCELLED', 'REJECTED', 'NO_SHOW', 'QUOTE_REJECTED'],
};

const RAW_TO_DISPLAY = {};
for (const [group, rawList] of Object.entries(STATUS_GROUP_TO_RAW)) {
  for (const raw of rawList) {
    RAW_TO_DISPLAY[raw] = group;
  }
}

/**
 * Build status filter for query from simplified status.
 * @param {string} status - from query
 * @returns {{ status: string } | { status: { in: string[] } }}
 */
function buildStatusWhere(status) {
  if (!status) return {};
  const upper = String(status).toUpperCase();
  if (STATUS_GROUP_TO_RAW[upper]) {
    return { status: { in: STATUS_GROUP_TO_RAW[upper] } };
  }
  return { status: upper };
}

/**
 * إرجاع الحالة المبسطة للعرض من الحالة المخزنة
 * @param {string} rawStatus
 * @returns {string}
 */
function getDisplayStatus(rawStatus) {
  if (!rawStatus) return rawStatus;
  return RAW_TO_DISPLAY[rawStatus] || rawStatus;
}

module.exports = {
  SIMPLIFIED_STATUSES,
  STATUS_GROUP_TO_RAW,
  RAW_TO_DISPLAY,
  buildStatusWhere,
  getDisplayStatus,
};
