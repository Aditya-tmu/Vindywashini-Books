import { Router } from 'express';
import { getRepositories } from '../repositories/factory';
import { StorageService } from '../services/storageService';

const router = Router();

/**
 * POST /api/storage/test - Test Supabase Storage credentials and bucket access
 */
router.post('/test', async (req, res) => {
  try {
    const { storageConfig, companyId } = req.body;
    let configToTest = storageConfig;

    if (!configToTest && companyId) {
      const repos = getRepositories();
      const settings = await repos.settings.getSettings(companyId);
      configToTest = settings?.storage;
    }

    if (!configToTest) {
      const repos = getRepositories();
      const settings = await repos.settings.getSettings();
      configToTest = settings?.storage;
    }

    const result = await StorageService.testStorage({ storage: configToTest });
    if (result.success) {
      res.json({ success: true, message: result.message, bucketExists: result.bucketExists });
    } else {
      res.status(400).json({ success: false, error: result.message });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/storage/usage - Get current bucket storage usage against 50MB plan limit
 */
router.get('/usage', async (req, res) => {
  try {
    const { companyId } = req.query;
    const repos = getRepositories();
    const settings = await repos.settings.getSettings(companyId ? String(companyId) : undefined);

    const summary = await StorageService.getStorageUsage(settings);
    res.json({ success: true, data: summary });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/storage/upload/:invoiceId - Trigger or retry cloud upload for an invoice
 */
router.post('/upload/:invoiceId', async (req, res) => {
  try {
    const repos = getRepositories();
    const invoice = await repos.invoices.findById(req.params.invoiceId);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    const company = await repos.companies.findById(invoice.companyId);
    const settings = await repos.settings.getSettings(invoice.companyId);

    if (!StorageService.isConfigured(settings)) {
      return res.status(400).json({
        success: false,
        error: 'Cloud Storage is not configured. Please enter your Supabase credentials in Settings.',
      });
    }

    const uploadRes = await StorageService.uploadInvoice(invoice, company, settings);

    if (uploadRes.success) {
      await repos.invoices.update(invoice._id, {
        cloudStoragePath: uploadRes.path,
        signedUrl: uploadRes.signedUrl,
        signedUrlExpiresAt: uploadRes.expiresAt,
        cloudUploadStatus: 'uploaded',
        cloudUploadError: undefined,
      });

      res.json({
        success: true,
        data: {
          path: uploadRes.path,
          signedUrl: uploadRes.signedUrl,
          expiresAt: uploadRes.expiresAt,
        },
      });
    } else {
      await repos.invoices.update(invoice._id, {
        cloudUploadStatus: 'failed',
        cloudUploadError: uploadRes.error,
      });

      res.status(400).json({ success: false, error: uploadRes.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/storage/signed-url/:invoiceId - Get valid signed URL (cached or refreshed)
 */
router.post('/signed-url/:invoiceId', async (req, res) => {
  try {
    const repos = getRepositories();
    const invoice = await repos.invoices.findById(req.params.invoiceId);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });

    const company = await repos.companies.findById(invoice.companyId);
    const settings = await repos.settings.getSettings(invoice.companyId);

    if (!StorageService.isConfigured(settings)) {
      return res.status(400).json({
        success: false,
        error: 'Cloud Storage is not configured in Settings.',
      });
    }

    const result = await StorageService.getOrRefreshSignedUrl(invoice, company, settings);

    if (result.signedUrl) {
      if (result.isFresh) {
        await repos.invoices.update(invoice._id, {
          signedUrl: result.signedUrl,
          signedUrlExpiresAt: result.expiresAt,
          cloudUploadStatus: 'uploaded',
        });
      }

      res.json({
        success: true,
        data: {
          signedUrl: result.signedUrl,
          expiresAt: result.expiresAt,
          isFresh: result.isFresh,
        },
      });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/storage/cleanup - Clean up cloud copies older than N days
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { companyId, days } = req.body;
    const repos = getRepositories();
    const settings = await repos.settings.getSettings(companyId);

    const cleanupDays = days !== undefined ? Number(days) : settings?.storage?.autoCleanupDays || 90;

    const result = await StorageService.cleanupOldInvoices(cleanupDays, settings);
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        deletedCount: result.deletedCount,
        freedBytes: result.freedBytes,
      });
    } else {
      res.status(400).json({ success: false, error: result.message });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/storage/cleanup-legacy - Clean up any leftover .html files or test artifacts from earlier testing
 */
router.post('/cleanup-legacy', async (req, res) => {
  try {
    const { companyId } = req.body;
    const repos = getRepositories();
    const settings = await repos.settings.getSettings(companyId);

    const result = await StorageService.cleanupLegacyHtmlFiles(settings);
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        deletedCount: result.deletedCount,
      });
    } else {
      res.status(400).json({ success: false, error: result.message });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
