const prisma = require('../../utils/database/prisma');
const { getDisplayStatus } = require('../../constants/bookingStatus');

const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/**
 * Last 7 days with date string YYYY-MM-DD and day name
 */
function getLast7Days(locale = 'en') {
  const days = [];
  const names = locale === 'ar' ? DAY_NAMES_AR : DAY_NAMES_EN;
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({ date: dateStr, name: names[d.getDay()], dayIndex: d.getDay() });
  }
  return days;
}

/**
 * حساب إجمالي عمولة المنصة من الحجوزات المكتملة وطلبات المتجر المدفوعة
 */
async function getTotalPlatformCommission(prisma) {
  const bookingWhere = { status: { in: ['COMPLETED', 'DELIVERED', 'READY_FOR_DELIVERY'] } };
  const orderWhere = { status: { in: ['DELIVERED', 'SHIPPED'] }, paymentStatus: 'PAID' };

  const [bookings, marketplaceOrders] = await Promise.all([
    prisma.booking.findMany({
      where: bookingWhere,
      select: {
        platformCommissionPercent: true,
        subtotal: true,
        laborFee: true,
        deliveryFee: true,
        partsTotal: true,
        discount: true,
        workshop: { select: { vendor: { select: { commissionPercent: true } } } },
        jobBroadcast: {
          select: {
            offers: {
              where: { isSelected: true },
              take: 1,
              select: { winch: { select: { vendor: { select: { commissionPercent: true } } } } },
            },
          },
        },
      },
    }),
    prisma.marketplaceOrder.findMany({
      where: orderWhere,
      select: {
        items: { select: { totalPrice: true, vendor: { select: { commissionPercent: true } } } },
      },
    }),
  ]);

  let totalCommission = 0;
  for (const b of bookings) {
    const price =
      Number(b.subtotal ?? 0) +
      Number(b.laborFee ?? 0) +
      Number(b.deliveryFee ?? 0) +
      Number(b.partsTotal ?? 0) -
      Number(b.discount ?? 0);
    const commP =
      b.platformCommissionPercent != null
        ? Number(b.platformCommissionPercent)
        : (b.workshop?.vendor?.commissionPercent ?? b.jobBroadcast?.offers?.[0]?.winch?.vendor?.commissionPercent) ?? 0;
    totalCommission += price * (commP / 100);
  }
  for (const o of marketplaceOrders) {
    for (const it of o.items || []) {
      const itemTotal = Number(it.totalPrice ?? 0);
      const pct = it.vendor?.commissionPercent != null ? Number(it.vendor.commissionPercent) : 0;
      totalCommission += itemTotal * (pct / 100);
    }
  }
  return Math.round(totalCommission * 100) / 100;
}

/**
 * Dashboard Controller — إحصائيات لوحة التحكم والتحليلات
 */
