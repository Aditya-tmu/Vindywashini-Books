import { StorageClient } from '@supabase/storage-js';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { PDFGenerator } from './pdfGenerator';

export interface CloudStorageConfig {
  enabled: boolean;
  supabaseUrl: string;
  serviceRoleKey: string;
  bucketName: string;
  signedUrlExpiryDays: number;
  autoCleanupDays: number;
  useShortLinks?: boolean;
}

export interface StorageUsageSummary {
  configured: boolean;
  bucketName: string;
  totalBytes: number;
  totalFiles: number;
  planLimitBytes: number;
  percentUsed: number;
  warning: boolean;
  error?: string;
}

export class StorageService {
  private static clientCache = new Map<string, StorageClient>();

  /**
   * Check if Supabase Storage is configured in settings
   */
  public static isConfigured(settings?: any): boolean {
    if (!settings || !settings.storage) return false;
    const { enabled, supabaseUrl, serviceRoleKey, bucketName } = settings.storage;
    return Boolean(
      enabled &&
      supabaseUrl &&
      typeof supabaseUrl === 'string' &&
      supabaseUrl.trim().startsWith('http') &&
      serviceRoleKey &&
      typeof serviceRoleKey === 'string' &&
      serviceRoleKey.trim().length > 10 &&
      bucketName &&
      typeof bucketName === 'string' &&
      bucketName.trim().length > 0
    );
  }

  /**
   * Get Supabase Storage Client with caching (zero Realtime/WebSocket dependencies)
   */
  public static getClient(settings: any): StorageClient {
    if (!this.isConfigured(settings)) {
      throw new Error('Supabase Storage is not configured or disabled in Settings.');
    }
    const rawUrl = settings.storage.supabaseUrl.trim().replace(/\/+$/, '');
    const storageUrl = rawUrl.endsWith('/storage/v1') ? rawUrl : `${rawUrl}/storage/v1`;
    const key = settings.storage.serviceRoleKey.trim();
    const cacheKey = `${storageUrl}:${key.substring(0, 10)}`;

    if (!this.clientCache.has(cacheKey)) {
      const client = new StorageClient(storageUrl, {
        apikey: key,
        Authorization: `Bearer ${key}`,
      });
      this.clientCache.set(cacheKey, client);
    }
    return this.clientCache.get(cacheKey)!;
  }

  /**
   * Ensure bucket exists (creates private bucket if missing)
   */
  public static async ensureBucket(client: StorageClient, bucketName: string): Promise<boolean> {
    try {
      const { data: bucket, error: getErr } = await client.getBucket(bucketName);
      if (bucket && !getErr) return true;

      // Bucket does not exist or need creation
      const { error: createErr } = await client.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['application/pdf', 'text/html', 'image/png', 'image/jpeg'],
      });

