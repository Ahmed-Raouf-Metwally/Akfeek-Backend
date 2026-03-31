/**
 * Seed one customer who completed and paid all service types,
 * plus a completed Akfeek journey linked to paid bookings.
 *
 * Also ensures:
 * - 5 auto parts for vendor-autoparts-6
 * - 5 services for each service-capable vendor among the provided accounts
 *
 * Run:
 *   node prisma/seed-user-all-services-completed.js
 *   npm run prisma:seed:user-all-services-completed
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const CUSTOMER_EMAIL = 'customer-all-services@akfeek.com';
const CUSTOMER_PASSWORD = 'Customer123!';
const CUSTOMER_PHONE = '+966551111699';

const VENDOR_EMAILS = {
  AUTO_PARTS: 'vendor-autoparts-6@akfeek.com',
  TOWING_SERVICE: 'vendor-winch-6@akfeek.com',
  CERTIFIED_WORKSHOP: 'vendor-certified-workshop-6@akfeek.com',
  COMPREHENSIVE_CARE: 'vendor-care-6@akfeek.com',
  CAR_WASH: 'vendor-carwash-6@akfeek.com',
  MOBILE_WORKSHOP: 'vendor-mobile-workshop-6@akfeek.com',
};

const CARE_SERVICES = [
  { name: 'Care Premium Check', nameAr: 'فحص عناية بريميوم', price: 210, mins: 55 },
  { name: 'Care Oil + Filter', nameAr: 'عناية زيت + فلتر', price: 170, mins: 40 },
  { name: 'Care Brake Package', nameAr: 'باقة فرامل العناية', price: 260, mins: 75 },
  { name: 'Care AC Refresh', nameAr: 'إنعاش تكييف العناية', price: 180, mins: 35 },
  { name: 'Care Battery Service', nameAr: 'خدمة بطارية العناية', price: 145, mins: 25 },
];

const CARWASH_SERVICES = [
  { name: 'Wash Basic', nameAr: 'غسيل أساسي', price: 60, mins: 25 },
  { name: 'Wash Full', nameAr: 'غسيل كامل', price: 95, mins: 45 },
  { name: 'Wash Premium', nameAr: 'غسيل بريميوم', price: 135, mins: 60 },
  { name: 'Wash Interior Deep', nameAr: 'تنظيف داخلي عميق', price: 120, mins: 55 },
  { name: 'Wash Polish', nameAr: 'تلميع غسيل', price: 160, mins: 80 },
];

const WORKSHOP_SERVICES = [
  { type: 'GENERAL', name: 'Workshop General Service', nameAr: 'خدمة ورشة عامة', price: 150, mins: 50 },
  { type: 'DIAGNOSIS', name: 'Workshop Diagnosis', nameAr: 'تشخيص ورشة', price: 130, mins: 40 },
  { type: 'AC', name: 'Workshop AC Service', nameAr: 'خدمة تكييف ورشة', price: 190, mins: 45 },
  { type: 'BRAKE', name: 'Workshop Brake Service', nameAr: 'خدمة فرامل ورشة', price: 240, mins: 85 },
  { type: 'OIL_CHANGE', name: 'Workshop Oil Change', nameAr: 'تغيير زيت ورشة', price: 120, mins: 30 },
];

const MOBILE_SERVICES = [
  { type: 'OIL_CHANGE', name: 'Mobile Oil Change', nameAr: 'زيت متنقل', price: 130, mins: 30 },
  { type: 'TIRE', name: 'Mobile Tire Service', nameAr: 'إطارات متنقلة', price: 95, mins: 35 },
  { type: 'BATTERY', name: 'Mobile Battery Service', nameAr: 'بطارية متنقلة', price: 145, mins: 25 },
  { type: 'BRAKE', name: 'Mobile Brake Service', nameAr: 'فرامل متنقلة', price: 175, mins: 45 },
  { type: 'GENERAL', name: 'Mobile General Check', nameAr: 'فحص متنقل عام', price: 115, mins: 40 },
];

const AUTO_PARTS = [
  { sku: 'AKF-AP6-001', name: 'Brake Pads Set', nameAr: 'طقم فحمات فرامل', price: 220 },
  { sku: 'AKF-AP6-002', name: 'Engine Oil 5W-30', nameAr: 'زيت محرك 5W-30', price: 95 },
  { sku: 'AKF-AP6-003', name: 'Oil Filter', nameAr: 'فلتر زيت', price: 40 },
  { sku: 'AKF-AP6-004', name: 'Air Filter', nameAr: 'فلتر هواء', price: 45 },
  { sku: 'AKF-AP6-005', name: 'Battery 70Ah', nameAr: 'بطارية 70 أمبير', price: 350 },
];

function sar(v) {
  return Number(Number(v).toFixed(2));
}

async function getRequiredVendors() {
  const users = await prisma.user.findMany({
    where: { email: { in: Object.values(VENDOR_EMAILS) } },
    include: { vendorProfile: true },
  });
  const byEmail = new Map(users.map((u) => [u.email, u]));
  const result = {};

  for (const [key, email] of Object.entries(VENDOR_EMAILS)) {
    const user = byEmail.get(email);
    if (!user?.vendorProfile) {
      throw new Error(`Vendor account missing or has no vendorProfile: ${email}. Run prisma:seed:6vendors-linked first.`);
    }
    result[key] = { user, vendor: user.vendorProfile };
  }
  return result;
}

async function ensureCustomer() {
  const hash = await bcrypt.hash(CUSTOMER_PASSWORD, 10);
  const customer = await prisma.user.upsert({
    where: { email: CUSTOMER_EMAIL },
    update: {
      role: 'CUSTOMER',
      status: 'ACTIVE',
      passwordHash: hash,
      phone: CUSTOMER_PHONE,
      emailVerified: true,
      phoneVerified: true,
      profile: {
        upsert: {
          update: { firstName: 'All', lastName: 'Services' },
          create: { firstName: 'All', lastName: 'Services' },
        },
      },
    },
    create: {
      email: CUSTOMER_EMAIL,
      phone: CUSTOMER_PHONE,
      passwordHash: hash,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      emailVerified: true,
      phoneVerified: true,
      profile: { create: { firstName: 'All', lastName: 'Services' } },
    },
  });
  return customer;
}

async function ensureAddress(customerId) {
  const existing = await prisma.address.findFirst({
    where: { userId: customerId, label: 'All Services Home' },
  });
  if (existing) return existing;
  return prisma.address.create({
    data: {
      userId: customerId,
      label: 'All Services Home',
      labelAr: 'منزل كل الخدمات',
      street: 'King Fahd Road',
      streetAr: 'طريق الملك فهد',
      city: 'Riyadh',
      cityAr: 'الرياض',
      country: 'SA',
      latitude: 24.7136,
      longitude: 46.6753,
      isDefault: true,
    },
  });
}

async function ensureVehicle(customerId) {
  const model =
    (await prisma.vehicleModel.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })) || null;
  if (!model) throw new Error('No VehicleModel found. Run base vehicle seeds first.');

  const existing = await prisma.userVehicle.findFirst({
    where: { userId: customerId, plateDigits: '9606' },
  });
  if (existing) return existing;

  return prisma.userVehicle.create({
    data: {
      userId: customerId,
      vehicleModelId: model.id,
      ownerName: 'All Services Customer',
      plateLettersAr: 'ا ك ف',
      plateLettersEn: 'AKF',
      plateDigits: '9606',
      plateRegion: 'R',
      color: 'White',
      fuelType: 'Petrol',
      isDefault: true,
    },
  });
}

async function ensureServiceWithPricing(vendorId, serviceDef, category) {
  let service = await prisma.service.findFirst({
    where: { vendorId, name: serviceDef.name, category },
  });
  if (!service) {
    service = await prisma.service.create({
      data: {
        name: serviceDef.name,
        nameAr: serviceDef.nameAr,
        description: serviceDef.name,
        descriptionAr: serviceDef.nameAr,
        type: 'CATALOG',
        category,
        vendorId,
        estimatedDuration: serviceDef.mins,
        isActive: true,
        requiresVehicle: true,
      },
    });
  } else {
    service = await prisma.service.update({
      where: { id: service.id },
      data: { isActive: true, estimatedDuration: serviceDef.mins },
    });
  }

  await prisma.servicePricing.upsert({
    where: {
      serviceId_vehicleType: {
        serviceId: service.id,
        vehicleType: 'سيدان',
      },
    },
    update: { basePrice: serviceDef.price, isActive: true },
    create: {
      serviceId: service.id,
      vehicleType: 'سيدان',
      basePrice: serviceDef.price,
    },
  });

  return service;
}

async function ensureFiveServicesForComprehensive(vendorId) {
  const out = [];
  for (const svc of CARE_SERVICES) {
    out.push(await ensureServiceWithPricing(vendorId, svc, 'COMPREHENSIVE_CARE'));
  }
  return out;
}

async function ensureFiveServicesForCarwash(vendorId) {
  const out = [];
  for (const svc of CARWASH_SERVICES) {
    out.push(await ensureServiceWithPricing(vendorId, svc, 'CLEANING'));
  }
  return out;
}

async function ensureWorkshopAndFiveServices(vendor) {
  let workshop = await prisma.certifiedWorkshop.findFirst({ where: { vendorId: vendor.id } });
  if (!workshop) {
    workshop = await prisma.certifiedWorkshop.create({
      data: {
        name: 'Akfeek Certified Workshop 6',
        nameAr: 'أكفيك ورشة معتمدة 6',
        description: 'Seeded certified workshop',
        descriptionAr: 'ورشة معتمدة للسييد',
        address: 'Riyadh, Olaya',
        addressAr: 'الرياض، العليا',
        city: 'Riyadh',
        cityAr: 'الرياض',
        latitude: 24.7112,
        longitude: 46.6824,
        phone: vendor.contactPhone,
        email: vendor.contactEmail,
        services: JSON.stringify(WORKSHOP_SERVICES.map((s) => s.type)),
        isActive: true,
        isVerified: true,
        verifiedAt: new Date(),
        vendorId: vendor.id,
      },
    });
  }

  const services = [];
  for (const svc of WORKSHOP_SERVICES) {
    const existing = await prisma.certifiedWorkshopService.findFirst({
      where: { workshopId: workshop.id, serviceType: svc.type, name: svc.name },
    });
    if (existing) {
      services.push(
        await prisma.certifiedWorkshopService.update({
          where: { id: existing.id },
          data: { nameAr: svc.nameAr, price: svc.price, estimatedDuration: svc.mins, isActive: true },
        })
      );
    } else {
      services.push(
        await prisma.certifiedWorkshopService.create({
          data: {
            workshopId: workshop.id,
            serviceType: svc.type,
            name: svc.name,
            nameAr: svc.nameAr,
            description: svc.name,
            price: svc.price,
            currency: 'SAR',
            estimatedDuration: svc.mins,
            isActive: true,
          },
        })
      );
    }
  }

  return { workshop, services };
}

async function ensureMobileWorkshopAndFiveServices(vendor) {
  let mobile = await prisma.mobileWorkshop.findFirst({ where: { vendorId: vendor.id } });
  if (!mobile) {
    let plate = 'AKFMW9606';
    const plateExists = await prisma.mobileWorkshop.findFirst({ where: { plateNumber: plate } });
    if (plateExists) plate = `AKFMW${Date.now().toString().slice(-6)}`;

    mobile = await prisma.mobileWorkshop.create({
      data: {
        name: 'Akfeek Mobile 6',
        nameAr: 'أكفيك متنقل 6',
        description: 'Seeded mobile workshop',
        vehicleType: 'Van',
        vehicleModel: 'Ford Transit',
        year: new Date().getFullYear(),
        plateNumber: plate,
        city: 'Riyadh',
        latitude: 24.7241,
        longitude: 46.6664,
        serviceRadius: 50,
        basePrice: 115,
        pricePerKm: 2.1,
        minPrice: 80,
        isActive: true,
        isAvailable: true,
        isVerified: true,
        verifiedAt: new Date(),
        vendorId: vendor.id,
      },
    });
  }

  const services = [];
  for (const svc of MOBILE_SERVICES) {
    const existing = await prisma.mobileWorkshopService.findFirst({
      where: { mobileWorkshopId: mobile.id, serviceType: svc.type, name: svc.name },
    });
    if (existing) {
      services.push(
        await prisma.mobileWorkshopService.update({
          where: { id: existing.id },
          data: { nameAr: svc.nameAr, price: svc.price, estimatedDuration: svc.mins, isActive: true },
        })
      );
    } else {
      services.push(
        await prisma.mobileWorkshopService.create({
          data: {
            mobileWorkshopId: mobile.id,
            serviceType: svc.type,
            name: svc.name,
            nameAr: svc.nameAr,
            description: svc.name,
            price: svc.price,
            currency: 'SAR',
            estimatedDuration: svc.mins,
            isActive: true,
          },
        })
      );
    }
  }
  return { mobile, services };
}

async function ensureFiveAutoPartsForVendor(vendor, createdByUserId) {
  const category =
    (await prisma.autoPartCategory.findFirst({
      where: { isActive: true, rootType: 'CAR' },
      select: { id: true },
    })) ||
    (await prisma.autoPartCategory.findFirst({ where: { isActive: true }, select: { id: true } }));

  if (!category) throw new Error('No auto part category found for creating parts.');

  const parts = [];
  for (const p of AUTO_PARTS) {
    parts.push(
      await prisma.autoPart.upsert({
        where: { sku: p.sku },
        update: {
          name: p.name,
          nameAr: p.nameAr,
          vendorId: vendor.id,
          createdByUserId,
          categoryId: category.id,
          brand: 'Akfeek',
          price: p.price,
          stockQuantity: 40,
          isActive: true,
          isApproved: true,
          approvedAt: new Date(),
        },
        create: {
          sku: p.sku,
          name: p.name,
          nameAr: p.nameAr,
          description: `Seed part ${p.name}`,
          descriptionAr: `قطعة غيار ${p.nameAr}`,
          vendorId: vendor.id,
          createdByUserId,
          categoryId: category.id,
          brand: 'Akfeek',
          price: p.price,
          stockQuantity: 40,
          lowStockThreshold: 5,
          isActive: true,
          isApproved: true,
          approvedAt: new Date(),
        },
      })
    );
  }
  return parts;
}

async function upsertBookingWithService({
  bookingNumber,
  customerId,
  vehicleId,
  addressId,
  status = 'COMPLETED',
  workshopId = null,
  mobileWorkshopId = null,
  deliveryMethod = null,
  serviceLine,
  notes,
}) {
  const subtotal = sar(serviceLine.totalPrice);
  const total = subtotal;

  const booking = await prisma.booking.upsert({
    where: { bookingNumber },
    update: {
      customerId,
      vehicleId,
      addressId,
      workshopId,
      mobileWorkshopId,
      deliveryMethod,
      subtotal,
      totalPrice: total,
      tax: 0,
      discount: 0,
      laborFee: 0,
      deliveryFee: 0,
      partsTotal: 0,
      status,
      completedAt: new Date(),
      notes,
      scheduledDate: new Date(),
      scheduledTime: '12:00',
    },
    create: {
      bookingNumber,
      customerId,
      vehicleId,
      addressId,
      workshopId,
      mobileWorkshopId,
      deliveryMethod,
      subtotal,
      totalPrice: total,
      tax: 0,
      discount: 0,
      laborFee: 0,
      deliveryFee: 0,
      partsTotal: 0,
      status,
      completedAt: new Date(),
      notes,
      scheduledDate: new Date(),
      scheduledTime: '12:00',
    },
  });

  await prisma.bookingService.deleteMany({ where: { bookingId: booking.id } });
  await prisma.bookingService.create({
    data: {
      bookingId: booking.id,
      serviceId: serviceLine.serviceId || null,
      workshopServiceId: serviceLine.workshopServiceId || null,
      mobileWorkshopServiceId: serviceLine.mobileWorkshopServiceId || null,
      quantity: 1,
      unitPrice: serviceLine.unitPrice,
      totalPrice: serviceLine.totalPrice,
      estimatedMinutes: serviceLine.estimatedMinutes || null,
    },
  });

  return booking;
}

async function upsertTowingBooking({
  bookingNumber,
  customerId,
  vehicleId,
  addressId,
  winchId,
  bidAmount,
  notes,
}) {
  const total = sar(bidAmount);
  const booking = await prisma.booking.upsert({
    where: { bookingNumber },
    update: {
      customerId,
      vehicleId,
      addressId,
      status: 'COMPLETED',
      subtotal: total,
      totalPrice: total,
      pickupLat: 24.7136,
      pickupLng: 46.6753,
      pickupAddress: 'Riyadh pickup point',
      destinationLat: 24.7204,
      destinationLng: 46.6827,
      destinationAddress: 'Riyadh destination',
      notes,
      completedAt: new Date(),
    },
    create: {
      bookingNumber,
      customerId,
      vehicleId,
      addressId,
      status: 'COMPLETED',
      subtotal: total,
      totalPrice: total,
      pickupLat: 24.7136,
      pickupLng: 46.6753,
      pickupAddress: 'Riyadh pickup point',
      destinationLat: 24.7204,
      destinationLng: 46.6827,
      destinationAddress: 'Riyadh destination',
      notes,
      completedAt: new Date(),
    },
  });

  let broadcast = await prisma.jobBroadcast.findUnique({ where: { bookingId: booking.id } });
  if (!broadcast) {
    broadcast = await prisma.jobBroadcast.create({
      data: {
        bookingId: booking.id,
        customerId,
        addressId,
        latitude: 24.7136,
        longitude: 46.6753,
        locationAddress: 'Riyadh pickup point',
        broadcastUntil: new Date(Date.now() + 60 * 60 * 1000),
        description: 'Tow request completed in seed',
        estimatedBudget: total,
        status: 'TECHNICIAN_SELECTED',
      },
    });
  } else {
    broadcast = await prisma.jobBroadcast.update({
      where: { id: broadcast.id },
      data: { status: 'TECHNICIAN_SELECTED', estimatedBudget: total },
    });
  }

  const offer = await prisma.jobOffer.upsert({
    where: {
      // composite unique doesn't exist, so use deterministic id strategy through findFirst
      id: (await prisma.jobOffer.findFirst({
        where: { broadcastId: broadcast.id, winchId },
        select: { id: true },
      }))?.id || '00000000-0000-0000-0000-000000000000',
    },
    update: {
      bidAmount: total,
      estimatedArrival: 20,
      status: 'ACCEPTED',
      isSelected: true,
      winchId,
      broadcastId: broadcast.id,
    },
    create: {
      broadcastId: broadcast.id,
      winchId,
      bidAmount: total,
      estimatedArrival: 20,
      status: 'ACCEPTED',
      isSelected: true,
    },
  }).catch(async () => {
    const existing = await prisma.jobOffer.findFirst({
      where: { broadcastId: broadcast.id, winchId },
    });
    if (existing) {
      return prisma.jobOffer.update({
        where: { id: existing.id },
        data: { bidAmount: total, estimatedArrival: 20, status: 'ACCEPTED', isSelected: true },
      });
    }
    return prisma.jobOffer.create({
      data: {
        broadcastId: broadcast.id,
        winchId,
        bidAmount: total,
        estimatedArrival: 20,
        status: 'ACCEPTED',
        isSelected: true,
      },
    });
  });

  await prisma.bookingService.deleteMany({ where: { bookingId: booking.id } });
  await prisma.bookingService.create({
    data: {
      bookingId: booking.id,
      quantity: 1,
      unitPrice: total,
      totalPrice: total,
      estimatedMinutes: 45,
    },
  });

  return { booking, broadcast, offer };
}

async function upsertPaidInvoiceForBooking({
  booking,
  customerId,
  invoiceNumber,
  paymentNumber,
  amount,
  description,
  itemType = 'SERVICE',
}) {
  const total = sar(amount);
  const invoice = await prisma.invoice.upsert({
    where: { bookingId: booking.id },
    update: {
      invoiceNumber,
      customerId,
      subtotal: total,
      tax: 0,
      discount: 0,
      totalAmount: total,
      paidAmount: total,
      status: 'PAID',
      paidAt: new Date(),
    },
    create: {
      invoiceNumber,
      bookingId: booking.id,
      customerId,
      subtotal: total,
      tax: 0,
      discount: 0,
      totalAmount: total,
      paidAmount: total,
      status: 'PAID',
      paidAt: new Date(),
    },
  });

  await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: invoice.id } });
  await prisma.invoiceLineItem.create({
    data: {
      invoiceId: invoice.id,
      description,
      descriptionAr: description,
      itemType,
      quantity: 1,
      unitPrice: total,
      totalPrice: total,
    },
  });

  await prisma.payment.upsert({
    where: { paymentNumber },
    update: {
      invoiceId: invoice.id,
      customerId,
      amount: total,
      method: 'CARD',
      status: 'COMPLETED',
      processedAt: new Date(),
    },
    create: {
      paymentNumber,
      invoiceId: invoice.id,
      customerId,
      amount: total,
      method: 'CARD',
      status: 'COMPLETED',
      processedAt: new Date(),
    },
  });

  return invoice;
}

async function ensureCompletedAkfeekJourney({
  customerId,
  vehicleId,
  insuranceTowBookingId,
  towToWorkshopBookingId,
  workshopBookingId,
  returnHomeBookingId,
}) {
  let journey = await prisma.akfeekJourney.findFirst({
    where: { workshopBookingId },
  });

  if (!journey) {
    journey = await prisma.akfeekJourney.create({
      data: {
        customerId,
        vehicleId,
        status: 'COMPLETED',
        currentStep: 'POST_REPAIR_TOW_HOME',
        insuranceTowBookingId,
        towToWorkshopBookingId,
        workshopBookingId,
        returnHomeBookingId,
        insuranceTowSkipped: false,
        insuranceDocsSkipped: false,
        insuranceDocsCompleted: true,
        towToWorkshopSkipped: false,
        workshopSkipped: false,
        returnHomeDeclined: false,
      },
    });
  } else {
    journey = await prisma.akfeekJourney.update({
      where: { id: journey.id },
      data: {
        customerId,
        vehicleId,
        status: 'COMPLETED',
        currentStep: 'POST_REPAIR_TOW_HOME',
        insuranceTowBookingId,
        towToWorkshopBookingId,
        workshopBookingId,
        returnHomeBookingId,
        insuranceTowSkipped: false,
        insuranceDocsSkipped: false,
        insuranceDocsCompleted: true,
        towToWorkshopSkipped: false,
        workshopSkipped: false,
        returnHomeDeclined: false,
      },
    });
  }

  const existingDoc = await prisma.akfeekJourneyDocument.findFirst({
    where: { journeyId: journey.id, label: 'repair_auth' },
  });
  if (!existingDoc) {
    await prisma.akfeekJourneyDocument.create({
      data: {
        journeyId: journey.id,
        label: 'repair_auth',
        fileUrl: '/uploads/akfeek/seed-repair-auth.pdf',
        mimeType: 'application/pdf',
        originalName: 'repair-auth.pdf',
      },
    });
  }

  return journey;
}

async function main() {
  console.log('🌱 Seeding completed customer + all services + Akfeek completed journey...');

  const vendors = await getRequiredVendors();
  const customer = await ensureCustomer();
  const address = await ensureAddress(customer.id);
  const vehicle = await ensureVehicle(customer.id);

  const autoParts = await ensureFiveAutoPartsForVendor(vendors.AUTO_PARTS.vendor, vendors.AUTO_PARTS.user.id);
  const careServices = await ensureFiveServicesForComprehensive(vendors.COMPREHENSIVE_CARE.vendor.id);
  const carwashServices = await ensureFiveServicesForCarwash(vendors.CAR_WASH.vendor.id);
  const { workshop, services: workshopServices } = await ensureWorkshopAndFiveServices(
    vendors.CERTIFIED_WORKSHOP.vendor
  );
  const { mobile, services: mobileServices } = await ensureMobileWorkshopAndFiveServices(
    vendors.MOBILE_WORKSHOP.vendor
  );

  const winch = await prisma.winch.findFirst({
    where: { vendorId: vendors.TOWING_SERVICE.vendor.id },
  });
  if (!winch) {
    throw new Error('Winch vendor has no winch. Run prisma:seed:6vendors-linked first.');
  }

  // Standalone completed paid bookings across service types
  const careBooking = await upsertBookingWithService({
    bookingNumber: 'BKG-SEED-ALL-CARE-001',
    customerId: customer.id,
    vehicleId: vehicle.id,
    addressId: address.id,
    serviceLine: {
      serviceId: careServices[0].id,
      unitPrice: careServices[0].pricing?.[0]?.basePrice || CARE_SERVICES[0].price,
      totalPrice: careServices[0].pricing?.[0]?.basePrice || CARE_SERVICES[0].price,
      estimatedMinutes: careServices[0].estimatedDuration,
    },
    notes: 'Seed: completed comprehensive care booking',
  });

  const carwashBooking = await upsertBookingWithService({
    bookingNumber: 'BKG-SEED-ALL-WASH-001',
    customerId: customer.id,
    vehicleId: vehicle.id,
    addressId: address.id,
    serviceLine: {
      serviceId: carwashServices[0].id,
      unitPrice: CARWASH_SERVICES[0].price,
      totalPrice: CARWASH_SERVICES[0].price,
      estimatedMinutes: carwashServices[0].estimatedDuration,
    },
    notes: 'Seed: completed car wash booking',
  });

  const mobileBooking = await upsertBookingWithService({
    bookingNumber: 'BKG-SEED-ALL-MOBILE-001',
    customerId: customer.id,
    vehicleId: vehicle.id,
    addressId: address.id,
    mobileWorkshopId: mobile.id,
    serviceLine: {
      mobileWorkshopServiceId: mobileServices[0].id,
      unitPrice: mobileServices[0].price,
      totalPrice: mobileServices[0].price,
      estimatedMinutes: mobileServices[0].estimatedDuration,
    },
    notes: 'Seed: completed mobile workshop booking',
  });

  // Akfeek journey linked bookings
  const { booking: insuranceTowBooking } = await upsertTowingBooking({
    bookingNumber: 'BKG-SEED-AKF-TOW-INS-001',
    customerId: customer.id,
    vehicleId: vehicle.id,
    addressId: address.id,
    winchId: winch.id,
    bidAmount: 160,
    notes: 'Seed: Akfeek insurance tow',
  });

  const { booking: towToWorkshopBooking } = await upsertTowingBooking({
    bookingNumber: 'BKG-SEED-AKF-TOW-WS-001',
    customerId: customer.id,
    vehicleId: vehicle.id,
    addressId: address.id,
    winchId: winch.id,
    bidAmount: 140,
    notes: 'Seed: Akfeek tow to workshop',
  });

  const workshopBooking = await upsertBookingWithService({
    bookingNumber: 'BKG-SEED-AKF-WS-001',
    customerId: customer.id,
    vehicleId: vehicle.id,
    addressId: address.id,
    workshopId: workshop.id,
    deliveryMethod: 'SELF_DELIVERY',
    serviceLine: {
      workshopServiceId: workshopServices[0].id,
      unitPrice: workshopServices[0].price,
      totalPrice: workshopServices[0].price,
      estimatedMinutes: workshopServices[0].estimatedDuration,
    },
    notes: 'Seed: Akfeek workshop booking',
  });

  const { booking: returnHomeBooking } = await upsertTowingBooking({
    bookingNumber: 'BKG-SEED-AKF-TOW-HOME-001',
    customerId: customer.id,
    vehicleId: vehicle.id,
    addressId: address.id,
    winchId: winch.id,
    bidAmount: 150,
    notes: 'Seed: Akfeek return home tow',
  });

  // Link one of autoparts into workshop booking to represent spare part usage
  await prisma.bookingAutoPart.deleteMany({
    where: { bookingId: workshopBooking.id, vendorId: vendors.AUTO_PARTS.vendor.id },
  });
  await prisma.bookingAutoPart.create({
    data: {
      bookingId: workshopBooking.id,
      autoPartId: autoParts[0].id,
      vendorId: vendors.AUTO_PARTS.vendor.id,
      quantity: 1,
      unitPrice: autoParts[0].price,
      totalPrice: autoParts[0].price,
    },
  });

  const invoicesData = [
    { booking: careBooking, no: 'INV-SEED-ALL-CARE-001', payNo: 'PAY-SEED-ALL-CARE-001', amount: careBooking.totalPrice, desc: 'Comprehensive care service' },
    { booking: carwashBooking, no: 'INV-SEED-ALL-WASH-001', payNo: 'PAY-SEED-ALL-WASH-001', amount: carwashBooking.totalPrice, desc: 'Car wash service' },
    { booking: mobileBooking, no: 'INV-SEED-ALL-MOBILE-001', payNo: 'PAY-SEED-ALL-MOBILE-001', amount: mobileBooking.totalPrice, desc: 'Mobile workshop service' },
    { booking: insuranceTowBooking, no: 'INV-SEED-AKF-TOW-INS-001', payNo: 'PAY-SEED-AKF-TOW-INS-001', amount: insuranceTowBooking.totalPrice, desc: 'Akfeek insurance tow' },
    { booking: towToWorkshopBooking, no: 'INV-SEED-AKF-TOW-WS-001', payNo: 'PAY-SEED-AKF-TOW-WS-001', amount: towToWorkshopBooking.totalPrice, desc: 'Akfeek tow to workshop' },
    { booking: workshopBooking, no: 'INV-SEED-AKF-WS-001', payNo: 'PAY-SEED-AKF-WS-001', amount: workshopBooking.totalPrice, desc: 'Akfeek workshop service' },
    { booking: returnHomeBooking, no: 'INV-SEED-AKF-TOW-HOME-001', payNo: 'PAY-SEED-AKF-TOW-HOME-001', amount: returnHomeBooking.totalPrice, desc: 'Akfeek return home tow' },
  ];

  for (const inv of invoicesData) {
    await upsertPaidInvoiceForBooking({
      booking: inv.booking,
      customerId: customer.id,
      invoiceNumber: inv.no,
      paymentNumber: inv.payNo,
      amount: inv.amount,
      description: inv.desc,
    });
  }

  await ensureCompletedAkfeekJourney({
    customerId: customer.id,
    vehicleId: vehicle.id,
    insuranceTowBookingId: insuranceTowBooking.id,
    towToWorkshopBookingId: towToWorkshopBooking.id,
    workshopBookingId: workshopBooking.id,
    returnHomeBookingId: returnHomeBooking.id,
  });

  console.log('\n✅ Seed completed successfully.');
  console.log(`Customer login: ${CUSTOMER_EMAIL} / ${CUSTOMER_PASSWORD}`);
  console.log('Vendors used:');
  Object.entries(VENDOR_EMAILS).forEach(([k, v]) => console.log(`- ${k}: ${v} / Vendor123!`));
}

main()
  .catch((e) => {
    console.error('❌ seed-user-all-services-completed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
