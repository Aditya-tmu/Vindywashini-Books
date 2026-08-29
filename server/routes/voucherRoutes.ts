import { Router } from 'express';
import { getRepositories } from '../repositories/factory';
import { AccountingEngine } from '../services/accountingEngine';

const router = Router();

/**
 * GET /api/vouchers - List vouchers with filters
 */
router.get('/', async (req, res) => {
  try {
    const { companyId, voucherType, fromDate, toDate, search } = req.query;
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'companyId is required' });
    }

    const repos = getRepositories();
    const filter: any = {};
    if (voucherType) filter.voucherType = voucherType;
    if (fromDate) filter.startDate = new Date(String(fromDate));
    if (toDate) {
      const end = new Date(String(toDate));
      end.setHours(23, 59, 59, 999);
      filter.endDate = end;
    }

    let vouchers = await repos.vouchers.findByCompany(String(companyId), filter);

    if (search) {
      const q = String(search).toLowerCase();
      vouchers = vouchers.filter(
        (v) =>
          v.voucherNumber.toLowerCase().includes(q) ||
          (v.partyName && v.partyName.toLowerCase().includes(q)) ||
          (v.narration && v.narration.toLowerCase().includes(q))
      );
    }

    res.json({ success: true, data: vouchers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/vouchers/:id - Get single voucher
 */
router.get('/:id', async (req, res) => {
  try {
    const repos = getRepositories();
    const voucher = await repos.vouchers.findById(req.params.id);
    if (!voucher) return res.status(404).json({ success: false, error: 'Voucher not found' });
    res.json({ success: true, data: voucher });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/vouchers - Create a Voucher with double-entry validation
 */
router.post('/', async (req, res) => {
  try {
    const {
      voucherNumber,
      voucherType,
      date,
      effectiveDate,
      referenceNo,
      referenceDate,
      narration,
      partyId,
      partyName,
      partyGstin,
      placeOfSupply,
      isInterState,
      reverseCharge,
      entries,
      items,
      subTotal,
      totalDiscount,
      totalTaxable,
      cgstTotal,
      sgstTotal,
      igstTotal,
      cessTotal,
      roundOff,
      totalAmount,
      companyId,
      financialYear,
      status = 'Posted',
    } = req.body;

    if (!voucherNumber || !voucherType || !companyId) {
      return res.status(400).json({ success: false, error: 'voucherNumber, voucherType, and companyId are required' });
    }

    const repos = getRepositories();
    const company = await repos.companies.findById(companyId);
    const fy = financialYear || company?.currentFY || '2025-2026';

    // Check Financial Year lock
    if (company && company.lockedFYList && company.lockedFYList.includes(fy)) {
      return res.status(400).json({
        success: false,
        error: `Financial Year ${fy} is locked. Unlock it in Settings to post vouchers.`,
      });
    }

    // Check for duplicate voucher number in same FY
    const duplicate = await repos.vouchers.findByNumber(companyId, voucherNumber.trim());
    if (duplicate && duplicate.financialYear === fy && duplicate.voucherType === voucherType) {
      return res.status(400).json({
        success: false,
        error: `Voucher #${voucherNumber.trim()} already exists for ${voucherType} in Financial Year ${fy}. Please use a unique voucher number.`,
      });
    }

    // Validate entries for Posted vouchers
    const cleanEntries = (entries || []).map((e: any) => ({
      ledgerId: String(e.ledgerId || ''),
      ledgerName: e.ledgerName || 'General Account',
      debit: Number(e.debit) || 0,
      credit: Number(e.credit) || 0,
      description: e.description || '',
    }));

    if (status !== 'Draft') {
      if (cleanEntries.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'At least two ledger line entries (one Debit and one Credit) are required to post a voucher.',
        });
      }

      for (let i = 0; i < cleanEntries.length; i++) {
        const e = cleanEntries[i];
        if (!e.ledgerId) {
          return res.status(400).json({
            success: false,
            error: `Row #${i + 1} has no Ledger Account selected. Please select a valid ledger for each row.`,
          });
        }
        if (e.debit <= 0 && e.credit <= 0) {
          return res.status(400).json({
            success: false,
            error: `Row #${i + 1} (${e.ledgerName}) must have an amount greater than zero.`,
          });
        }
      }

      const totalDebit = cleanEntries.reduce((acc: number, curr: any) => acc + curr.debit, 0);
      const totalCredit = cleanEntries.reduce((acc: number, curr: any) => acc + curr.credit, 0);
      const diff = Math.abs(totalDebit - totalCredit);

      if (diff > 0.01) {
        return res.status(400).json({
          success: false,
          error: `Total Debit (₹${totalDebit.toFixed(2)}) does not match Total Credit (₹${totalCredit.toFixed(2)}) — difference ₹${diff.toFixed(2)}.`,
        });
      }
    }

    const calculatedTotal =
      cleanEntries.reduce((acc: number, curr: any) => acc + curr.debit, 0) || Number(totalAmount) || 0;

    const saved = await repos.vouchers.create({
      voucherNumber: voucherNumber.trim(),
      voucherType,
      date: date ? new Date(date) : new Date(),
      partyId: partyId || undefined,
      partyName: partyName || '',
      partyGstin: partyGstin || '',
      placeOfSupply: placeOfSupply || `${company?.address.stateCode || '10'}-${company?.address.state || 'Bihar'}`,
      isInterState: Boolean(isInterState),
      entries: cleanEntries,
      items: items || [],
      subTotal: Number(subTotal) || 0,
      totalDiscount: Number(totalDiscount) || 0,
      totalTaxable: Number(totalTaxable) || 0,
      cgstTotal: Number(cgstTotal) || 0,
      sgstTotal: Number(sgstTotal) || 0,
      igstTotal: Number(igstTotal) || 0,
      cessTotal: Number(cessTotal) || 0,
      roundOff: Number(roundOff) || 0,
      totalAmount: calculatedTotal,
      narration: narration || '',
      status: status || 'Posted',
      financialYear: fy,
      companyId,
      auditTrail: [
        {
          action: status === 'Draft' ? 'DRAFT_CREATED' : 'CREATE',
          timestamp: new Date(),
          user: 'Admin',
          details: `Created ${status} ${voucherType} voucher #${voucherNumber} for ₹${calculatedTotal.toFixed(2)}`,
        },
      ],
    });

    // Only post effects to Ledgers and Item stock if not a draft
    if (saved.status === 'Posted') {
      await AccountingEngine.postVoucherEffects(saved, false);
    }

    res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    console.error('Error creating voucher:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/vouchers/:id/cancel - Cancel/Void Voucher (Reverses Ledger balances, keeps audit trail)
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const repos = getRepositories();
    const existing = await repos.vouchers.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Voucher not found' });
    if (existing.status === 'Cancelled') {
      return res.status(400).json({ success: false, error: 'Voucher is already cancelled.' });
    }

    const { reason = 'Cancelled by user' } = req.body;

    // Reverse ledger and stock effects if it was posted
    if (existing.status === 'Posted') {
      await AccountingEngine.postVoucherEffects(existing, true);
    }

    const updated = await repos.vouchers.cancel(req.params.id, reason);
    res.json({ success: true, message: 'Voucher cancelled and accounting effects reversed', data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/vouchers/:id - Update Voucher
 */
router.put('/:id', async (req, res) => {
  try {
    const repos = getRepositories();
    const existing = await repos.vouchers.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Voucher not found' });

    // Reverse old effects if it was previously posted
    if (existing.status === 'Posted') {
      await AccountingEngine.postVoucherEffects(existing, true);
    }

    const updated = await repos.vouchers.update(req.params.id, req.body);

    // Apply new effects if now posted
    if (updated && updated.status === 'Posted') {
      await AccountingEngine.postVoucherEffects(updated, false);
    }

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/vouchers/:id - Delete voucher
 */
router.delete('/:id', async (req, res) => {
  try {
    const repos = getRepositories();
    const existing = await repos.vouchers.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Voucher not found' });

    // Reverse effects
    if (existing.status === 'Posted') {
      await AccountingEngine.postVoucherEffects(existing, true);
    }
    await repos.vouchers.delete(req.params.id);

    res.json({ success: true, message: 'Voucher deleted and ledger/stock effects reverted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
