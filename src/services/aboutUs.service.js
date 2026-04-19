const prisma = require('../utils/database/prisma');
const { getFullUrl } = require('../utils/urlUtils');

const ALLOWED_ICON_KEYS = ['check_badge', 'sparkles', 'shield', 'star'];

const defaultCoreValues = () => [
  {
    sortOrder: 0,
    titleAr: 'الثقة و الشفافية',
    titleEn: 'Trust and transparency',
    descriptionAr: 'نلتزم بالوضوح في السعر والخدمة وبناء علاقة طويلة مع عملائنا.',
    descriptionEn: 'Clear pricing, honest service, and lasting customer relationships.',
    iconKey: 'check_badge',
  },
  {
    sortOrder: 1,
    titleAr: 'راحة و تجربة مميزة',
    titleEn: 'Comfort and a distinctive experience',
    descriptionAr: 'من الطلب وحتى إتمام الخدمة، نوفّر لك تجربة سلسة ومريحة.',
    descriptionEn: 'A smooth, comfortable journey from booking to completion.',
    iconKey: 'sparkles',
  },
];

function normalizeIconKey(key) {
  if (!key || typeof key !== 'string') return 'sparkles';
  const k = key.trim().toLowerCase();
  return ALLOWED_ICON_KEYS.includes(k) ? k : 'sparkles';
}

function mapAssetUrl(url) {
  if (!url) return null;
  return getFullUrl(url);
}

function mapPageForClient(page) {
  if (!page) return null;
  const { coreValues, ...rest } = page;
  return {
    ...rest,
    logoUrl: mapAssetUrl(rest.logoUrl),
    coreValues: (coreValues || [])
      .filter((v) => v.isActive !== false)
      .map((v) => ({
        id: v.id,
        sortOrder: v.sortOrder,
        titleAr: v.titleAr,
        titleEn: v.titleEn,
        descriptionAr: v.descriptionAr,
        descriptionEn: v.descriptionEn,
        iconKey: v.iconKey,
        iconUrl: mapAssetUrl(v.iconUrl),
      })),
  };
}

function mapPageForAdmin(page) {
  if (!page) return null;
  return {
    ...page,
    logoUrl: mapAssetUrl(page.logoUrl),
    coreValues: (page.coreValues || []).map((v) => ({
      ...v,
      iconUrl: mapAssetUrl(v.iconUrl),
    })),
  };
}

/**
 * Single About Us page — creates row + default values if missing.
 */
async function getOrCreatePage() {
  let page = await prisma.aboutUsPage.findFirst({
    orderBy: { createdAt: 'asc' },
    include: {
      coreValues: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
    },
  });

  if (!page) {
    const created = await prisma.aboutUsPage.create({
      data: {
        brandNameEn: 'Akfeek',
        brandNameAr: 'أكفيك',
        introHeadingAr: 'نقدم صيانة و قطع غيار بثقة و سهولة',
        introHeadingEn: 'Maintenance and spare parts with trust and ease',
        introBodyAr:
          'أكفيك منصة سعودية تربطك بخدمات السيارات والصيانة وقطع الغيار الموثوقة، بخطوات بسيطة وأسعار واضحة.',
        introBodyEn:
          'Akfeek is a Saudi platform connecting you with trusted car services, maintenance, and spare parts — simple steps and transparent pricing.',
        valuesSectionTitleAr: 'القيم الأساسية',
        valuesSectionTitleEn: 'Core values',
        coreValues: {
          create: defaultCoreValues(),
        },
      },
      include: {
        coreValues: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      },
    });
    page = created;
  }

  return page;
}

async function getPublicPayload() {
  const page = await getOrCreatePage();
  const activeValues = page.coreValues.filter((v) => v.isActive);
  return mapPageForClient({ ...page, coreValues: activeValues });
}

async function getAdminPayload() {
  const page = await getOrCreatePage();
  return mapPageForAdmin(page);
}

