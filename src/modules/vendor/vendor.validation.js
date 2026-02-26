const { z } = require('zod');

/**
 * Standard Vendor Registration Schema
 * Implements full conditional validation based on user requirements.
 */
const registerVendorSchema = z.object({
    legalName: z.string().min(2, "Legal name is required"),
    tradeName: z.string().optional(),
    supplierType: z.string().min(1, "Supplier type is required"),

    // ✅ نوع الفيندور — يحدد طبيعة عمله في المنصة
    vendorType: z.enum(
        ['AUTO_PARTS', 'COMPREHENSIVE_CARE', 'CERTIFIED_WORKSHOP', 'CAR_WASH', 'ADHMN_AKFEEK'],
        { errorMap: () => ({ message: 'vendorType must be one of: AUTO_PARTS, COMPREHENSIVE_CARE, CERTIFIED_WORKSHOP, CAR_WASH, ADHMN_AKFEEK' }) }
    ).default('AUTO_PARTS'),

    // Address & Registration
    country: z.string().min(1, "Country is required"),
    city: z.string().min(1, "City is required"),
    addressLine1: z.string().min(5, "Full address is required"),
    nationalAddress: z.string().min(1, "National address is required"),
    postalCode: z.string().min(1, "Postal code is required"),
    commercialRegNo: z.string().min(1, "Commercial registration number is required"),
    vatRegistered: z.boolean(),
    vatNumber: z.string().optional(),
    eInvoicingCapable: z.boolean().default(false),

    // Contacts
    website: z.string().url("Invalid website URL").optional().or(z.literal('')),
    companyEmail: z.string().email("Invalid company email"),
    companyPhone: z.string().min(7, "Invalid company phone"),
    contactPersonName: z.string().min(2, "Contact person name is required"),
    contactPersonTitle: z.string().min(1, "Contact person title is required"),
    contactPersonMobile: z.string().min(7, "Invalid mobile number"),

    // Scope Alignment
    mainService: z.string().min(1, "Main service is required"),
    subService: z.string().optional(),
    servicesOffered: z.string().min(1, "Services offered description is required"),
    coverageRegion: z.string().min(1, "Coverage region is required"),
    operatingModel: z.enum(['MARKETPLACE']),
    support24_7: z.boolean().default(false),
    emergencyResponse: z.boolean().default(false),

    // Coverage Cities
    coverageCities: z.array(z.string()).min(1, "At least one coverage city is required"),

    // Capacity
    yearsOfExperience: z.number().int().optional(),
    employeesBand: z.string().optional(),
    monthlyCapacityBand: z.string().optional(),
    fleetCount: z.number().int().optional().default(0),

    // Commercials
    paymentTerms: z.string().optional(),
    currency: z.string().default('SAR'),
    priceListProvided: z.boolean().default(false),
    discountPercent: z.number().min(0).max(100).optional(),
    payoutMethod: z.string().min(1, "Payout method is required"),
    bankName: z.string().optional(),
    iban: z.string().optional(),
}).refine((data) => {
    // If vatRegistered = true -> vatNumber required
    if (data.vatRegistered && (!data.vatNumber || data.vatNumber.trim() === '')) {
        return false;
    }
    return true;
}, {
    message: "VAT Number is required when VAT Registered is checked",
    path: ["vatNumber"],
}).refine((data) => {
    // If payoutMethod = BANK_TRANSFER -> bankName and iban required
    if (data.payoutMethod === 'BANK_TRANSFER' && (!data.bankName || !data.iban)) {
        return false;
    }
    return true;
}, {
    message: "Bank Name and IBAN are required for bank transfer payouts",
    path: ["bankName"],
}).refine((data) => {
    // Validate IBAN starts with SA if country = Saudi Arabia
    if (data.country && (data.country.toLowerCase().includes('saudi') || data.country.toUpperCase() === 'SA')) {
        if (data.iban && !data.iban.toUpperCase().startsWith('SA')) {
            return false;
        }
    }
    return true;
}, {
    message: "IBAN must start with SA for Saudi Arabian accounts",
    path: ["iban"],
});

const updateVendorStatusSchema = z.object({
    status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED'])
});

module.exports = {
    registerVendorSchema,
    updateVendorStatusSchema
};
