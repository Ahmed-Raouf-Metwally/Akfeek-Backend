const express = require('express');
const vendorController = require('./vendor.controller');
const authMiddleware = require('../../api/middlewares/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Vendor Onboarding
 *   description: Vendor registration and approval workflow
 */

/**
 * @swagger
 * /api/vendor-onboarding/register:
 *   post:
 *     summary: Register a new vendor (Public)
 *     tags: [Vendor Onboarding]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [legalName, supplierType, country, city, addressLine1, nationalAddress, postalCode, commercialRegNo, companyEmail, companyPhone, contactPersonName, contactPersonTitle, contactPersonMobile, mainService, servicesOffered, coverageRegion, operatingModel, coverageCities, payoutMethod]
 *             properties:
 *               legalName: { type: string, example: "Al-Futtaim Motors" }
 *               tradeName: { type: string, example: "Toyota Saudi" }
 *               supplierType: { type: string, example: "CORPORATE" }
 *               country: { type: string, example: "Saudi Arabia" }
 *               city: { type: string, example: "Riyadh" }
 *               addressLine1: { type: string, example: "King Fahd Branch Rd, Al Murabbah" }
 *               nationalAddress: { type: string, example: "1234-5678-9012" }
 *               postalCode: { type: string, example: "12613" }
 *               commercialRegNo: { type: string, example: "1010123456" }
 *               vatRegistered: { type: boolean, example: true }
 *               vatNumber: { type: string, example: "310123456700003" }
 *               eInvoicingCapable: { type: boolean, example: true }
 *               website: { type: string, example: "https://toyota.com.sa" }
 *               companyEmail: { type: string, example: "info@toyota.sa" }
 *               companyPhone: { type: string, example: "+966112345678" }
 *               contactPersonName: { type: string, example: "Ahmad Mohammed" }
 *               contactPersonTitle: { type: string, example: "Operations Manager" }
 *               contactPersonMobile: { type: string, example: "+966501234567" }
 *               mainService: { type: string, example: "Mechanical Repair" }
 *               subService: { type: string, example: "Engine Tuning" }
 *               servicesOffered: { type: string, example: "Full engine diagnostic and repair services." }
 *               coverageRegion: { type: string, example: "Central Region" }
 *               operatingModel: { type: string, enum: ["MARKETPLACE"], example: "MARKETPLACE" }
 *               support24_7: { type: boolean, example: true }
 *               emergencyResponse: { type: boolean, example: true }
 *               coverageCities: { type: array, items: { type: string }, example: ["Riyadh", "Jeddah"] }
 *               yearsOfExperience: { type: integer, example: 15 }
 *               employeesBand: { type: string, example: "50-100" }
 *               monthlyCapacityBand: { type: string, example: "500+ vehicles" }
 *               fleetCount: { type: integer, example: 10 }
 *               paymentTerms: { type: string, example: "Net 30" }
 *               currency: { type: string, example: "SAR" }
 *               priceListProvided: { type: boolean, example: true }
 *               discountPercent: { type: number, example: 10.5 }
 *               payoutMethod: { type: string, example: "BANK_TRANSFER" }
 *               bankName: { type: string, example: "Al Rajhi Bank" }
 *               iban: { type: string, example: "SA1234567890123456789012" }
 *     responses:
 *       201:
 *         description: Application submitted
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: CR number or Email already exists
 */
router.post('/register', authMiddleware, vendorController.register);

/**
 * @swagger
 * /api/vendor-onboarding/admin/list:
 *   get:
 *     summary: List all vendor applications (Admin)
 *     tags: [Vendor Onboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, SUSPENDED]
 *     responses:
 *       200:
 *         description: List of vendor applications
 */
router.get('/admin/list', vendorController.listVendors);

/**
 * @swagger
 * /api/vendor-onboarding/admin/{id}/status:
 *   patch:
 *     summary: Update vendor application status (Admin)
 *     tags: [Vendor Onboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED, SUSPENDED]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/admin/:id/status', vendorController.updateStatus);

module.exports = router;
