import { Router } from 'express';
import { getRepositories } from '../repositories/factory';
import { PDFGenerator } from '../services/pdfGenerator';
import { AccountingEngine } from '../services/accountingEngine';
import { StorageService } from '../services/storageService';
import { numberToWordsIndian } from '../utils/numberToWords';
import { getInvoicesDir } from '../config/paths';

const router = Router();

/**
 * GET /api/invoices - List invoices with filters
 */
router.get('/', async (req, res) => {
  try {
    const { companyId, search, status, fromDate, toDate } = req.query;
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'companyId is required' });
    }

    const repos = getRepositories();
    const filter: any = {};
    if (status) filter.paymentStatus = status;
    if (fromDate) filter.startDate = new Date(String(fromDate));
    if (toDate) {
      const end = new Date(String(toDate));
      end.setHours(23, 59, 59, 999);
      filter.endDate = end;
    }

    let invoices = await repos.invoices.findByCompany(String(companyId), filter);

    if (search) {
      const q = String(search).toLowerCase();
      invoices = invoices.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q) ||
          (inv.customerPhone && inv.customerPhone.toLowerCase().includes(q)) ||
          (inv.customerGstin && inv.customerGstin.toLowerCase().includes(q))
      );
    }

    res.json({ success: true, data: invoices });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/invoices/party/:partyId/bulk-pdf - Generate consolidated bulk PDF for a customer
 */
