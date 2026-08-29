import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getRepositories } from '../repositories/factory';
import { PRE_SEEDED_GROUPS, PRE_SEEDED_LEDGERS } from '../config/constants';
import { getStateFromGSTIN } from '../utils/gstValidator';
import { getLogosDir } from '../config/paths';

const router = Router();

// Multer setup for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = getLogosDir();
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `company_logo_${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

/**
 * GET /api/companies - List all companies
 */
router.get('/', async (req, res) => {
  try {
    const repos = getRepositories();
    const companies = await repos.companies.findAll();
    res.json({ success: true, data: companies });
  } catch (err: any) {
    res.json({ success: true, data: [], dbOffline: true, error: err.message });
  }
});

/**
 * GET /api/companies/:id - Get company by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const repos = getRepositories();
    const company = await repos.companies.findById(req.params.id);
    if (!company) return res.status(404).json({ success: false, error: 'Company not found' });
    res.json({ success: true, data: company });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/companies/:id/next-invoice-number - Compute next sequential GST invoice number
 */
router.get('/:id/next-invoice-number', async (req, res) => {
  try {
    const repos = getRepositories();
    const company = await repos.companies.findById(req.params.id);
    if (!company) return res.status(404).json({ success: false, error: 'Company not found' });

    const prefix = company.invoicePrefix || 'INV/';
    const suffix = company.invoiceSuffix || '';
    let nextSeq = Number(company.invoiceNumberSeq) || 1;

    // Verify against existing invoices in the database to prevent duplicate numbering
    const existingInvoices = await repos.invoices.findByCompany(company._id);
    if (existingInvoices && existingInvoices.length > 0) {
      for (const inv of existingInvoices) {
        const numStr = inv.invoiceNumber || '';
        if (numStr.startsWith(prefix)) {
          const middle = numStr.substring(prefix.length, suffix ? numStr.length - suffix.length : undefined);
          const parsed = parseInt(middle, 10);
          if (!isNaN(parsed) && parsed >= nextSeq) {
            nextSeq = parsed + 1;
          }
        }
      }
    }

    const formattedInvoiceNumber = `${prefix}${String(nextSeq).padStart(4, '0')}${suffix}`;
    res.json({
      success: true,
      nextSeq,
      formattedInvoiceNumber,
      prefix,
      suffix,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/companies - Create a new company & seed Chart of Accounts
 */
router.post('/', async (req, res) => {
  try {
    const {
      legalName,
      tradeName,
      gstin,
      pan,
      address,
      contact,
      bankDetails,
      financialYearStart,
      currentFY,
      invoicePrefix,
      defaultTemplate,
      termsAndConditions,
      notes,
    } = req.body;

    if (!legalName) {
      return res.status(400).json({ success: false, error: 'Company legal name is required' });
    }

    // Auto-derive state code and PAN if GSTIN is provided
    let state = address?.state || 'Bihar';
    let stateCode = address?.stateCode || '10';
    let derivedPan = pan || '';

    if (gstin && gstin.trim().length >= 2) {
      const derived = getStateFromGSTIN(gstin.trim().toUpperCase());
      state = derived.stateName;
      stateCode = derived.stateCode;
      if (!derivedPan && gstin.length >= 12) {
        derivedPan = gstin.substring(2, 12);
      }
    }

    const repos = getRepositories();

    const savedCompany = await repos.companies.create({
      legalName,
      tradeName: tradeName || legalName,
      gstin: (gstin || '').toUpperCase(),
      pan: derivedPan.toUpperCase(),
      address: {
        line1: address?.line1 || '',
        line2: address?.line2 || '',
        city: address?.city || '',
        state,
        stateCode,
        pincode: address?.pincode || '',
      },
      contact: {
        phone: contact?.phone || '',
        email: contact?.email || '',
        website: contact?.website || '',
      },
      bankDetails: {
        bankName: bankDetails?.bankName || '',
        accountNo: bankDetails?.accountNo || '',
        ifsc: bankDetails?.ifsc || '',
        branch: bankDetails?.branch || '',
        upiId: bankDetails?.upiId || '',
      },
      financialYearStart: financialYearStart || 4,
      currentFY: currentFY || '2025-2026',
      invoicePrefix: invoicePrefix || 'INV/',
      invoiceNumberSeq: 1,
      defaultTemplate: defaultTemplate || 'A4',
      termsAndConditions:
        termsAndConditions ||
        '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is not made within the due date.\n3. Subject to local jurisdiction only.',
      notes: notes || 'Thank you for your business!',
    });

    // 1. Pre-seed Groups
    for (const g of PRE_SEEDED_GROUPS) {
      await repos.groups.create({
        name: g.name,
        parentName: g.parent || undefined,
        nature: (g.nature as any) || undefined,
        isPrimary: g.isPrimary,
        companyId: savedCompany._id,
      });
    }

    // 2. Pre-seed Ledgers
    for (const l of PRE_SEEDED_LEDGERS) {
      const matchedGroup = PRE_SEEDED_GROUPS.find((g) => g.name === l.group);
      await repos.ledgers.create({
        name: l.name,
        groupName: l.group,
        nature: (matchedGroup?.nature as any) || 'Assets',
        openingBalance: 0,
        openingType: (l.openingType as any) || 'Dr',
        currentBalance: 0,
        isSystem: true,
        companyId: savedCompany._id,
      });
    }

    // 3. Create default settings doc for this company
    await repos.settings.updateSettings(savedCompany._id, {
      companyId: savedCompany._id,
      smtp: {
        enabled: false,
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user: '',
        pass: '',
        fromEmail: contact?.email || '',
        fromName: tradeName || legalName,
      },
      whatsapp: {
        mode: 'fallback',
        defaultGreetingTemplate:
          'Dear {CustomerName}, thank you for shopping with {CompanyName}! Please find your invoice #{InvoiceNo} dated {Date} attached. Total: ₹{Amount}. We appreciate your business!',
      },
    });

    res.status(201).json({ success: true, data: savedCompany });
  } catch (err: any) {
    console.error('Error creating company:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/companies/:id - Update company profile
 */
router.put('/:id', async (req, res) => {
  try {
    const repos = getRepositories();
    const updated = await repos.companies.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Company not found' });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/companies/:id/logo - Upload business logo
 */
router.post('/:id/logo', upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded' });
    }

    const repos = getRepositories();
    const company = await repos.companies.findById(req.params.id);
    if (!company) return res.status(404).json({ success: false, error: 'Company not found' });

    const updated = await repos.companies.update(req.params.id, { logoPath: req.file.path });

    res.json({
      success: true,
      data: updated,
      logoUrl: `/uploads/logos/${path.basename(req.file.path)}`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/companies/:id/lock-fy - Lock/Unlock Financial Year
 */
router.post('/:id/lock-fy', async (req, res) => {
  try {
    const { financialYear, lock } = req.body;
    const repos = getRepositories();
    const company = await repos.companies.findById(req.params.id);
    if (!company) return res.status(404).json({ success: false, error: 'Company not found' });

    let lockedList = company.lockedFYList || [];
    if (lock) {
      if (!lockedList.includes(financialYear)) lockedList.push(financialYear);
    } else {
      lockedList = lockedList.filter((fy) => fy !== financialYear);
    }

    const updated = await repos.companies.update(req.params.id, {
      lockedFYList: lockedList,
      isLockedFY: lockedList.length > 0,
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/companies/:id - Permanently delete company
 */
router.delete('/:id', async (req, res) => {
  try {
    const repos = getRepositories();
    const company = await repos.companies.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found in database' });
    }

    await repos.companies.delete(company._id);

    res.json({
      success: true,
      message: `Company "${company.tradeName || company.legalName}" and all associated data deleted.`,
    });
  } catch (err: any) {
    console.error('Error deleting company:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
