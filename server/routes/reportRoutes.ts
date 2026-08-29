import { Router } from 'express';
import path from 'path';
import { AccountingEngine } from '../services/accountingEngine';
import { ExcelService } from '../services/excelService';
import { getReportsDir } from '../config/paths';

const router = Router();

/**
 * GET /api/reports/daybook - Get Day Book
 */
router.get('/daybook', async (req, res) => {
  try {
    const { companyId, fromDate, toDate } = req.query;
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

    const report = await AccountingEngine.getDayBook(
      String(companyId),
      fromDate ? String(fromDate) : undefined,
      toDate ? String(toDate) : undefined
    );
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/reports/ledger-statement - Get Ledger Statement
 */
router.get('/ledger-statement', async (req, res) => {
  try {
    const { companyId, ledgerId, fromDate, toDate } = req.query;
    if (!companyId || !ledgerId) {
      return res.status(400).json({ success: false, error: 'companyId and ledgerId are required' });
    }

    const report = await AccountingEngine.getLedgerStatement(
      String(companyId),
      String(ledgerId),
      fromDate ? String(fromDate) : undefined,
      toDate ? String(toDate) : undefined
    );
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/reports/trial-balance - Get Trial Balance
 */
router.get('/trial-balance', async (req, res) => {
  try {
    const { companyId, asOfDate } = req.query;
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

    const report = await AccountingEngine.getTrialBalance(
      String(companyId),
      asOfDate ? String(asOfDate) : undefined
    );
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/reports/profit-loss - Get Profit & Loss Account
 */
router.get(['/profit-loss', '/profit-and-loss'], async (req, res) => {
  try {
    const { companyId, fromDate, toDate } = req.query;
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

    const report = await AccountingEngine.getProfitAndLoss(
      String(companyId),
      fromDate ? String(fromDate) : undefined,
      toDate ? String(toDate) : undefined
    );
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/reports/balance-sheet - Get Balance Sheet
 */
router.get('/balance-sheet', async (req, res) => {
  try {
    const { companyId, asOfDate } = req.query;
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

    const report = await AccountingEngine.getBalanceSheet(
      String(companyId),
      asOfDate ? String(asOfDate) : undefined
    );
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/reports/cash-bank-book - Get Cash & Bank Book
 */
router.get('/cash-bank-book', async (req, res) => {
  try {
    const { companyId, fromDate, toDate } = req.query;
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

    const report = await AccountingEngine.getCashBankBook(
      String(companyId),
      fromDate ? String(fromDate) : undefined,
      toDate ? String(toDate) : undefined
    );
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/reports/stock-summary - Get Stock Summary
 */
router.get('/stock-summary', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

    const report = await AccountingEngine.getStockSummary(String(companyId));
    res.json({ success: true, data: report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/reports/export-excel - Generic Excel report exporter
 */
router.post('/export-excel', async (req, res) => {
  try {
    const { title, headers, rows } = req.body;
    const outputDir = getReportsDir();
    const result = await ExcelService.exportGenericReportToExcel(title, headers, rows, outputDir);
    res.download(result.filePath, result.filename);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
