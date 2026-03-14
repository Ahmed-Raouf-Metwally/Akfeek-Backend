/**
 * Display labels for broadcast fields (urgency, vehicleCondition).
 * API returns these so the frontend shows text instead of translation keys like "broadcasts.urgency.NORMAL".
 */

const URGENCY_LABELS = {
  NORMAL: { en: 'Normal', ar: 'عادي' },
  HIGH: { en: 'High', ar: 'عاجل' },
};

const VEHICLE_CONDITION_LABELS = {
  NOT_STARTING: { en: 'Not starting', ar: 'لا يعمل' },
  ACCIDENT: { en: 'Accident', ar: 'حادث' },
  FLAT_TIRE: { en: 'Flat tire', ar: 'إطار مثقوب' },
  ENGINE_FAILURE: { en: 'Engine failure', ar: 'عطل محرك' },
  OTHER: { en: 'Other', ar: 'أخرى' },
};

function getUrgencyLabels(value) {
  const key = (value || 'NORMAL').toUpperCase();
  const labels = URGENCY_LABELS[key] || URGENCY_LABELS.NORMAL;
  return { urgencyLabel: labels.en, urgencyLabelAr: labels.ar };
}

function getVehicleConditionLabels(value) {
  if (!value) return { vehicleConditionLabel: null, vehicleConditionLabelAr: null };
  const key = String(value).toUpperCase();
  const labels = VEHICLE_CONDITION_LABELS[key] || { en: value, ar: value };
  return { vehicleConditionLabel: labels.en, vehicleConditionLabelAr: labels.ar };
}

/**
 * Add display labels to an object that has urgency and/or vehicleCondition.
 * Mutates the object and returns it.
 */
function attachBroadcastDisplayLabels(obj, options = {}) {
  const { urgency = true, vehicleCondition = true } = options;
  if (urgency && obj.urgency !== undefined) {
    Object.assign(obj, getUrgencyLabels(obj.urgency));
  }
  if (vehicleCondition && obj.vehicleCondition !== undefined) {
    Object.assign(obj, getVehicleConditionLabels(obj.vehicleCondition));
  }
  return obj;
}

module.exports = {
  URGENCY_LABELS,
  VEHICLE_CONDITION_LABELS,
  getUrgencyLabels,
  getVehicleConditionLabels,
  attachBroadcastDisplayLabels,
};
