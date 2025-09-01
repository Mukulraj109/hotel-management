import CorporateCompany from '../models/CorporateCompany.js';
import CorporateCredit from '../models/CorporateCredit.js';
import GroupBooking from '../models/GroupBooking.js';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';
import APIFeatures from '../utils/apiFeatures.js';

/**
 * @swagger
 * tags:
 *   name: Corporate
 *   description: Corporate booking and company management
 */

/**
 * @swagger
 * /api/v1/corporate/companies:
 *   post:
 *     summary: Create a new corporate company
 *     tags: [Corporate]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CorporateCompany'
 *     responses:
 *       201:
 *         description: Corporate company created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
export const createCorporateCompany = catchAsync(async (req, res, next) => {
  // Add hotel ID and created by from authenticated user
  const companyData = {
    ...req.body,
    hotelId: req.user.hotelId,
    'metadata.createdBy': req.user.id
  };

  const company = await CorporateCompany.create(companyData);
  
  res.status(201).json({
    status: 'success',
    data: {
      company
    }
  });
});

/**
 * @swagger
 * /api/v1/corporate/companies:
 *   get:
 *     summary: Get all corporate companies
 *     tags: [Corporate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of results per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort by field
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of corporate companies
 */
export const getAllCorporateCompanies = catchAsync(async (req, res, next) => {
  // Filter by hotel ID
  const filter = { hotelId: req.user.hotelId };
  
  const features = new APIFeatures(CorporateCompany.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
    
  const companies = await features.query;
  
  res.status(200).json({
    status: 'success',
    results: companies.length,
    data: {
      companies
    }
  });
});

/**
 * @swagger
 * /api/v1/corporate/companies/{id}:
 *   get:
 *     summary: Get a corporate company by ID
 *     tags: [Corporate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Corporate company ID
 *     responses:
 *       200:
 *         description: Corporate company details
 *       404:
 *         description: Company not found
 */
export const getCorporateCompany = catchAsync(async (req, res, next) => {
  const company = await CorporateCompany.findOne({
    _id: req.params.id,
    hotelId: req.user.hotelId
  });
  
  if (!company) {
    return next(new AppError('Corporate company not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      company
    }
  });
});

/**
 * @swagger
 * /api/v1/corporate/companies/{id}:
 *   patch:
 *     summary: Update a corporate company
 *     tags: [Corporate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Corporate company ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CorporateCompany'
 *     responses:
 *       200:
 *         description: Company updated successfully
 *       404:
 *         description: Company not found
 */
export const updateCorporateCompany = catchAsync(async (req, res, next) => {
  // Add last modified by
  const updateData = {
    ...req.body,
    'metadata.lastModifiedBy': req.user.id
  };
  
  const company = await CorporateCompany.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.user.hotelId },
    updateData,
    {
      new: true,
      runValidators: true
    }
  );
  
  if (!company) {
    return next(new AppError('Corporate company not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      company
    }
  });
});

/**
 * @swagger
 * /api/v1/corporate/companies/{id}:
 *   delete:
 *     summary: Delete a corporate company (soft delete)
 *     tags: [Corporate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Corporate company ID
 *     responses:
 *       204:
 *         description: Company deleted successfully
 *       404:
 *         description: Company not found
 */