router.get(['/party/:partyId/bulk-pdf', '/bulk-pdf'], async (req, res) => {
  try {
    const { companyId, partyId: queryPartyId, range, fromDate, toDate } = req.query;
    const effectivePartyId = req.params.partyId || queryPartyId;

    if (!companyId || !effectivePartyId) {
      return res.status(400).json({ success: false, error: 'companyId and partyId are required' });
    }

    const repos = getRepositories();
    const [party, company] = await Promise.all([
      repos.parties.findById(String(effectivePartyId)),
      repos.companies.findById(String(companyId)),
    ]);

    if (!company) return res.status(404).json({ success: false, error: 'Company not found' });
    const customerName = party?.name || 'Customer';

    // Compute Date Range
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    const now = new Date();

    if (range === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (range === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (fromDate || toDate) {
      if (fromDate) startDate = new Date(String(fromDate));
      if (toDate) {
        endDate = new Date(String(toDate));
        endDate.setHours(23, 59, 59, 999);
      }
    }

    const filter: any = {};
    if (startDate) filter.startDate = startDate;
    if (endDate) filter.endDate = endDate;

    const invoices = await repos.invoices.findByParty(String(companyId), String(effectivePartyId), filter);

    if (!invoices || invoices.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No sales invoices found for ${customerName} in the selected date range.`,
      });
    }

    const pdfBuffer = await PDFGenerator.generateBulkInvoicesPdfBuffer(invoices as any, company as any);

    const safeName = customerName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const startStr = startDate ? startDate.toISOString().split('T')[0] : 'all';
    const endStr = endDate ? endDate.toISOString().split('T')[0] : 'time';
    const filename = `invoices_${safeName}_${startStr}_${endStr}.pdf`;

    // Opt-in Cloud Storage Upload for Bulk PDF
    const wantsCloud = req.query.uploadToCloud === 'true' || (req.query as any).cloudUpload === 'true';
    if (wantsCloud) {
      const settings = await repos.settings.getSettings(String(companyId));
      if (!StorageService.isConfigured(settings)) {
        return res.status(400).json({
          success: false,
          error: 'Cloud storage is not configured or disabled in Settings.',
        });
      }

      const uploadRes = await StorageService.uploadBulkExport(
        String(companyId),
        String(effectivePartyId),
        startStr,
        endStr,
        pdfBuffer,
        settings
      );

      if (!uploadRes.success) {
        return res.status(500).json({
          success: false,
          error: `Could not upload to cloud storage — ${uploadRes.error}.`,
        });
      }

      return res.json({
        success: true,
        signedUrl: uploadRes.signedUrl,
        cloudPath: uploadRes.path,
        expiresAt: uploadRes.expiresAt,
        filename,
        totalInvoices: invoices.length,
        fileSizeBytes: pdfBuffer.length,
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Error generating bulk invoice PDF:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


/**
 * GET /api/invoices/:id - Get single invoice
 */
router.get('/:id', async (req, res) => {
  try {
    const repos = getRepositories();
    const invoice = await repos.invoices.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/invoices/:id/pdf - Generate and stream invoice PDF buffer
 */
router.get('/:id/pdf', async (req, res) => {
  try {
    const repos = getRepositories();
    const invoice = await repos.invoices.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    const company = await repos.companies.findById(invoice.companyId);
    if (!company) return res.status(404).json({ success: false, error: 'Company not found' });

    const template = (req.query.template as any) || invoice.templateUsed || company.defaultTemplate || 'A4';
    const pdfBuffer = await PDFGenerator.generateInvoicePdfBuffer(invoice as any, company as any, template);

    const safeInvNo = invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Invoice_${safeInvNo}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Error generating invoice PDF:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/invoices/:id/preview-html - Render HTML preview of invoice in specified template
 */
router.get('/:id/preview-html', async (req, res) => {

  try {
    const repos = getRepositories();
    const invoice = await repos.invoices.findById(req.params.id);
    if (!invoice) return res.status(404).send('Invoice not found');

    const company = await repos.companies.findById(invoice.companyId);
    if (!company) return res.status(404).send('Company not found');

    const template = (req.query.template as any) || invoice.templateUsed || company.defaultTemplate || 'A4';

    let html = '';
    if (template === 'POS-58') {
      html = await PDFGenerator.renderPosHtml(invoice as any, company as any, 58);
    } else if (template === 'POS-80') {
      html = await PDFGenerator.renderPosHtml(invoice as any, company as any, 80);
    } else if (template === 'A5') {
      html = await PDFGenerator.renderA5Html(invoice as any, company as any);
    } else {
      html = await PDFGenerator.renderA4Html(invoice as any, company as any);
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err: any) {
    res.status(500).send('Error rendering invoice: ' + err.message);
  }
});

/**
 * POST /api/invoices - Create Invoice (Save & Print flow)
 */
router.post('/', async (req, res) => {
  try {
    const {
      companyId,
      customerId,
      customerName,
      customerGstin,
      customerPhone,
      customerEmail,
      billingAddress,
      shippingAddress,
      placeOfSupply,
      items,
      paymentMode,
      paidAmount,
      templateUsed,
      notes,
      terms,
      date,
      dueDate,
    } = req.body;

    const effectiveCustomerName = customerName || req.body.partyName;
    const effectiveCustomerId = customerId || req.body.partyId;
    const effectiveCustomerGstin = customerGstin || req.body.partyGstin;
    const effectiveCustomerPhone = customerPhone || req.body.partyPhone;
    const effectiveCustomerEmail = customerEmail || req.body.partyEmail;

    if (!companyId || !effectiveCustomerName || !items || !items.length) {
      return res.status(400).json({
        success: false,
        error: 'companyId, customerName (or partyName), and at least one item are required.',
      });
    }

    const repos = getRepositories();
    const company = await repos.companies.findById(companyId);
    if (!company) return res.status(404).json({ success: false, error: 'Company not found' });

    // 1. Determine next invoice number
    const prefix = company.invoicePrefix || 'INV/';
    const suffix = company.invoiceSuffix || '';
    let formattedNum = req.body.invoiceNumber ? String(req.body.invoiceNumber).trim() : '';

    if (!formattedNum) {
      let nextSeq = Number(company.invoiceNumberSeq) || 1;
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
      formattedNum = `${prefix}${String(nextSeq).padStart(4, '0')}${suffix}`;
    }

    // Always increment and sync company sequence to at least the next sequential number
    let parsedFromFormatted: number | null = null;
    if (formattedNum.startsWith(prefix)) {
      const middle = formattedNum.substring(prefix.length, suffix ? formattedNum.length - suffix.length : undefined);
      const parsed = parseInt(middle, 10);
      if (!isNaN(parsed)) {
        parsedFromFormatted = parsed;
      }
    }
    const currentSeq = Number(company.invoiceNumberSeq) || 1;
    const newSeq = Math.max(currentSeq + 1, parsedFromFormatted !== null ? parsedFromFormatted + 1 : 1);
    await repos.companies.update(company._id, { invoiceNumberSeq: newSeq });

    // 2. Tax Determination: Intra-state vs Inter-state
    const companyStateCode = company.address?.stateCode || '10';
    let customerStateCode = billingAddress?.stateCode || '10';

    if (placeOfSupply) {
      const parts = placeOfSupply.split('-');
      if (parts.length > 0 && parts[0].trim().length === 2) {
        customerStateCode = parts[0].trim();
      }
    } else if (effectiveCustomerGstin && effectiveCustomerGstin.length >= 2) {
      customerStateCode = effectiveCustomerGstin.substring(0, 2);
    }

    const isInterState = companyStateCode !== customerStateCode;

    // 3. Line Items & Tax Breakdown calculation
    let subTotal = 0;
    let totalDiscount = 0;
    let totalTaxable = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;
    let cessTotal = 0;

    const processedItems: any[] = [];
    const taxSummaryMap = new Map<number, any>();

    for (const rawItem of items) {
      const qty = Number(rawItem.quantity) || 1;
      const rate = Number(rawItem.rate) || 0;
      const gross = qty * rate;

      let discAmt = Number(rawItem.discountAmount) || 0;
      if (rawItem.discountPercent) {
        discAmt = (gross * Number(rawItem.discountPercent)) / 100;
      }
      const taxableVal = Math.max(0, gross - discAmt);
      const gstRate = Number(rawItem.gstRate) || 0;

      let cgstAmt = 0;
      let sgstAmt = 0;
      let igstAmt = 0;
      const cessAmt = Number(rawItem.cessAmount) || 0;

      if (isInterState) {
        igstAmt = Math.round(((taxableVal * gstRate) / 100) * 100) / 100;
      } else {
        const halfRate = gstRate / 2;
        cgstAmt = Math.round(((taxableVal * halfRate) / 100) * 100) / 100;
        sgstAmt = Math.round(((taxableVal * halfRate) / 100) * 100) / 100;
      }

      const itemTotal = taxableVal + cgstAmt + sgstAmt + igstAmt + cessAmt;

      subTotal += gross;
      totalDiscount += discAmt;
      totalTaxable += taxableVal;
      cgstTotal += cgstAmt;
      sgstTotal += sgstAmt;
      igstTotal += igstAmt;
      cessTotal += cessAmt;

      processedItems.push({
        itemId: rawItem.itemId || undefined,
        name: rawItem.name,
        hsnCode: rawItem.hsnCode || '9983',
        uqc: rawItem.uqc || 'PCS',
        quantity: qty,
        rate,
        discountPercent: Number(rawItem.discountPercent) || 0,
        discountAmount: discAmt,
        taxableValue: taxableVal,
        gstRate,
        cgstAmount: cgstAmt,
        sgstAmount: sgstAmt,
        igstAmount: igstAmt,
        cessAmount: cessAmt,
        total: itemTotal,
      });

      const existingTax = taxSummaryMap.get(gstRate) || {
        gstRate,
        taxableValue: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        cess: 0,
        totalTax: 0,
      };
      existingTax.taxableValue += taxableVal;
      existingTax.cgst += cgstAmt;
      existingTax.sgst += sgstAmt;
      existingTax.igst += igstAmt;
      existingTax.cess += cessAmt;
      existingTax.totalTax += cgstAmt + sgstAmt + igstAmt + cessAmt;
      taxSummaryMap.set(gstRate, existingTax);
    }

    const calculatedTotal = totalTaxable + cgstTotal + sgstTotal + igstTotal + cessTotal;
    const roundedGrandTotal = Math.round(calculatedTotal);
    const roundOff = Math.round((roundedGrandTotal - calculatedTotal) * 100) / 100;

    const mode = paymentMode || 'Cash';
    const paid = paidAmount !== undefined ? Number(paidAmount) : mode === 'Cash' ? roundedGrandTotal : 0;
    const balance = Math.max(0, roundedGrandTotal - paid);
    const payStatus = balance === 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';

    // 4. Create Ledger Entries for Sales Voucher
    const [cashLedger, salesIntraLedger, salesInterLedger, cgstOutLedger, sgstOutLedger, igstOutLedger, roundOffLedger] =
      await Promise.all([
        repos.ledgers.findByName(companyId, 'Cash'),
        repos.ledgers.findByName(companyId, 'Sales - Intra State (CGST + SGST)'),
        repos.ledgers.findByName(companyId, 'Sales - Inter State (IGST)'),
        repos.ledgers.findByName(companyId, 'CGST Output'),
        repos.ledgers.findByName(companyId, 'SGST Output'),
        repos.ledgers.findByName(companyId, 'IGST Output'),
        repos.ledgers.findByName(companyId, 'Round Off'),
      ]);

    let debtorLedgerId: string = cashLedger?._id || '';
    let debtorLedgerName = 'Cash';

    if (effectiveCustomerId) {
      const party = await repos.parties.findById(effectiveCustomerId);
      if (party) {
        const partyLedger = await repos.ledgers.findByName(companyId, party.name);
        if (partyLedger) {
          debtorLedgerId = partyLedger._id;
          debtorLedgerName = partyLedger.name;
        }
      }
    }

    const voucherEntries: any[] = [
      {
        ledgerId: debtorLedgerId,
        ledgerName: debtorLedgerName,
        debit: roundedGrandTotal,
        credit: 0,
        description: `Sale to ${effectiveCustomerName} (Inv: ${formattedNum})`,
      },
      {
        ledgerId: isInterState ? salesInterLedger?._id || debtorLedgerId : salesIntraLedger?._id || debtorLedgerId,
        ledgerName: isInterState ? 'Sales - Inter State (IGST)' : 'Sales - Intra State (CGST + SGST)',
        debit: 0,
        credit: totalTaxable,
        description: `Taxable Sales Value`,
      },
    ];

    if (!isInterState) {
      if (cgstTotal > 0 && cgstOutLedger) {
        voucherEntries.push({
          ledgerId: cgstOutLedger._id,
          ledgerName: cgstOutLedger.name,
          debit: 0,
          credit: cgstTotal,
          description: `CGST Output on Inv ${formattedNum}`,
        });
      }
      if (sgstTotal > 0 && sgstOutLedger) {
        voucherEntries.push({
          ledgerId: sgstOutLedger._id,
          ledgerName: sgstOutLedger.name,
          debit: 0,
          credit: sgstTotal,
          description: `SGST Output on Inv ${formattedNum}`,
        });
      }
    } else {
      if (igstTotal > 0 && igstOutLedger) {
        voucherEntries.push({
          ledgerId: igstOutLedger._id,
          ledgerName: igstOutLedger.name,
          debit: 0,
          credit: igstTotal,
          description: `IGST Output on Inv ${formattedNum}`,
        });
      }
    }

    if (roundOff !== 0 && roundOffLedger) {
      if (roundOff > 0) {
        voucherEntries.push({
          ledgerId: roundOffLedger._id,
          ledgerName: roundOffLedger.name,
          debit: 0,
          credit: roundOff,
          description: 'Round Off Adjustment',
        });
      } else {
        voucherEntries.push({
          ledgerId: roundOffLedger._id,
          ledgerName: roundOffLedger.name,
          debit: Math.abs(roundOff),
          credit: 0,
          description: 'Round Off Adjustment',
        });
      }
    }

    // 5. Save Sales Voucher
    const savedVoucher = await repos.vouchers.create({
      voucherNumber: formattedNum,
      voucherType: 'Sales',
      date: date ? new Date(date) : new Date(),
      partyId: effectiveCustomerId || undefined,
      partyName: effectiveCustomerName,
      partyGstin: effectiveCustomerGstin || '',
      placeOfSupply: placeOfSupply || `${customerStateCode}-${billingAddress?.state || 'Bihar'}`,
      isInterState,
      entries: voucherEntries,
      items: processedItems,
      subTotal,
      totalDiscount,
      totalTaxable,
      cgstTotal,
      sgstTotal,
      igstTotal,
      cessTotal,
      roundOff,
      totalAmount: roundedGrandTotal,
      financialYear: company.currentFY || '2025-2026',
      companyId,
      status: 'Posted',
      auditTrail: [
        {
          action: 'CREATE_INVOICE',
          timestamp: new Date(),
          user: 'Admin',
          details: `Generated Invoice #${formattedNum} for ${effectiveCustomerName}`,
        },
      ],
    });

    // Post effects to Ledgers and Stock
    await AccountingEngine.postVoucherEffects(savedVoucher, false);

    // 6. Save Invoice Record
    const templateChoice = templateUsed || company.defaultTemplate || 'A4';
    const amountWords = numberToWordsIndian(roundedGrandTotal);

    const savedInvoice = await repos.invoices.create({
      invoiceNumber: formattedNum,
      voucherId: savedVoucher._id,
      date: date ? new Date(date) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      customerId: effectiveCustomerId || undefined,
      customerName: effectiveCustomerName,
      customerGstin: (effectiveCustomerGstin || '').toUpperCase(),
      customerPhone: effectiveCustomerPhone || '',
      customerEmail: effectiveCustomerEmail || '',
      billingAddress: billingAddress || {
        line1: '',
        city: '',
        state: 'Bihar',
        stateCode: customerStateCode,
      },
      shippingAddress: shippingAddress || {},
      placeOfSupply: placeOfSupply || `${customerStateCode}-${billingAddress?.state || 'Bihar'}`,
      isInterState,
      reverseCharge: false,
      items: processedItems,
      taxSummary: Array.from(taxSummaryMap.values()),
      subTotal,
      totalDiscount,
      totalTaxable,
      cgstTotal,
      sgstTotal,
      igstTotal,
      cessTotal,
      roundOff,
      grandTotal: roundedGrandTotal,
      amountInWords: amountWords,
      templateUsed: templateChoice,
      paymentMode: mode,
      paymentStatus: payStatus,
      paidAmount: paid,
      balanceAmount: balance,
      notes: notes || company.notes || '',
      terms: terms || company.termsAndConditions || '',
      bankDetailsSnapshot: company.bankDetails,
      companyId,
    });

    // 7. Render & save HTML and genuine PDF invoice on disk
    const invoiceOutputDir = getInvoicesDir();
    await PDFGenerator.saveInvoiceHtml(
      savedInvoice as any,
      company as any,
      templateChoice,
      invoiceOutputDir
    );
    let savedPdfPath = '';
    try {
      savedPdfPath = await PDFGenerator.saveInvoicePdf(
        savedInvoice as any,
        company as any,
        templateChoice,
        invoiceOutputDir
      );
    } catch (pdfErr: any) {
      console.warn('[InvoiceRoutes] Note on local PDF render:', pdfErr.message);
    }

    let updatedInvoice = (await repos.invoices.update(savedInvoice._id, { pdfPath: savedPdfPath || undefined })) || savedInvoice;

    // 8. Opt-in Non-blocking Cloud Storage Upload (Supabase Storage - genuine PDF)
    const settings = await repos.settings.getSettings(companyId);
    const wantsCloudUpload = req.body.uploadToCloud === true || req.body.saveToCloud === true;

    if (wantsCloudUpload && StorageService.isConfigured(settings)) {
      try {
        const uploadRes = await StorageService.uploadInvoice(
          updatedInvoice,
          company,
          settings,
          undefined,
          templateChoice
        );
        if (uploadRes.success) {
          const fresh = await repos.invoices.update(savedInvoice._id, {
            cloudStoragePath: uploadRes.path,
            signedUrl: uploadRes.signedUrl,
            signedUrlExpiresAt: uploadRes.expiresAt,
            cloudUploadStatus: 'uploaded',
            cloudUploadError: undefined,
          });
          if (fresh) updatedInvoice = fresh;
        } else {
          await repos.invoices.update(savedInvoice._id, {
            cloudUploadStatus: 'failed',
            cloudUploadError: uploadRes.error,
          });
        }
      } catch (uploadErr: any) {
        console.warn('[InvoiceRoutes] Non-blocking cloud upload skipped/failed:', uploadErr.message);
        await repos.invoices.update(savedInvoice._id, {
          cloudUploadStatus: 'failed',
          cloudUploadError: uploadErr.message,
        });
      }
    } else if (!StorageService.isConfigured(settings)) {
      await repos.invoices.update(savedInvoice._id, {
        cloudUploadStatus: 'not_configured',
      });
    }

    res.status(201).json({
      success: true,
      data: updatedInvoice,
      voucherId: savedVoucher._id,
      pdfPath: savedPdfPath,
      signedUrl: updatedInvoice.signedUrl,
      cloudUploadStatus: updatedInvoice.cloudUploadStatus,
      previewUrl: `/api/invoices/${savedInvoice._id}/preview-html?template=${templateChoice}`,
    });
  } catch (err: any) {
    console.error('Error creating invoice:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/invoices/:id/cloud-upload - On-demand upload single invoice PDF to cloud storage
 */
router.post('/:id/cloud-upload', async (req, res) => {
  try {
    const repos = getRepositories();
    const invoice = await repos.invoices.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    const company = await repos.companies.findById(invoice.companyId);
    if (!company) return res.status(404).json({ success: false, error: 'Company not found' });

    const settings = await repos.settings.getSettings(invoice.companyId);
    if (!StorageService.isConfigured(settings)) {
      return res.status(400).json({
        success: false,
        error: 'Cloud storage is not configured or disabled in Settings.',
      });
    }

    const templateChoice = (req.body.template as any) || invoice.templateUsed || company.defaultTemplate || 'A4';
    const uploadRes = await StorageService.uploadInvoice(
      invoice as any,
      company as any,
      settings,
      undefined,
      templateChoice
    );

    if (!uploadRes.success) {
      return res.status(500).json({
        success: false,
        error: uploadRes.error || 'Could not upload invoice to cloud storage.',
      });
    }

    const updated = await repos.invoices.update(invoice._id, {
      cloudStoragePath: uploadRes.path,
      signedUrl: uploadRes.signedUrl,
      signedUrlExpiresAt: uploadRes.expiresAt,
      cloudUploadStatus: 'uploaded',
      cloudUploadError: undefined,
    });

    res.json({
      success: true,
      data: updated,
      signedUrl: uploadRes.signedUrl,
      cloudPath: uploadRes.path,
      expiresAt: uploadRes.expiresAt,
    });
  } catch (err: any) {
    console.error('Error uploading invoice to cloud:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/invoices/:id - Edit and update existing invoice
 */
router.put('/:id', async (req, res) => {
  try {
    const repos = getRepositories();
    const existing = await repos.invoices.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Invoice not found' });

    let company = await repos.companies.findById(existing.companyId);
    if (!company && req.body.companyId) {
      company = await repos.companies.findById(req.body.companyId);
    }
    if (!company) {
      company = await repos.companies.findOne();
    }
    if (!company) return res.status(404).json({ success: false, error: 'No company found in database' });

    let updated = await repos.invoices.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Could not update invoice' });

    // Re-render HTML and genuine PDF invoice file
    const invoiceOutputDir = getInvoicesDir();
    await PDFGenerator.saveInvoiceHtml(
      updated as any,
      company as any,
      updated.templateUsed || 'A4',
      invoiceOutputDir
    );
    let savedPdfPath = '';
    try {
      savedPdfPath = await PDFGenerator.saveInvoicePdf(
        updated as any,
        company as any,
        updated.templateUsed || 'A4',
        invoiceOutputDir
      );
    } catch (pdfErr: any) {
      console.warn('[InvoiceRoutes] Note on local PDF render:', pdfErr.message);
    }
    if (savedPdfPath) {
      await repos.invoices.update(updated._id, { pdfPath: savedPdfPath });
    }

    // Opt-in / overwrite cloud storage copy only if requested or previously uploaded
    const wantsCloudUpdate = req.body.uploadToCloud === true || req.body.saveToCloud === true;
    const settings = await repos.settings.getSettings(updated.companyId);
    if (wantsCloudUpdate && StorageService.isConfigured(settings)) {
      try {
        const uploadRes = await StorageService.uploadInvoice(
          updated,
          company,
          settings,
          undefined,
          updated.templateUsed || 'A4'
        );
        if (uploadRes.success) {
          const fresh = await repos.invoices.update(updated._id, {
            cloudStoragePath: uploadRes.path,
            signedUrl: uploadRes.signedUrl,
            signedUrlExpiresAt: uploadRes.expiresAt,
            cloudUploadStatus: 'uploaded',
            cloudUploadError: undefined,
          });
          if (fresh) updated = fresh;
        }
      } catch (storageErr: any) {
        console.warn('[InvoiceRoutes] Non-blocking cloud update error:', storageErr.message);
      }
    }


    res.json({
      success: true,
      data: updated,
      signedUrl: updated.signedUrl,
      cloudUploadStatus: updated.cloudUploadStatus,
      previewUrl: `/api/invoices/${updated._id}/preview-html?template=${updated.templateUsed || 'A4'}`,
    });
  } catch (err: any) {
    console.error('Error updating invoice:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/invoices/:id - Cancel / Delete invoice
 */
router.delete('/:id', async (req, res) => {
  try {
    const repos = getRepositories();
    const invoice = await repos.invoices.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    // Reverse associated voucher
    if (invoice.voucherId) {
      const voucher = await repos.vouchers.findById(invoice.voucherId);
      if (voucher) {
        await AccountingEngine.postVoucherEffects(voucher, true);
        await repos.vouchers.delete(invoice.voucherId);
      }
    }

    await repos.invoices.delete(req.params.id);
    res.json({ success: true, message: 'Invoice and associated sales voucher deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
