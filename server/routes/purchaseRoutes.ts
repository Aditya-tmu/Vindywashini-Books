import { Router } from 'express';
import { getRepositories } from '../repositories/factory';
import { AccountingEngine } from '../services/accountingEngine';
import { PDFGenerator } from '../services/pdfGenerator';
import { StorageService } from '../services/storageService';
import { numberToWordsIndian } from '../utils/numberToWords';


const router = Router();

/**
 * GET /api/purchases - List purchase bills
 */
router.get('/', async (req, res) => {
  try {
    const { companyId, search, supplierId, fromDate, toDate } = req.query;
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'companyId is required' });
    }

    const repos = getRepositories();
    const filter: any = {};
    if (supplierId) filter.supplierId = supplierId;
    if (fromDate) filter.startDate = new Date(String(fromDate));
    if (toDate) {
      const end = new Date(String(toDate));
      end.setHours(23, 59, 59, 999);
      filter.endDate = end;
    }

    let purchases = await repos.purchases.findByCompany(String(companyId), filter);

    if (search) {
      const q = String(search).toLowerCase();
      purchases = purchases.filter(
        (p) =>
          p.billNumber.toLowerCase().includes(q) ||
          p.supplierInvoiceNumber.toLowerCase().includes(q) ||
          p.supplierName.toLowerCase().includes(q) ||
          (p.supplierGstin && p.supplierGstin.toLowerCase().includes(q))
      );
    }

    res.json({ success: true, data: purchases });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/purchases/party/:partyId/bulk-pdf - Generate consolidated bulk PDF for a supplier
 */