export const deleteCorporateCompany = catchAsync(async (req, res, next) => {
  const company = await CorporateCompany.findOneAndUpdate(
    { _id: req.params.id, hotelId: req.user.hotelId },
    { isActive: false, 'metadata.lastModifiedBy': req.user.id },
    { new: true }
  );
  
  if (!company) {
    return next(new AppError('Corporate company not found', 404));
  }
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

/**
 * @swagger
 * /api/v1/corporate/companies/{id}/credit-summary:
 *   get:
 *     summary: Get credit summary for a corporate company
 *     tags: [Corporate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Corporate company ID
 *     responses:
 *       200:
 *         description: Credit summary
 *       404:
 *         description: Company not found
 */
export const getCorporateCompanyCreditSummary = catchAsync(async (req, res, next) => {
  const company = await CorporateCompany.findOne({
    _id: req.params.id,
    hotelId: req.user.hotelId
  });
  
  if (!company) {
    return next(new AppError('Corporate company not found', 404));
  }
  
  const creditSummary = await CorporateCredit.getCreditSummary(
    req.params.id,
    req.user.hotelId
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      company: {
        name: company.name,
        creditLimit: company.creditLimit,
        availableCredit: company.availableCredit
      },
      creditSummary
    }
  });
});

/**
 * @swagger
 * /api/v1/corporate/companies/{id}/bookings:
 *   get:
 *     summary: Get all bookings for a corporate company
 *     tags: [Corporate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Corporate company ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by booking status
 *     responses:
 *       200:
 *         description: List of company bookings
 */
export const getCorporateCompanyBookings = catchAsync(async (req, res, next) => {
  const company = await CorporateCompany.findOne({
    _id: req.params.id,
    hotelId: req.user.hotelId
  });
  
  if (!company) {
    return next(new AppError('Corporate company not found', 404));
  }
  
  const filter = {
    hotelId: req.user.hotelId,
    corporateCompanyId: req.params.id
  };
  
  if (req.query.status) {
    filter.status = req.query.status;
  }
  
  const features = new APIFeatures(GroupBooking.find(filter), req.query)
    .sort()
    .limitFields()
    .paginate();
    
  const bookings = await features.query.populate('rooms.bookingId');
  
  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: {
      bookings
    }
  });
});

/**
 * @swagger
 * /api/v1/corporate/companies/low-credit:
 *   get:
 *     summary: Get companies with low credit
 *     tags: [Corporate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: number
 *         description: Credit threshold amount
 *     responses:
 *       200:
 *         description: List of companies with low credit
 */
export const getLowCreditCompanies = catchAsync(async (req, res, next) => {
  const threshold = req.query.threshold || 10000;
  
  const companies = await CorporateCompany.find({
    hotelId: req.user.hotelId,
    isActive: true,
    availableCredit: { $lt: threshold }
  }).select('name email phone availableCredit creditLimit');
  
  res.status(200).json({
    status: 'success',
    results: companies.length,
    data: {
      companies,
      threshold
    }
  });
});

/**
 * @swagger
 * /api/v1/corporate/companies/{id}/update-credit:
 *   patch:
 *     summary: Update corporate company credit
 *     tags: [Corporate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Corporate company ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to add/subtract from available credit
 *               description:
 *                 type: string
 *                 description: Description of the credit adjustment
 *     responses:
 *       200:
 *         description: Credit updated successfully
 *       404:
 *         description: Company not found
 */
export const updateCorporateCredit = catchAsync(async (req, res, next) => {
  const { amount, description } = req.body;
  
  const company = await CorporateCompany.findOne({
    _id: req.params.id,
    hotelId: req.user.hotelId
  });
  
  if (!company) {
    return next(new AppError('Corporate company not found', 404));
  }
  
  // Update available credit
  await company.updateAvailableCredit(amount);
  
  // Create credit transaction record
  await CorporateCredit.create({
    hotelId: req.user.hotelId,
    corporateCompanyId: req.params.id,
    transactionType: amount > 0 ? 'credit' : 'adjustment',
    amount: Math.abs(amount),
    balance: company.availableCredit,
    description: description || 'Manual credit adjustment',
    status: 'processed',
    metadata: {
      createdBy: req.user.id,
      source: 'manual'
    }
  });
  
  res.status(200).json({
    status: 'success',
    data: {
      company: {
        id: company._id,
        name: company.name,
        previousCredit: company.availableCredit - amount,
        newCredit: company.availableCredit,
        adjustment: amount
      }
    }
  });
});