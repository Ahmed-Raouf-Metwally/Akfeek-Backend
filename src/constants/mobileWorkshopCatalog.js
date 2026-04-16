const MOBILE_WORKSHOP_CATALOG = Object.freeze([
  {
    key: 'BATTERY',
    nameAr: 'بطارية',
    priceMin: 100,
    priceMax: 150,
    currency: 'SAR',
    sortOrder: 1,
  },
  {
    key: 'TIRE_SERVICE',
    nameAr: 'إطار / بنشر',
    priceMin: 100,
    priceMax: 150,
    currency: 'SAR',
    sortOrder: 2,
  },
  {
    key: 'ENGINE_OIL',
    nameAr: 'زيت المحرك',
    priceMin: 100,
    priceMax: 150,
    currency: 'SAR',
    sortOrder: 3,
  },
  {
    key: 'ELECTRICAL',
    nameAr: 'كهرباء',
    priceMin: 100,
    priceMax: 150,
    currency: 'SAR',
    sortOrder: 4,
  },
  {
    key: 'ENGINE_PROBLEMS',
    nameAr: 'مشاكل المحرك',
    priceMin: 100,
    priceMax: 150,
    currency: 'SAR',
    sortOrder: 5,
  },
  {
    key: 'MAINTENANCE',
    nameAr: 'صيانة',
    priceMin: 100,
    priceMax: 150,
    currency: 'SAR',
    sortOrder: 6,
  },
  {
    key: 'OTHER_ISSUE',
    nameAr: 'مشكلة أخرى',
    pricingNoteAr: 'حسب الفحص',
    priceMin: null,
    priceMax: null,
    currency: 'SAR',
    sortOrder: 7,
  },
]);

function listMobileWorkshopCatalog() {
  return [...MOBILE_WORKSHOP_CATALOG].sort((a, b) => a.sortOrder - b.sortOrder);
}

function getMobileWorkshopCatalogItem(key) {
  if (!key) return null;
  const k = String(key).trim().toUpperCase();
  return MOBILE_WORKSHOP_CATALOG.find((x) => x.key === k) || null;
}

module.exports = {
  listMobileWorkshopCatalog,
  getMobileWorkshopCatalogItem,
};