router.get(['/party/:partyId/bulk-pdf', '/bulk-pdf'], async (req, res) => {
  try {
    const { companyId, partyId: queryPartyId, supplierId, range, fromDate, toDate } = req.query;
    const effectiveSupplierId = req.params.partyId || queryPartyId || supplierId;

    if (!companyId || !effectiveSupplierId) {
      return res.status(400).json({ success: false, error: 'companyId and partyId are required' });
    }

    const repos = getRepositories();
    const [party, company] = await Promise.all([
      repos.parties.findById(String(effectiveSupplierId)),
      repos.companies.findById(String(companyId)),
    ]);

    if (!company) return res.status(404).json({ success: false, error: 'Company not found' });
    const supplierName = party?.name || 'Supplier';

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

    const purchases = await repos.purchases.findByParty(String(companyId), String(effectiveSupplierId), filter);

    if (!purchases || purchases.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No purchase bills found for ${supplierName} in the selected date range.`,
      });
    }

    const pdfBuffer = await PDFGenerator.generateBulkPurchaseBillsPdfBuffer(purchases as any, company as any);

    const safeName = supplierName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const startStr = startDate ? startDate.toISOString().split('T')[0] : 'all';
    const endStr = endDate ? endDate.toISOString().split('T')[0] : 'time';
    const filename = `purchases_${safeName}_${startStr}_${endStr}.pdf`;

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
        String(effectiveSupplierId),
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
        totalPurchases: purchases.length,
        fileSizeBytes: pdfBuffer.length,
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Error generating bulk purchase PDF:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


/**
 * GET /api/purchases/:id - Get single purchase bill
 */
router.get('/:id', async (req, res) => {
  try {
    const repos = getRepositories();
    const purchase = await repos.purchases.findById(req.params.id);
    if (!purchase) return res.status(404).json({ success: false, error: 'Purchase Bill not found' });
    res.json({ success: true, data: purchase });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


/**
 * GET /api/purchases/:id/preview-html - Render A4 Purchase Record HTML
 */
router.get('/:id/preview-html', async (req, res) => {
  try {
    const repos = getRepositories();
    const purchase = await repos.purchases.findById(req.params.id);
    if (!purchase) return res.status(404).send('<h3>Purchase bill not found</h3>');

    const company = await repos.companies.findById(purchase.companyId);
    if (!company) return res.status(404).send('<h3>Company not found</h3>');

    const html = await PDFGenerator.renderPurchaseBillHtml(purchase as any, company as any);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err: any) {
    res.status(500).send(`<h3>Error generating purchase preview: ${err.message}</h3>`);
  }
});

/**
 * POST /api/purchases - Create Purchase Bill, increment stock, and post double-entry voucher
 */
router.post('/', async (req, res) => {
  try {
    const {
      billNumber,
      supplierInvoiceNumber,
      supplierInvoiceDate,
      date,
      dueDate,
      supplierId,
      supplierName,
      supplierGstin,
      supplierPhone,
      supplierEmail,
      supplierAddress,
      placeOfSupply,
      reverseCharge,
      items,
      paymentMode,
      paymentStatus,
      paidAmount,
      notes,
      companyId,
      financialYear,
      isDraft = false,
    } = req.body;

    if (!billNumber || !supplierInvoiceNumber || !supplierName || !companyId) {
      return res.status(400).json({
        success: false,
        error: 'Bill Number, Supplier Invoice Number, Supplier Name, and Company ID are required.',
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one line item is required on the purchase bill.',
      });
    }

    const repos = getRepositories();
    const company = await repos.companies.findById(companyId);
    if (!company) return res.status(404).json({ success: false, error: 'Company not found' });

    const fy = financialYear || company.currentFY || '2025-2026';

    // Check Financial Year lock
    if (company.lockedFYList && company.lockedFYList.includes(fy)) {
      return res.status(400).json({
        success: false,
        error: `Financial Year ${fy} is locked. Unlock it in Settings to record purchases.`,
      });
    }

    // Determine Intra vs Inter-State
    const companyStateCode = company.address?.stateCode || '10';
    let supplierStateCode = '10';

    if (placeOfSupply) {
      const parts = placeOfSupply.split('-');
      if (parts.length > 0 && parts[0].trim().length === 2) {
        supplierStateCode = parts[0].trim();
      }
    } else if (supplierGstin && supplierGstin.length >= 2) {
      supplierStateCode = supplierGstin.substring(0, 2);
    }

    const isInterState = companyStateCode !== supplierStateCode;

    // Calculate line items & tax breakdowns
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
      const rate = Number(rawItem.purchaseRate || rawItem.rate) || 0;
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
        itemType: rawItem.itemType || 'Goods',
        hsnCode: rawItem.hsnCode || (rawItem.itemType === 'Service' ? '997114' : '9983'),
        uqc: rawItem.uqc || 'PCS',
        quantity: qty,
        purchaseRate: rate,
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

      if (!taxSummaryMap.has(gstRate)) {
        taxSummaryMap.set(gstRate, {
          gstRate,
          taxableValue: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          cess: 0,
          totalTax: 0,
        });
      }
      const existing = taxSummaryMap.get(gstRate);
      existing.taxableValue += taxableVal;
      existing.cgst += cgstAmt;
      existing.sgst += sgstAmt;
      existing.igst += igstAmt;
      existing.cess += cessAmt;
      existing.totalTax += cgstAmt + sgstAmt + igstAmt + cessAmt;
    }

    const calculatedGrandTotal = totalTaxable + cgstTotal + sgstTotal + igstTotal + cessTotal;
    const roundedGrandTotal = Math.round(calculatedGrandTotal);
    const roundOff = Math.round((roundedGrandTotal - calculatedGrandTotal) * 100) / 100;

    // Create / Resolve accounting ledgers for double entry
    const [purchaseIntraLedger, purchaseInterLedger, cgstInLedger, sgstInLedger, igstInLedger, cashLedger] =
      await Promise.all([
        repos.ledgers.findByName(companyId, 'Purchase - Intra State (CGST + SGST)'),
        repos.ledgers.findByName(companyId, 'Purchase - Inter State (IGST)'),
        repos.ledgers.findByName(companyId, 'CGST Input (ITC)') || repos.ledgers.findByName(companyId, 'CGST Input'),
        repos.ledgers.findByName(companyId, 'SGST Input (ITC)') || repos.ledgers.findByName(companyId, 'SGST Input'),
        repos.ledgers.findByName(companyId, 'IGST Input (ITC)') || repos.ledgers.findByName(companyId, 'IGST Input'),
        repos.ledgers.findByName(companyId, 'Cash in Hand') || repos.ledgers.findByName(companyId, 'Cash'),
      ]);

    // Resolve Supplier ledger
    let supplierLedgerId: string = cashLedger?._id || '';
    let supplierLedgerName = supplierName;

    if (supplierId) {
      const party = await repos.parties.findById(supplierId);
      if (party) {
        const partyLedger = await repos.ledgers.findByName(companyId, party.name);
        if (partyLedger) {
          supplierLedgerId = partyLedger._id;
          supplierLedgerName = partyLedger.name;
        }
      }
    }

    // Build double-entry voucher entries (Dr Purchase, Dr Input GST, Cr Supplier)
    const voucherEntries: any[] = [
      {
        ledgerId: isInterState
          ? purchaseInterLedger?._id || supplierLedgerId
          : purchaseIntraLedger?._id || supplierLedgerId,
        ledgerName: isInterState ? 'Purchase - Inter State (IGST)' : 'Purchase - Intra State (CGST + SGST)',
        debit: totalTaxable,
        credit: 0,
        description: `Taxable Purchases on Bill #${billNumber} (Supplier Inv: ${supplierInvoiceNumber})`,
      },
    ];

    if (!isInterState) {
      if (cgstTotal > 0 && cgstInLedger) {
        voucherEntries.push({
          ledgerId: cgstInLedger._id,
          ledgerName: cgstInLedger.name,
          debit: cgstTotal,
          credit: 0,
          description: `CGST Input Tax Credit on Bill #${billNumber}`,
        });
      }
      if (sgstTotal > 0 && sgstInLedger) {
        voucherEntries.push({
          ledgerId: sgstInLedger._id,
          ledgerName: sgstInLedger.name,
          debit: sgstTotal,
          credit: 0,
          description: `SGST Input Tax Credit on Bill #${billNumber}`,
        });
      }
    } else {
      if (igstTotal > 0 && igstInLedger) {
        voucherEntries.push({
          ledgerId: igstInLedger._id,
          ledgerName: igstInLedger.name,
          debit: igstTotal,
          credit: 0,
          description: `IGST Input Tax Credit on Bill #${billNumber}`,
        });
      }
    }

    // Credit Supplier
    voucherEntries.push({
      ledgerId: supplierLedgerId,
      ledgerName: supplierLedgerName,
      debit: 0,
      credit: roundedGrandTotal,
      description: `Purchase from ${supplierName} (Inv: ${supplierInvoiceNumber})`,
    });

    // Save Purchase Voucher
    const savedVoucher = await repos.vouchers.create({
      voucherNumber: billNumber.trim(),
      voucherType: 'Purchase',
      date: date ? new Date(date) : new Date(),
      partyId: supplierId || undefined,
      partyName: supplierName,
      partyGstin: (supplierGstin || '').toUpperCase(),
      placeOfSupply: placeOfSupply || `${supplierStateCode}-${company.address?.state || 'Bihar'}`,
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
      financialYear: fy,
      companyId,
      status: isDraft ? 'Draft' : 'Posted',
      auditTrail: [
        {
          action: isDraft ? 'DRAFT_PURCHASE' : 'CREATE_PURCHASE',
          timestamp: new Date(),
          user: 'Admin',
          details: `Recorded Purchase Bill #${billNumber} from ${supplierName}`,
        },
      ],
    });

    // Post accounting effects and increment physical stock if not a draft
    if (!isDraft) {
      await AccountingEngine.postVoucherEffects(savedVoucher, false);
    }

    const savedBill = await repos.purchases.create({
      billNumber: billNumber.trim(),
      supplierInvoiceNumber: supplierInvoiceNumber.trim(),
      supplierInvoiceDate: supplierInvoiceDate ? new Date(supplierInvoiceDate) : new Date(),
      voucherId: savedVoucher._id,
      date: date ? new Date(date) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      supplierId: supplierId || undefined,
      supplierName,
      supplierGstin: (supplierGstin || '').toUpperCase(),
      supplierPhone: supplierPhone || '',
      supplierEmail: supplierEmail || '',
      supplierAddress: supplierAddress || {},
      placeOfSupply: placeOfSupply || `${supplierStateCode}-${company.address?.state || 'Bihar'}`,
      isInterState,
      reverseCharge: Boolean(reverseCharge),
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
      amountInWords: numberToWordsIndian(roundedGrandTotal),
      paymentMode: paymentMode || 'Credit',
      paymentStatus: paymentStatus || 'Unpaid',
      paidAmount: Number(paidAmount) || 0,
      balanceAmount: Math.max(0, roundedGrandTotal - (Number(paidAmount) || 0)),
      notes: notes || '',
      companyId,
      financialYear: fy,
    });

    res.status(201).json({ success: true, data: savedBill });
  } catch (err: any) {
    console.error('Error recording purchase bill:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/purchases/:id - Delete purchase bill, reverse stock, and delete voucher
 */
router.delete('/:id', async (req, res) => {
  try {
    const repos = getRepositories();
    const purchase = await repos.purchases.findById(req.params.id);
    if (!purchase) return res.status(404).json({ success: false, error: 'Purchase Bill not found' });

    if (purchase.voucherId) {
      const voucher = await repos.vouchers.findById(purchase.voucherId);
      if (voucher) {
        if (voucher.status === 'Posted') {
          await AccountingEngine.postVoucherEffects(voucher, true); // Reverse stock & ledgers
        }
        await repos.vouchers.delete(purchase.voucherId);
      }
    }

    await repos.purchases.delete(req.params.id);
    res.json({ success: true, message: 'Purchase bill and related accounting entries reverted successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
