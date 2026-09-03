import { Router } from 'express';
import { getRepositories } from '../repositories/factory';
import { getStateFromGSTIN } from '../utils/gstValidator';
import { StorageService } from '../services/storageService';

const router = Router();


/**
 * GET /api/parties - List parties for a company
 */
router.get('/', async (req, res) => {
  try {
    const { companyId, type, search } = req.query;
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'companyId is required' });
    }

    const repos = getRepositories();
    let parties = await repos.parties.findByCompany(String(companyId), type ? String(type) : undefined);

    if (search) {
      const q = String(search).toLowerCase();
      parties = parties.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.phone && p.phone.toLowerCase().includes(q)) ||
          (p.gstin && p.gstin.toLowerCase().includes(q))
      );
    }

    res.json({ success: true, data: parties });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/parties/:id - Get single party
 */
router.get('/:id', async (req, res) => {
  try {
    const repos = getRepositories();
    const party = await repos.parties.findById(req.params.id);
    if (!party) return res.status(404).json({ success: false, error: 'Party not found' });
    res.json({ success: true, data: party });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/parties - Create Party and auto-create Ledger
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      type,
      gstin,
      pan,
      phone,
      email,
      billingAddress,
      shippingAddress,
      placeOfSupply,
      openingBalance,
      openingType,
      creditLimit,
      companyId,
    } = req.body;

    if (!name || !companyId) {
      return res.status(400).json({ success: false, error: 'Party name and companyId are required' });
    }

    let cleanGstin = (gstin || '').trim().toUpperCase();
    let state = billingAddress?.state || 'Bihar';
    let stateCode = billingAddress?.stateCode || '10';
    let derivedPan = pan || '';

    if (cleanGstin.length >= 2) {
      const derived = getStateFromGSTIN(cleanGstin);
      state = derived.stateName;
      stateCode = derived.stateCode;
      if (!derivedPan && cleanGstin.length >= 12) {
        derivedPan = cleanGstin.substring(2, 12);
      }
    }

    const partyType = type || 'Customer';
    const groupName = partyType === 'Supplier' ? 'Sundry Creditors' : 'Sundry Debtors';
    const nature = partyType === 'Supplier' ? 'Liabilities' : 'Assets';
    const defaultOpType = partyType === 'Supplier' ? 'Cr' : 'Dr';

    const repos = getRepositories();

    // 1. Create or link Ledger
    let ledger = await repos.ledgers.findByName(companyId, name);
    if (!ledger) {
      ledger = await repos.ledgers.create({
        name,
        groupName,
        nature,
        openingBalance: Number(openingBalance) || 0,
        openingType: openingType || defaultOpType,
        currentBalance: Number(openingBalance) || 0,
        gstin: cleanGstin,
        pan: derivedPan.toUpperCase(),
        address: typeof billingAddress === 'object' ? billingAddress : { line1: billingAddress || '', state, stateCode },
        contact: { phone: phone || '', email: email || '' },
        companyId,
      });
    }

    // 2. Create Party
    const saved = await repos.parties.create({
      name,
      type: partyType,
      gstin: cleanGstin,
      pan: derivedPan.toUpperCase(),
      phone: phone || '',
      email: email || '',
      billingAddress: {
        line1: billingAddress?.line1 || '',
        line2: billingAddress?.line2 || '',
        city: billingAddress?.city || '',
        state,
        stateCode,
        pincode: billingAddress?.pincode || '',
      },
      shippingAddress: shippingAddress || {},
      placeOfSupply: placeOfSupply || `${stateCode}-${state}`,
      openingBalance: Number(openingBalance) || 0,
      openingType: openingType || defaultOpType,
      currentBalance: Number(openingBalance) || 0,
      creditLimit: Number(creditLimit) || 0,
      companyId,
    });

    res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/parties/:id - Update party
 */
router.put('/:id', async (req, res) => {
  try {
    const repos = getRepositories();
    const updated = await repos.parties.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Party not found' });

    // Update corresponding ledger if exists
    const ledger = await repos.ledgers.findByName(updated.companyId, updated.name);
    if (ledger) {
      await repos.ledgers.update(ledger._id, {
        name: updated.name,
        gstin: updated.gstin,
        contact: { phone: updated.phone || '', email: updated.email || '' },
        address: updated.billingAddress,
      });
    }

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/parties/:id - Delete party
 */
router.delete('/:id', async (req, res) => {
  try {
    const repos = getRepositories();
    await repos.parties.delete(req.params.id);
    res.json({ success: true, message: 'Party deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Helper to compute date ranges
 */
function parseDateRange(range?: string, fromDate?: string, toDate?: string): { startDate?: Date; endDate?: Date; label: string } {
  const now = new Date();
  if (range === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthName = start.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
    return { startDate: start, endDate: end, label: `This Month (${monthName})` };
  } else if (range === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const monthName = start.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
    return { startDate: start, endDate: end, label: `Last Month (${monthName})` };
  } else if (fromDate || toDate) {
    const start = fromDate ? new Date(String(fromDate)) : undefined;
    const end = toDate ? new Date(String(toDate)) : undefined;
    if (end) end.setHours(23, 59, 59, 999);
    const label = `${start ? start.toLocaleDateString('en-IN') : 'Start'} to ${end ? end.toLocaleDateString('en-IN') : 'Now'}`;
    return { startDate: start, endDate: end, label };
  }
  return { label: 'All Time' };
}

/**
 * GET /api/parties/:id/invoices - Get all sales invoices for a customer (including cancelled)
 */
router.get('/:id/invoices', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

    const repos = getRepositories();
    const invoices = await repos.invoices.findByParty(String(companyId), req.params.id);
    res.json({ success: true, data: invoices });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/parties/:id/purchases - Get all purchase bills for a supplier
 */
router.get('/:id/purchases', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

    const repos = getRepositories();
    const purchases = await repos.purchases.findByParty(String(companyId), req.params.id);
    res.json({ success: true, data: purchases });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/parties/:id/gst-summary - Live preview aggregation for customer GST report
 */
router.get('/:id/gst-summary', async (req, res) => {
  try {
    const { companyId, range, fromDate, toDate } = req.query;
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

    const { startDate, endDate, label } = parseDateRange(
      range ? String(range) : undefined,
      fromDate ? String(fromDate) : undefined,
      toDate ? String(toDate) : undefined
    );

    const repos = getRepositories();
    const summary = await repos.invoices.getPartyGstSummary(String(companyId), req.params.id, { startDate, endDate });
    res.json({ success: true, data: { ...summary, dateRangeLabel: label } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/parties/:id/gst-summary/pdf - Download branded A4 PDF GST Summary Report
 */
router.get('/:id/gst-summary/pdf', async (req, res) => {
  try {
    const { companyId, range, fromDate, toDate } = req.query;
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

    const repos = getRepositories();
    const [party, company] = await Promise.all([
      repos.parties.findById(req.params.id),
      repos.companies.findById(String(companyId)),
    ]);

    if (!party) return res.status(404).json({ success: false, error: 'Party not found' });
    if (!company) return res.status(404).json({ success: false, error: 'Company not found' });

    const { startDate, endDate, label } = parseDateRange(
      range ? String(range) : undefined,
      fromDate ? String(fromDate) : undefined,
      toDate ? String(toDate) : undefined
    );

    const summary = await repos.invoices.getPartyGstSummary(String(companyId), req.params.id, { startDate, endDate });
    const { PDFGenerator } = await import('../services/pdfGenerator');
    
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await PDFGenerator.generateCustomerGstReportPdfBuffer(summary, party, company as any, label);
    } catch (pdfErr: any) {
      console.warn('[PartyRoutes] Puppeteer GST report render notice:', pdfErr.message);
    }

    const safeName = party.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const startStr = startDate ? startDate.toISOString().split('T')[0] : 'all';
    const endStr = endDate ? endDate.toISOString().split('T')[0] : 'time';
    const filename = `gst_summary_${safeName}_${startStr}_${endStr}.pdf`;

    if (pdfBuffer) {
      // Opt-in Cloud Storage Upload for GST Summary Report
      const wantsCloud = req.query.uploadToCloud === 'true' || (req.query as any).cloudUpload === 'true';
      if (wantsCloud) {
        const settings = await repos.settings.getSettings(String(companyId));
        if (!StorageService.isConfigured(settings)) {
          return res.status(400).json({
            success: false,
            error: 'Cloud storage is not configured or disabled in Settings.',
          });
        }

        const uploadRes = await StorageService.uploadGstReport(
          String(companyId),
          req.params.id,
          'gstr1_summary',
          startStr,
          endStr,
          pdfBuffer,
          settings
        );

        if (!uploadRes.success) {
          return res.status(500).json({
            success: false,
            error: `Could not upload report to cloud storage — ${uploadRes.error}.`,
          });
        }

        return res.json({
          success: true,
          signedUrl: uploadRes.signedUrl,
          cloudPath: uploadRes.path,
          expiresAt: uploadRes.expiresAt,
          filename,
          fileSizeBytes: pdfBuffer.length,
        });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(pdfBuffer);
    }

    // Universal fallback: render high-resolution printable report HTML with toolbar
    const html = await PDFGenerator.renderCustomerGstReportHtml(summary, party, company as any, label);
    const finalHtml = PDFGenerator.injectPreviewToolbar(html, {
      title: `Party GST Summary - ${party.name}`,
      subtitle: `${company.tradeName || company.legalName} • Period: ${label}`,
      badge: 'GSTR-1 Summary',
      filename: `gst_summary_${safeName}_${startStr}_${endStr}`,
      format: 'a4',
      autoPrint: req.query.autoprint === 'true',
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(finalHtml);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/parties/:id/purchase-summary - Live preview aggregation for supplier Purchase & ITC report
 */
router.get('/:id/purchase-summary', async (req, res) => {
  try {
    const { companyId, range, fromDate, toDate } = req.query;
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

    const { startDate, endDate, label } = parseDateRange(
      range ? String(range) : undefined,
      fromDate ? String(fromDate) : undefined,
      toDate ? String(toDate) : undefined
    );

    const repos = getRepositories();
    const summary = await repos.purchases.getPartyPurchaseSummary(String(companyId), req.params.id, { startDate, endDate });
    res.json({ success: true, data: { ...summary, dateRangeLabel: label } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/parties/:id/purchase-summary/pdf - Download internal audit A4 PDF Purchase & ITC Report
 */
router.get('/:id/purchase-summary/pdf', async (req, res) => {
  try {
    const { companyId, range, fromDate, toDate } = req.query;
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

    const repos = getRepositories();
    const [party, company] = await Promise.all([
      repos.parties.findById(req.params.id),
      repos.companies.findById(String(companyId)),
    ]);

    if (!party) return res.status(404).json({ success: false, error: 'Party not found' });
    if (!company) return res.status(404).json({ success: false, error: 'Company not found' });

    const { startDate, endDate, label } = parseDateRange(
      range ? String(range) : undefined,
      fromDate ? String(fromDate) : undefined,
      toDate ? String(toDate) : undefined
    );

    const summary = await repos.purchases.getPartyPurchaseSummary(String(companyId), req.params.id, { startDate, endDate });
    const { PDFGenerator } = await import('../services/pdfGenerator');
    
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await PDFGenerator.generateSupplierItcReportPdfBuffer(summary, party, company as any, label);
    } catch (pdfErr: any) {
      console.warn('[PartyRoutes] Puppeteer supplier ITC report render notice:', pdfErr.message);
    }

    const safeName = party.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const startStr = startDate ? startDate.toISOString().split('T')[0] : 'all';
    const endStr = endDate ? endDate.toISOString().split('T')[0] : 'time';
    const filename = `itc_summary_${safeName}_${startStr}_${endStr}.pdf`;

    if (pdfBuffer) {
      // Opt-in Cloud Storage Upload for Purchase ITC Report
      const wantsCloud = req.query.uploadToCloud === 'true' || (req.query as any).cloudUpload === 'true';
      if (wantsCloud) {
        const settings = await repos.settings.getSettings(String(companyId));
        if (!StorageService.isConfigured(settings)) {
          return res.status(400).json({
            success: false,
            error: 'Cloud storage is not configured or disabled in Settings.',
          });
        }

        const uploadRes = await StorageService.uploadGstReport(
          String(companyId),
          req.params.id,
          'itc_summary',
          startStr,
          endStr,
          pdfBuffer,
          settings
        );

        if (!uploadRes.success) {
          return res.status(500).json({
            success: false,
            error: `Could not upload report to cloud storage — ${uploadRes.error}.`,
          });
        }

        return res.json({
          success: true,
          signedUrl: uploadRes.signedUrl,
          cloudPath: uploadRes.path,
          expiresAt: uploadRes.expiresAt,
          filename,
          fileSizeBytes: pdfBuffer.length,
        });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(pdfBuffer);
    }

    // Universal fallback: render high-resolution printable report HTML with toolbar
    const html = await PDFGenerator.renderSupplierItcReportHtml(summary, party, company as any, label);
    const finalHtml = PDFGenerator.injectPreviewToolbar(html, {
      title: `Supplier ITC Summary - ${party.name}`,
      subtitle: `${company.tradeName || company.legalName} • Period: ${label}`,
      badge: 'Inward ITC Summary',
      filename: `itc_summary_${safeName}_${startStr}_${endStr}`,
      format: 'a4',
      autoPrint: req.query.autoprint === 'true',
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(finalHtml);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


export default router;