async function updatePage(data) {
  const page = await getOrCreatePage();
  const {
    brandNameEn,
    brandNameAr,
    introHeadingAr,
    introHeadingEn,
    introBodyAr,
    introBodyEn,
    valuesSectionTitleAr,
    valuesSectionTitleEn,
  } = data;

  const updated = await prisma.aboutUsPage.update({
    where: { id: page.id },
    data: {
      ...(brandNameEn !== undefined && { brandNameEn: String(brandNameEn).trim() || 'Akfeek' }),
      ...(brandNameAr !== undefined && { brandNameAr: String(brandNameAr).trim() || 'أكفيك' }),
      ...(introHeadingAr !== undefined && { introHeadingAr: String(introHeadingAr) }),
      ...(introHeadingEn !== undefined && { introHeadingEn: introHeadingEn ? String(introHeadingEn) : null }),
      ...(introBodyAr !== undefined && { introBodyAr: String(introBodyAr) }),
      ...(introBodyEn !== undefined && { introBodyEn: introBodyEn ? String(introBodyEn) : null }),
      ...(valuesSectionTitleAr !== undefined && { valuesSectionTitleAr: String(valuesSectionTitleAr) }),
      ...(valuesSectionTitleEn !== undefined && {
        valuesSectionTitleEn: valuesSectionTitleEn ? String(valuesSectionTitleEn) : null,
      }),
    },
    include: {
      coreValues: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
    },
  });
  return mapPageForAdmin(updated);
}

async function setLogoUrl(relativePath) {
  const page = await getOrCreatePage();
  const updated = await prisma.aboutUsPage.update({
    where: { id: page.id },
    data: { logoUrl: relativePath },
    include: {
      coreValues: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
    },
  });
  return mapPageForAdmin(updated);
}

async function createCoreValue(payload) {
  const page = await getOrCreatePage();
  const {
    titleAr,
    titleEn,
    descriptionAr,
    descriptionEn,
    iconKey,
    sortOrder,
    isActive,
  } = payload;

  await prisma.aboutUsCoreValue.create({
    data: {
      pageId: page.id,
      titleAr: String(titleAr).trim(),
      titleEn: titleEn ? String(titleEn).trim() : null,
      descriptionAr: String(descriptionAr),
      descriptionEn: descriptionEn ? String(descriptionEn) : null,
      iconKey: normalizeIconKey(iconKey),
      sortOrder: sortOrder === undefined || sortOrder === null ? 0 : parseInt(sortOrder, 10),
      isActive: isActive === undefined ? true : Boolean(isActive),
    },
  });

  return getAdminPayload();
}

async function updateCoreValue(id, payload) {
  const page = await getOrCreatePage();
  const existing = await prisma.aboutUsCoreValue.findFirst({
    where: { id, pageId: page.id },
  });
  if (!existing) return null;

  const {
    titleAr,
    titleEn,
    descriptionAr,
    descriptionEn,
    iconKey,
    iconUrl,
    sortOrder,
    isActive,
  } = payload;

  await prisma.aboutUsCoreValue.update({
    where: { id },
    data: {
      ...(titleAr !== undefined && { titleAr: String(titleAr).trim() }),
      ...(titleEn !== undefined && { titleEn: titleEn ? String(titleEn).trim() : null }),
      ...(descriptionAr !== undefined && { descriptionAr: String(descriptionAr) }),
      ...(descriptionEn !== undefined && { descriptionEn: descriptionEn ? String(descriptionEn) : null }),
      ...(iconKey !== undefined && { iconKey: normalizeIconKey(iconKey) }),
      ...(iconUrl !== undefined && { iconUrl: iconUrl || null }),
      ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder, 10) || 0 }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    },
  });

  return prisma.aboutUsCoreValue.findUnique({ where: { id } });
}

async function deleteCoreValue(id) {
  const page = await getOrCreatePage();
  const existing = await prisma.aboutUsCoreValue.findFirst({
    where: { id, pageId: page.id },
  });
  if (!existing) return false;
  await prisma.aboutUsCoreValue.delete({ where: { id } });
  return true;
}

async function setCoreValueIconUrl(id, relativePath) {
  const page = await getOrCreatePage();
  const existing = await prisma.aboutUsCoreValue.findFirst({
    where: { id, pageId: page.id },
  });
  if (!existing) return null;
  return prisma.aboutUsCoreValue.update({
    where: { id },
    data: { iconUrl: relativePath },
  });
}

module.exports = {
  ALLOWED_ICON_KEYS,
  getOrCreatePage,
  getPublicPayload,
  getAdminPayload,
  updatePage,
  setLogoUrl,
  createCoreValue,
  updateCoreValue,
  deleteCoreValue,
  setCoreValueIconUrl,
  mapPageForAdmin,
};
