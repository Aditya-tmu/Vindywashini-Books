import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { GSTEngine } from '../services/gstEngine';
import { ExcelService } from '../services/excelService';
import { GSPService } from '../services/gspService';
import { GSTReturn } from '../models/GSTReturn';
import { getActiveProvider } from '../repositories/factory';
import { getTempDir, getGstExportsDir } from '../config/paths';

const router = Router();
const upload = multer({ dest: getTempDir() });

/**
 * GET /api/gst/gstr1 - Compute and view GSTR-1 buckets
 */
router.get('/gstr1', async (req, res) => {
  try {
    const { companyId, period } = req.query;
    if (!companyId || !period) {
      return res.status(400).json({ success: false, error: 'companyId and period (e.g. 2025-07) are required' });
    }

    const gstr1Data = await GSTEngine.generateGSTR1(String(companyId), String(period));
    res.json({ success: true, data: gstr1Data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/gst/gstr1/export-excel - Download multi-sheet offline utility Excel workbook
 */
router.get('/gstr1/export-excel', async (req, res) => {
  try {
    const { companyId, period } = req.query;
    if (!companyId || !period) {
      return res.status(400).json({ success: false, error: 'companyId and period are required' });
    }

    const gstr1Data = await GSTEngine.generateGSTR1(String(companyId), String(period));
    const outputDir = getGstExportsDir();
    const result = await ExcelService.generateGSTR1Workbook(gstr1Data, outputDir);

    // Save snapshot in GSTReturn only if running with MongoDB provider
    if (getActiveProvider() === 'mongodb') {
      try {
        await GSTReturn.findOneAndUpdate(
          { companyId, period, returnType: 'GSTR-1' },
          {
            companyId,
            period,
            returnType: 'GSTR-1',
            summaryData: gstr1Data.summary,
            filingStatus: 'Generated',
            $push: {
              exportFiles: {
                format: 'xlsx',
                filename: result.filename,
                filePath: result.filePath,
                generatedAt: new Date(),
              },
            },
          },
          { upsert: true }
        );
      } catch (logErr: any) {
        console.warn('[GSTRoutes] Note on GSTReturn Mongo snapshot:', logErr.message);
      }
    }

    res.download(result.filePath, result.filename);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/gst/gstr1/export-csv-zip - Download Zip containing all individual official CSVs
 */
router.get('/gstr1/export-csv-zip', async (req, res) => {
  try {
    const { companyId, period } = req.query;
    if (!companyId || !period) {
      return res.status(400).json({ success: false, error: 'companyId and period are required' });
    }

    const gstr1Data = await GSTEngine.generateGSTR1(String(companyId), String(period));
    const outputDir = getGstExportsDir();
    const result = await ExcelService.createGSTR1CsvZip(gstr1Data, outputDir);

    res.download(result.zipPath, result.filename);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/gst/gstr1/export-json - Download portal-ready GSTR-1 JSON
 */
router.get('/gstr1/export-json', async (req, res) => {
  try {
    const { companyId, period } = req.query;
    if (!companyId || !period) {
      return res.status(400).json({ success: false, error: 'companyId and period are required' });
    }

    const gstr1Data = await GSTEngine.generateGSTR1(String(companyId), String(period));
    const portalJson = GSTEngine.generateGSTR1PortalJson(gstr1Data);

    const filename = `GSTR1_Portal_${gstr1Data.gstin || 'NO_GSTIN'}_${gstr1Data.fp}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(portalJson, null, 2));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/gst/gstr1/direct-efile - Direct filing via pluggable GSP connector
 */
router.post('/gstr1/direct-efile', async (req, res) => {
  try {
    const { companyId, period } = req.body;
    if (!companyId || !period) {
      return res.status(400).json({ success: false, error: 'companyId and period are required' });
    }

    const gstr1Data = await GSTEngine.generateGSTR1(String(companyId), String(period));
    const result = await GSPService.pushGSTR1(String(companyId), gstr1Data);

    if (result.success && getActiveProvider() === 'mongodb') {
      try {
        await GSTReturn.findOneAndUpdate(
          { companyId, period, returnType: 'GSTR-1' },
          {
            filingStatus: 'Filed',
            gspRefId: result.referenceId,
            arn: result.arn,
            filingDate: new Date(),
          },
          { upsert: true }
        );
      } catch (logErr: any) {
        console.warn('[GSTRoutes] Note on GSTReturn Mongo update:', logErr.message);
      }
    }

    res.json({ success: result.success, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/gst/gstr3b - Compute GSTR-3B Summary
 */
router.get('/gstr3b', async (req, res) => {
  try {
    const { companyId, period } = req.query;
    if (!companyId || !period) {
      return res.status(400).json({ success: false, error: 'companyId and period are required' });
    }

    const gstr3bData = await GSTEngine.generateGSTR3B(String(companyId), String(period));
    res.json({ success: true, data: gstr3bData });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/gst/gstr2b-recon - GSTR-2A/2B Auto Reconciliation
 */
router.post(['/gstr2b-recon', '/gstr2b/reconcile'], upload.single('portalFile'), async (req, res) => {
  try {
    const { companyId, period, recordsJson, records: bodyRecords, portalRecords } = req.body;
    if (!companyId || !period) {
      return res.status(400).json({ success: false, error: 'companyId and period are required' });
    }

    let records: any[] = [];
    if (portalRecords && Array.isArray(portalRecords)) {
      records = portalRecords;
    } else if (bodyRecords && Array.isArray(bodyRecords)) {
      records = bodyRecords;
    } else if (recordsJson) {
      try {
        records = typeof recordsJson === 'string' ? JSON.parse(recordsJson) : recordsJson;
      } catch (e) {}
    }

    if (req.file) {
      const content = fs.readFileSync(req.file.path, 'utf8');
      try {
        const parsed = JSON.parse(content);
        // Handle standard GST portal GSTR-2B JSON schema or custom list
        if (parsed.data?.docdata?.b2b) {
          for (const b of parsed.data.docdata.b2b) {
            for (const inv of b.inv || []) {
              records.push({
                gstin: b.ctin,
                tradeName: b.trdnm,
                invoiceNumber: inv.inum,
                invoiceDate: inv.idt,
                invoiceValue: inv.val,
                taxableValue: inv.txval || inv.itms?.[0]?.itm_det?.txval || 0,
                igst: inv.iamt || inv.itms?.[0]?.itm_det?.iamt || 0,
                cgst: inv.camt || inv.itms?.[0]?.itm_det?.camt || 0,
                sgst: inv.samt || inv.itms?.[0]?.itm_det?.samt || 0,
                cess: inv.csamt || 0,
              });
            }
          }
        } else if (Array.isArray(parsed)) {
          records = parsed;
        } else if (parsed.records && Array.isArray(parsed.records)) {
          records = parsed.records;
        }
      } catch (e) {
        console.warn('Could not parse uploaded JSON file directly, checking raw text');
      }
      fs.unlinkSync(req.file.path);
    } else if (recordsJson) {
      records = typeof recordsJson === 'string' ? JSON.parse(recordsJson) : recordsJson;
    }

    const reconResult = await GSTEngine.reconcileGSTR2B(String(companyId), String(period), records);
    res.json({ success: true, data: reconResult });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