      if (createErr && !createErr.message?.includes('already exists')) {
        console.warn(`[StorageService] Note on createBucket: ${createErr.message}`);
      }
      return true;
    } catch (err: any) {
      console.warn(`[StorageService] Error ensuring bucket: ${err.message}`);
      return false;
    }
  }

  /**
   * Shorten long signed URL using TinyURL free public API (optional opt-in)
   */
  public static async shortenUrl(longUrl: string): Promise<string> {
    if (!longUrl || typeof longUrl !== 'string' || !longUrl.startsWith('http')) {
      return longUrl;
    }
    try {
      const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, {
        timeout: 3500,
      });
      if (res.status === 200 && typeof res.data === 'string' && res.data.startsWith('http')) {
        return res.data.trim();
      }
    } catch (err: any) {
      console.warn('[StorageService] Optional short URL generation note (using direct signed URL):', err.message);
    }
    return longUrl;
  }

  /**
   * Test Supabase Storage Connection & Bucket
   */
  public static async testStorage(settings: any): Promise<{
    success: boolean;
    message: string;
    bucketExists: boolean;
  }> {
    try {
      if (!this.isConfigured(settings)) {
        return {
          success: false,
          message: 'Please provide a valid Supabase Project URL, Service Role Key, and Bucket Name.',
          bucketExists: false,
        };
      }

      const client = this.getClient(settings);
      const bucketName = settings.storage.bucketName.trim();

      // Check / ensure bucket
      await this.ensureBucket(client, bucketName);

      // Perform a minimal write & signed-url healthcheck
      const testPath = `_test/healthcheck_${Date.now()}.txt`;
      const testBuffer = Buffer.from('Vindywashini Books Storage Healthcheck OK', 'utf8');

      const { error: uploadErr } = await client.from(bucketName).upload(testPath, testBuffer, {
        contentType: 'text/plain',
        upsert: true,
      });

      if (uploadErr) {
        return {
          success: false,
          message: `Storage upload failed: ${uploadErr.message}`,
          bucketExists: false,
        };
      }

      const { data: signedData, error: signErr } = await client.from(bucketName).createSignedUrl(testPath, 60);
      if (signErr) {
        return {
          success: false,
          message: `Signed URL generation failed: ${signErr.message}`,
          bucketExists: true,
        };
      }

      // Cleanup test file
      await client.from(bucketName).remove([testPath]);

      return {
        success: true,
        message: `Connected successfully to Supabase Storage bucket "${bucketName}"! Private storage and signed URL generation verified.`,
        bucketExists: true,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Storage connection test error: ${err.message}`,
        bucketExists: false,
      };
    }
  }

  /**
   * Universal Shared PDF Upload Function (Single Source of Truth)
   * Uploads any genuine PDF buffer to Supabase Storage and generates a signed URL
   */
  public static async uploadPdfBuffer(
    storagePath: string,
    buffer: Buffer,
    settings: any
  ): Promise<{
    success: boolean;
    path?: string;
    signedUrl?: string;
    expiresAt?: Date;
    error?: string;
  }> {
    try {
      if (!this.isConfigured(settings)) {
        return { success: false, error: 'Cloud storage is not configured or disabled in Settings.' };
      }

      if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
        return { success: false, error: 'Invalid or empty PDF buffer provided for cloud upload.' };
      }

      const client = this.getClient(settings);
      const bucketName = settings.storage.bucketName.trim();

      await this.ensureBucket(client, bucketName);

      // Warn if buffer is larger than 3MB (storage quota protection)
      if (buffer.length > 3 * 1024 * 1024) {
        console.warn(
          `[StorageService] Note: Uploading large PDF (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) to path "${storagePath}".`
        );
      }

      // Upload genuine PDF / Overwrite (upsert: true, contentType: application/pdf)
      const { error: uploadErr } = await client.from(bucketName).upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

      if (uploadErr) {
        console.error(`[StorageService] Upload error at ${storagePath}:`, uploadErr.message);
        return { success: false, error: uploadErr.message };
      }

      // Generate signed URL with configured expiry (default 30 days)
      const expiryDays = Number(settings.storage?.signedUrlExpiryDays) || 30;
      const expirySeconds = expiryDays * 86400;

      const { data: signData, error: signErr } = await client
        .from(bucketName)
        .createSignedUrl(storagePath, expirySeconds);

      if (signErr || !signData?.signedUrl) {
        return {
          success: false,
          path: storagePath,
          error: signErr?.message || 'Could not generate signed URL',
        };
      }

      let signedUrl = signData.signedUrl;
      if (settings.storage?.useShortLinks) {
        signedUrl = await this.shortenUrl(signedUrl);
      }

      const expiresAt = new Date(Date.now() + expirySeconds * 1000);

      return {
        success: true,
        path: storagePath,
        signedUrl,
        expiresAt,
      };
    } catch (err: any) {
      console.error(`[StorageService] uploadPdfBuffer exception at "${storagePath}":`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Upload Invoice genuine PDF to Supabase Storage using shared uploadPdfBuffer
   */
  public static async uploadInvoice(
    invoice: any,
    company: any,
    settings: any,
    contentBuffer?: Buffer,
    template?: string
  ): Promise<{
    success: boolean;
    path?: string;
    signedUrl?: string;
    expiresAt?: Date;
    error?: string;
  }> {
    try {
      if (!this.isConfigured(settings)) {
        return { success: false, error: 'Cloud storage is not configured or disabled.' };
      }

      // Financial year format: e.g. "2025-2026" -> "2025-26"
      const fyRaw = company?.currentFY || invoice?.financialYear || '2025-2026';
      const cleanFy = fyRaw.replace(/[^a-zA-Z0-9-]/g, '');
      const companyId = String(company?._id || invoice?.companyId || 'default');
      const safeInvNo = invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');

      // Canonical Path: invoices/{companyId}/{financialYear}/{invoiceNumber}.pdf (Strictly .pdf)
      const storagePath = `invoices/${companyId}/${cleanFy}/${safeInvNo}.pdf`;

      let uploadBuffer: Buffer;
      if (contentBuffer && Buffer.isBuffer(contentBuffer) && contentBuffer.slice(0, 4).toString().includes('%PDF')) {
        uploadBuffer = contentBuffer;
      } else if (invoice.pdfPath && invoice.pdfPath.toLowerCase().endsWith('.pdf') && fs.existsSync(invoice.pdfPath)) {
        uploadBuffer = fs.readFileSync(invoice.pdfPath);
      } else {
        const tpl = (template as any) || invoice.templateUsed || company?.defaultTemplate || 'A4';
        uploadBuffer = await PDFGenerator.generateInvoicePdfBuffer(invoice, company, tpl);
      }

      const uploadRes = await this.uploadPdfBuffer(storagePath, uploadBuffer, settings);

      // Clean up legacy .html file for this invoice if it was uploaded previously
      if (uploadRes.success) {
        try {
          const client = this.getClient(settings);
          const bucketName = settings.storage.bucketName.trim();
          const legacyHtmlPath = `invoices/${companyId}/${cleanFy}/${safeInvNo}.html`;
          client.from(bucketName).remove([legacyHtmlPath]).catch(() => {});
        } catch {}
      }

      return uploadRes;
    } catch (err: any) {
      console.error(`[StorageService] uploadInvoice exception:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Upload consolidated Bulk Export PDF to Supabase Storage using shared uploadPdfBuffer
   */
  public static async uploadBulkExport(
    companyId: string,
    partyId: string,
    startDateStr: string,
    endDateStr: string,
    buffer: Buffer,
    settings: any
  ): Promise<{
    success: boolean;
    path?: string;
    signedUrl?: string;
    expiresAt?: Date;
    error?: string;
  }> {
    const safeCompany = String(companyId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeParty = String(partyId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeStart = (startDateStr || 'all').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeEnd = (endDateStr || 'time').replace(/[^a-zA-Z0-9_-]/g, '_');
    const storagePath = `bulk-exports/${safeCompany}/${safeParty}/${safeStart}_${safeEnd}.pdf`;

    return await this.uploadPdfBuffer(storagePath, buffer, settings);
  }

  /**
   * Upload GST / ITC Report PDF to Supabase Storage using shared uploadPdfBuffer
   */
  public static async uploadGstReport(
    companyId: string,
    partyId: string,
    reportType: string,
    startDateStr: string,
    endDateStr: string,
    buffer: Buffer,
    settings: any
  ): Promise<{
    success: boolean;
    path?: string;
    signedUrl?: string;
    expiresAt?: Date;
    error?: string;
  }> {
    const safeCompany = String(companyId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeParty = String(partyId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeType = (reportType || 'gst_report').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeStart = (startDateStr || 'all').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeEnd = (endDateStr || 'time').replace(/[^a-zA-Z0-9_-]/g, '_');
    const storagePath = `gst-reports/${safeCompany}/${safeParty}/${safeType}_${safeStart}_${safeEnd}.pdf`;

    return await this.uploadPdfBuffer(storagePath, buffer, settings);
  }


  /**
   * Get existing valid signed URL or regenerate if expired
   */
  public static async getOrRefreshSignedUrl(
    invoice: any,
    company: any,
    settings: any
  ): Promise<{
    signedUrl?: string;
    expiresAt?: Date;
    isFresh: boolean;
    error?: string;
  }> {
    if (!this.isConfigured(settings)) {
      return { isFresh: false, error: 'Cloud storage is not configured' };
    }

    const fiveMinutes = 5 * 60 * 1000;
    const now = Date.now();

    // 1. Check if existing signed URL is still valid and not pointing to old .html
    const hasLegacyHtmlPath = invoice.cloudStoragePath && invoice.cloudStoragePath.endsWith('.html');

    if (!hasLegacyHtmlPath && invoice.signedUrl && invoice.signedUrlExpiresAt) {
      const expTime = new Date(invoice.signedUrlExpiresAt).getTime();
      if (expTime > now + fiveMinutes) {
        return {
          signedUrl: invoice.signedUrl,
          expiresAt: new Date(invoice.signedUrlExpiresAt),
          isFresh: false,
        };
      }
    }

    // 2. If valid .pdf storage path exists, regenerate signed URL
    if (invoice.cloudStoragePath && invoice.cloudStoragePath.endsWith('.pdf')) {
      try {
        const client = this.getClient(settings);
        const bucketName = settings.storage.bucketName.trim();
        const expiryDays = Number(settings.storage.signedUrlExpiryDays) || 30;
        const expirySeconds = expiryDays * 86400;

        const { data, error } = await client
          .from(bucketName)
          .createSignedUrl(invoice.cloudStoragePath, expirySeconds);

        if (!error && data?.signedUrl) {
          let signedUrl = data.signedUrl;
          if (settings.storage.useShortLinks) {
            signedUrl = await this.shortenUrl(signedUrl);
          }
          const expiresAt = new Date(Date.now() + expirySeconds * 1000);
          return {
            signedUrl,
            expiresAt,
            isFresh: true,
          };
        }
      } catch (err: any) {
        console.warn(`[StorageService] Could not refresh signed URL: ${err.message}`);
      }
    }

    // 3. Fallback: Upload genuine PDF to storage and generate fresh signed URL
    const uploadRes = await this.uploadInvoice(invoice, company, settings);
    if (uploadRes.success && uploadRes.signedUrl) {
      return {
        signedUrl: uploadRes.signedUrl,
        expiresAt: uploadRes.expiresAt,
        isFresh: true,
      };
    }

    return { isFresh: false, error: uploadRes.error || 'Failed to generate cloud storage link' };
  }

  /**
   * Get current bucket storage usage and stats against the 50MB free quota
   */
  public static async getStorageUsage(settings: any): Promise<StorageUsageSummary> {
    const defaultRes: StorageUsageSummary = {
      configured: false,
      bucketName: '',
      totalBytes: 0,
      totalFiles: 0,
      planLimitBytes: 50 * 1024 * 1024,
      percentUsed: 0,
      warning: false,
    };

    if (!this.isConfigured(settings)) return defaultRes;

    try {
      const client = this.getClient(settings);
      const bucketName = settings.storage.bucketName.trim();

      // Collect all files recursively in 'invoices' prefix
      let totalBytes = 0;
      let totalFiles = 0;

      const queue: string[] = ['invoices'];

      while (queue.length > 0) {
        const currentPrefix = queue.shift()!;
        const { data, error } = await client.from(bucketName).list(currentPrefix, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' },
        });

        if (error) {
          console.warn(`[StorageService] Error listing path ${currentPrefix}:`, error.message);
          continue;
        }

        if (data) {
          for (const item of data) {
            if (item.id === null) {
              // It's a directory
              queue.push(`${currentPrefix}/${item.name}`);
            } else {
              totalFiles++;
              const size = item.metadata?.size || (item as any).size || 0;
              totalBytes += Number(size);
            }
          }
        }
      }

      const planLimitBytes = 50 * 1024 * 1024; // 50 MB
      const percentUsed = Math.min(100, Math.round((totalBytes / planLimitBytes) * 1000) / 10);

      return {
        configured: true,
        bucketName,
        totalBytes,
        totalFiles,
        planLimitBytes,
        percentUsed,
        warning: percentUsed >= 80,
      };
    } catch (err: any) {
      return {
        ...defaultRes,
        configured: true,
        bucketName: settings?.storage?.bucketName || '',
        error: err.message,
      };
    }
  }

  /**
   * One-time or maintenance cleanup of legacy .html files and leftover test files from bucket
   */
  public static async cleanupLegacyHtmlFiles(settings: any): Promise<{
    success: boolean;
    deletedCount: number;
    message: string;
  }> {
    if (!this.isConfigured(settings)) {
      return { success: false, deletedCount: 0, message: 'Storage not configured' };
    }

    try {
      const client = this.getClient(settings);
      const bucketName = settings.storage.bucketName.trim();
      const legacyPaths: string[] = [];

      const queue: string[] = ['invoices', '_test'];

      while (queue.length > 0) {
        const currentPrefix = queue.shift()!;
        const { data, error } = await client.from(bucketName).list(currentPrefix, { limit: 1000 });
        if (!error && data) {
          for (const item of data) {
            if (item.id === null) {
              queue.push(`${currentPrefix}/${item.name}`);
            } else {
              const nameLower = item.name.toLowerCase();
              if (nameLower.endsWith('.html') || nameLower.endsWith('.txt') || currentPrefix.startsWith('_test')) {
                legacyPaths.push(`${currentPrefix}/${item.name}`);
              }
            }
          }
        }
      }

      if (legacyPaths.length > 0) {
        await client.from(bucketName).remove(legacyPaths);
      }

      return {
        success: true,
        deletedCount: legacyPaths.length,
        message: `Removed ${legacyPaths.length} legacy .html / test artifact(s) from bucket "${bucketName}".`,
      };
    } catch (err: any) {
      return { success: false, deletedCount: 0, message: err.message };
    }
  }

  /**
   * Delete cloud copies of invoices older than N days (Auto-cleanup)
   */
  public static async cleanupOldInvoices(
    days: number,
    settings: any
  ): Promise<{
    success: boolean;
    deletedCount: number;
    freedBytes: number;
    message: string;
  }> {
    if (!this.isConfigured(settings)) {
      return { success: false, deletedCount: 0, freedBytes: 0, message: 'Storage not configured' };
    }

    try {
      const client = this.getClient(settings);
      const bucketName = settings.storage.bucketName.trim();
      const cutoff = days > 0 ? Date.now() - days * 86400 * 1000 : 0;

      const pathsToDelete: string[] = [];
      let freedBytes = 0;

      const queue: string[] = ['invoices', '_test'];

      while (queue.length > 0) {
        const currentPrefix = queue.shift()!;
        const { data, error } = await client.from(bucketName).list(currentPrefix, { limit: 1000 });
        if (!error && data) {
          for (const item of data) {
            if (item.id === null) {
              queue.push(`${currentPrefix}/${item.name}`);
            } else {
              const nameLower = item.name.toLowerCase();
              const isLegacyHtml = nameLower.endsWith('.html') || nameLower.endsWith('.txt') || currentPrefix.startsWith('_test');
              const rawDate = item.created_at || item.updated_at || '';
              const fileTime = rawDate ? new Date(rawDate).getTime() : 0;

              if (isLegacyHtml || (cutoff > 0 && fileTime > 0 && fileTime < cutoff)) {
                pathsToDelete.push(`${currentPrefix}/${item.name}`);
                freedBytes += Number(item.metadata?.size || (item as any).size || 0);
              }
            }
          }
        }
      }

      if (pathsToDelete.length > 0) {
        const { error } = await client.from(bucketName).remove(pathsToDelete);
        if (error) {
          return { success: false, deletedCount: 0, freedBytes: 0, message: error.message };
        }
      }

      const freedMb = (freedBytes / (1024 * 1024)).toFixed(2);
      return {
        success: true,
        deletedCount: pathsToDelete.length,
        freedBytes,
        message: `Successfully cleaned up ${pathsToDelete.length} invoice cloud copy/copies (${freedMb} MB freed). Local invoice records and PDFs remain intact.`,
      };
    } catch (err: any) {
      return { success: false, deletedCount: 0, freedBytes: 0, message: err.message };
    }
  }
}