class DashboardController {
  /**
   * GET /api/dashboard/stats
   * إحصائيات عامة + آخر 7 أيام للحجوزات (للرسم) + نشاط وحجوزات حديثة + إجمالي عمولة المنصة
   */
  async getStats(req, res, next) {
    try {
      const [
        totalUsers,
        totalBookings,
        activeSuppliers,
        totalRevenueAgg,
        totalVendors,
        totalOrders,
        totalCommission,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.booking.count(),
        prisma.user.count({ where: { role: 'SUPPLIER', status: 'ACTIVE' } }),
        prisma.invoice.aggregate({
          _sum: { totalAmount: true },
          where: { status: 'PAID' },
        }),
        prisma.vendorProfile.count().catch(() => 0),
        prisma.marketplaceOrder.count().catch(() => 0),
        getTotalPlatformCommission(prisma),
      ]);

      const revenue = Number(totalRevenueAgg._sum?.totalAmount ?? 0);

      const last7 = getLast7Days('en');
      const fromDate = new Date(last7[0].date + 'T00:00:00.000Z');
      const toDate = new Date(last7[last7.length - 1].date + 'T23:59:59.999Z');

      const bookingsInRange = await prisma.booking.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        select: { createdAt: true },
      });

      const countByDate = {};
      bookingsInRange.forEach((row) => {
        const key = new Date(row.createdAt).toISOString().slice(0, 10);
        countByDate[key] = (countByDate[key] || 0) + 1;
      });

      const chartWeeklyBookings = last7.map(({ date, name }) => ({
        name,
        count: countByDate[date] || 0,
        date,
      }));

      const recentActivity = await prisma.activityLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          createdAt: true,
          user: { select: { email: true, profile: { select: { firstName: true, lastName: true } } } },
        },
      });

      const recentBookingsRaw = await prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          createdAt: true,
          customer: { select: { profile: { select: { firstName: true, lastName: true } } } },
          vehicle: { select: { vehicleModel: { select: { name: true } } } },
        },
      });
      const recentBookings = recentBookingsRaw.map((b) => ({ ...b, displayStatus: getDisplayStatus(b.status) }));

      res.json({
        success: true,
        data: {
          stats: {
            totalUsers,
            totalBookings,
            activeSuppliers,
            totalVendors,
            totalOrders,
            revenue,
            totalCommission,
          },
          chartWeeklyBookings,
          recentActivity,
          recentBookings,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/dashboard/analytics?range=7d|30d|90d
   * تحليلات حسب الفترة: حجوزات وإيرادات يومية + توزيع حسب الفئة
   */
  async getAnalytics(req, res, next) {
    try {
      const range = (req.query.range || '7d').toLowerCase();
      const days = range === '90d' ? 90 : range === '30d' ? 30 : 7;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const bookingsInRange = await prisma.booking.findMany({
        where: { createdAt: { gte: fromDate } },
        select: {
          id: true,
          createdAt: true,
          status: true,
          subtotal: true,
          totalPrice: true,
        },
      });

      const invoicesPaidInRange = await prisma.invoice.findMany({
        where: {
          status: 'PAID',
          paidAt: { gte: fromDate, not: null },
        },
        select: { totalAmount: true, paidAt: true },
      });

      const dateMap = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const dayName = d.toLocaleDateString('en-GB', { weekday: 'short' });
        dateMap[key] = { date: key, dayName, bookings: 0, revenue: 0 };
      }

      bookingsInRange.forEach((b) => {
        const key = new Date(b.createdAt).toISOString().slice(0, 10);
        if (dateMap[key]) {
          dateMap[key].bookings += 1;
        }
      });

      invoicesPaidInRange.forEach((inv) => {
        if (!inv.paidAt) return;
        const key = new Date(inv.paidAt).toISOString().slice(0, 10);
        if (dateMap[key]) {
          dateMap[key].revenue += Number(inv.totalAmount ?? 0);
        }
      });

      const timeSeries = Object.keys(dateMap)
        .sort()
        .map((k) => ({
          name: dateMap[k].dayName,
          date: k,
          bookings: dateMap[k].bookings,
          revenue: Math.round(dateMap[k].revenue * 100) / 100,
        }));

      const statusCounts = {};
      bookingsInRange.forEach((b) => {
        const s = b.status || 'OTHER';
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      });
      const categoryBreakdown = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

      const totalBookingsPeriod = bookingsInRange.length;
      const totalRevenuePeriod = invoicesPaidInRange.reduce((sum, inv) => sum + Number(inv.totalAmount ?? 0), 0);

      res.json({
        success: true,
        data: {
          timeSeries,
          categoryBreakdown: categoryBreakdown.length ? categoryBreakdown : [{ name: 'No data', value: 0 }],
          summary: {
            totalBookings: totalBookingsPeriod,
            totalRevenue: Math.round(totalRevenuePeriod * 100) / 100,
            periodDays: days,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/dashboard/all-sub-services
   * كل الخدمات الفرعية: الورش المعتمدة، ورش الغسيل، العناية الشاملة، الوينشات، الورش المتنقلة (عرض فقط)
   */
  async getAllSubServices(req, res, next) {
    try {
      const [
        certifiedWorkshopServices,
        comprehensiveCareServices,
        winches,
        mobileWorkshopServices,
        carWashVendors,
      ] = await Promise.all([
        prisma.certifiedWorkshopService.findMany({
          where: { isActive: true },
          include: { workshop: { select: { id: true, name: true, nameAr: true } } },
          orderBy: [{ workshop: { name: 'asc' } }, { name: 'asc' }],
        }),
        prisma.service.findMany({
          where: { vendorId: { not: null }, isActive: true },
          include: {
            vendor: { select: { id: true, businessName: true, businessNameAr: true } },
            pricing: { take: 1, orderBy: { createdAt: 'asc' } },
          },
          orderBy: { name: 'asc' },
        }),
        prisma.winch.findMany({
          where: { isActive: true },
          include: { vendor: { select: { id: true, businessName: true, businessNameAr: true } } },
          orderBy: { name: 'asc' },
        }),
        prisma.mobileWorkshopService.findMany({
          where: { isActive: true },
          include: { mobileWorkshop: { select: { id: true, name: true, nameAr: true } } },
          orderBy: [{ mobileWorkshop: { name: 'asc' } }, { name: 'asc' }],
        }),
        prisma.vendorProfile.findMany({
          where: { vendorType: 'CAR_WASH', status: 'ACTIVE' },
          select: { id: true, businessName: true, businessNameAr: true },
        }),
      ]);

      const certifiedWorkshop = certifiedWorkshopServices.map((s) => ({
        id: s.id,
        source: 'CERTIFIED_WORKSHOP',
        sourceLabelAr: 'الورش المعتمدة',
        name: s.name,
        nameAr: s.nameAr,
        description: s.description,
        price: s.price,
        currency: s.currency,
        estimatedDuration: s.estimatedDuration,
        providerName: s.workshop?.nameAr || s.workshop?.name,
      }));

      const comprehensiveCare = comprehensiveCareServices.map((s) => ({
        id: s.id,
        source: 'COMPREHENSIVE_CARE',
        sourceLabelAr: 'العناية الشاملة',
        name: s.name,
        nameAr: s.nameAr,
        description: s.description,
        price: s.pricing?.[0] ? Number(s.pricing[0].basePrice) : null,
        currency: 'SAR',
        estimatedDuration: s.estimatedDuration,
        providerName: s.vendor?.businessNameAr || s.vendor?.businessName,
      }));

      const winchList = winches.map((w) => ({
        id: w.id,
        source: 'WINCH',
        sourceLabelAr: 'الوينشات',
        name: w.name || 'خدمة سحب',
        nameAr: w.nameAr || 'خدمة سحب',
        description: w.description,
        price: w.basePrice,
        currency: w.currency || 'SAR',
        estimatedDuration: null,
        providerName: w.vendor?.businessNameAr || w.vendor?.businessName,
      }));

      const mobileWorkshop = mobileWorkshopServices.map((s) => ({
        id: s.id,
        source: 'MOBILE_WORKSHOP',
        sourceLabelAr: 'الورش المتنقلة',
        name: s.name,
        nameAr: s.nameAr,
        description: s.description,
        price: s.price,
        currency: s.currency,
        estimatedDuration: s.estimatedDuration,
        providerName: s.mobileWorkshop?.nameAr || s.mobileWorkshop?.name,
      }));

      const carWash = carWashVendors.map((v) => ({
        id: `carwash-${v.id}`,
        source: 'CAR_WASH',
        sourceLabelAr: 'ورش الغسيل',
        name: v.businessName || 'غسيل سيارات',
        nameAr: v.businessNameAr || v.businessName || 'غسيل سيارات',
        description: null,
        price: null,
        currency: null,
        estimatedDuration: null,
        providerName: v.businessNameAr || v.businessName,
      }));

      res.json({
        success: true,
        data: {
          certifiedWorkshop,
          comprehensiveCare,
          winches: winchList,
          mobileWorkshop,
          carWash,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
