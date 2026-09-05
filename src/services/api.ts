import axios from 'axios';
import {
  Company,
  Group,
  Ledger,
  Item,
  Party,
  Voucher,
  Invoice,
  PurchaseBill,
  SettingsType,
  DbStatus,
} from '../types';

const getApiBase = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    const clean = envUrl.trim().replace(/\/+$/, '');
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }
  return 'http://127.0.0.1:4545/api';
};

const API_BASE = getApiBase();

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-retry interceptor for cold startup & transient network reconnects
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config) {
      return Promise.reject(error);
    }

    const isNetworkError =
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNABORTED' ||
      error.message?.toLowerCase().includes('network error');

    if (isNetworkError) {
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount < 3) {
        config.__retryCount += 1;
        const delay = Math.min(config.__retryCount * 500, 2000);
        console.warn(`[API] Retrying request in ${delay}ms (attempt ${config.__retryCount}/3)...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return client(config);
      }
      // Provide a clear diagnostic error message rather than generic 'Network Error'
      error.message = 'Backend API server on port 4545 is unreachable. Please verify local service is running or check server.log.';
    }

    return Promise.reject(error);
  }
);

export const api = {
  // Companies
  getCompanies: async (): Promise<Company[]> => {
    const res = await client.get('/companies');
    return res.data.data;
  },
  getCompany: async (id: string): Promise<Company> => {
    const res = await client.get(`/companies/${id}`);
    return res.data.data;
  },
  createCompany: async (company: Partial<Company>): Promise<Company> => {
    const res = await client.post('/companies', company);
    return res.data.data;
  },
  updateCompany: async (id: string, company: Partial<Company>): Promise<Company> => {
    const res = await client.put(`/companies/${id}`, company);
    return res.data.data;
  },
  uploadLogo: async (id: string, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('logo', file);
    const res = await client.post(`/companies/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  lockFY: async (id: string, financialYear: string, lock: boolean): Promise<Company> => {
    const res = await client.post(`/companies/${id}/lock-fy`, { financialYear, lock });
    return res.data.data;
  },
  deleteCompany: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await client.delete(`/companies/${id}`);
    return res.data;
  },
  getNextInvoiceNumber: async (companyId: string): Promise<{
    nextSeq: number;
    formattedInvoiceNumber: string;
    prefix: string;
    suffix: string;
  }> => {
    const res = await client.get(`/companies/${companyId}/next-invoice-number`);
    return res.data;
  },

  // Ledgers & Groups
  getLedgers: async (companyId: string, search?: string, groupName?: string): Promise<Ledger[]> => {
    const res = await client.get('/ledgers', { params: { companyId, search, groupName } });
    return res.data.data;
  },
  getGroups: async (companyId: string): Promise<Group[]> => {
    const res = await client.get('/ledgers/groups', { params: { companyId } });
    return res.data.data;
  },
  createLedger: async (ledger: Partial<Ledger>): Promise<Ledger> => {
    const res = await client.post('/ledgers', ledger);
    return res.data.data;
  },
  updateLedger: async (id: string, ledger: Partial<Ledger>): Promise<Ledger> => {
    const res = await client.put(`/ledgers/${id}`, ledger);
    return res.data.data;
  },
  deleteLedger: async (id: string): Promise<void> => {
    await client.delete(`/ledgers/${id}`);
  },

  // Items
  getItems: async (companyId: string, search?: string, category?: string): Promise<Item[]> => {
    const res = await client.get('/items', { params: { companyId, search, category } });
    return res.data.data;
  },
  createItem: async (item: Partial<Item>): Promise<Item> => {
    const res = await client.post('/items', item);
    return res.data.data;
  },
  updateItem: async (id: string, item: Partial<Item>): Promise<Item> => {
    const res = await client.put(`/items/${id}`, item);
    return res.data.data;
  },
  deleteItem: async (id: string): Promise<void> => {
    await client.delete(`/items/${id}`);
  },

  // Parties
  getParties: async (companyId: string, type?: string, search?: string): Promise<Party[]> => {
    const res = await client.get('/parties', { params: { companyId, type, search } });
    return res.data.data;
  },
  getPartyById: async (id: string): Promise<Party> => {
    const res = await client.get(`/parties/${id}`);
    return res.data.data;
  },
  getPartyInvoices: async (partyId: string, companyId: string): Promise<Invoice[]> => {
    const res = await client.get(`/parties/${partyId}/invoices`, { params: { companyId } });
    return res.data.data;
  },
  getPartyPurchases: async (partyId: string, companyId: string): Promise<PurchaseBill[]> => {
    const res = await client.get(`/parties/${partyId}/purchases`, { params: { companyId } });
    return res.data.data;
  },
  getPartyGstSummary: async (
    partyId: string,
    companyId: string,
    range?: string,
    fromDate?: string,
    toDate?: string
  ): Promise<any> => {
    const res = await client.get(`/parties/${partyId}/gst-summary`, {
      params: { companyId, range, fromDate, toDate },
    });
    return res.data.data;
  },
  getPartyPurchaseSummary: async (
    partyId: string,
    companyId: string,
    range?: string,
    fromDate?: string,
    toDate?: string
  ): Promise<any> => {
    const res = await client.get(`/parties/${partyId}/purchase-summary`, {
      params: { companyId, range, fromDate, toDate },
    });
    return res.data.data;
  },
  createParty: async (party: Partial<Party>): Promise<Party> => {
    const res = await client.post('/parties', party);
    return res.data.data;
  },
  updateParty: async (id: string, party: Partial<Party>): Promise<Party> => {
    const res = await client.put(`/parties/${id}`, party);
    return res.data.data;
  },
  deleteParty: async (id: string): Promise<void> => {
    await client.delete(`/parties/${id}`);
  },


  // Vouchers
  getVouchers: async (
    companyId: string,
    voucherType?: string,
    fromDate?: string,
    toDate?: string,
    search?: string
  ): Promise<Voucher[]> => {
    const res = await client.get('/vouchers', {
      params: { companyId, voucherType, fromDate, toDate, search },
    });
    return res.data.data;
  },
  createVoucher: async (voucher: Partial<Voucher>): Promise<Voucher> => {
    const res = await client.post('/vouchers', voucher);
    return res.data.data;
  },
  updateVoucher: async (id: string, voucher: Partial<Voucher>): Promise<Voucher> => {
    const res = await client.put(`/vouchers/${id}`, voucher);
    return res.data.data;
  },
  cancelVoucher: async (id: string, reason?: string): Promise<Voucher> => {
    const res = await client.post(`/vouchers/${id}/cancel`, { reason });
    return res.data.data;
  },
  deleteVoucher: async (id: string): Promise<void> => {
    await client.delete(`/vouchers/${id}`);
  },

  // Invoices & Billing
  getInvoices: async (
    companyId: string,
    search?: string,
    status?: string,
    fromDate?: string,
    toDate?: string
  ): Promise<Invoice[]> => {
    const res = await client.get('/invoices', {
      params: { companyId, search, status, fromDate, toDate },
    });
    return res.data.data;
  },
  getInvoiceById: async (id: string): Promise<Invoice> => {
    const res = await client.get(`/invoices/${id}`);
    return res.data.data;
  },
  createInvoice: async (invoice: any): Promise<{ success: boolean; data: Invoice; previewUrl: string }> => {
    const res = await client.post('/invoices', invoice);
    return res.data;
  },
  updateInvoice: async (id: string, invoice: any): Promise<{ success: boolean; data: Invoice; previewUrl: string }> => {
    const res = await client.put(`/invoices/${id}`, invoice);
    return res.data;
  },
  deleteInvoice: async (id: string): Promise<void> => {
    await client.delete(`/invoices/${id}`);
  },

  // Purchase Bills & Inward Supplies
  getPurchases: async (
    companyId: string,
    search?: string,
    supplierId?: string,
    fromDate?: string,
    toDate?: string
  ): Promise<PurchaseBill[]> => {
    const res = await client.get('/purchases', {
      params: { companyId, search, supplierId, fromDate, toDate },
    });
    return res.data.data;
  },
  getPurchaseById: async (id: string): Promise<PurchaseBill> => {
    const res = await client.get(`/purchases/${id}`);
    return res.data.data;
  },
  createPurchase: async (purchase: any): Promise<{ success: boolean; data: PurchaseBill }> => {
    const res = await client.post('/purchases', purchase);
    return res.data;
  },
  deletePurchase: async (id: string): Promise<void> => {
    await client.delete(`/purchases/${id}`);
  },

  // Reports
  getDayBook: async (companyId: string, fromDate?: string, toDate?: string): Promise<any> => {
    const res = await client.get('/reports/daybook', { params: { companyId, fromDate, toDate } });
    return res.data.data;
  },
  getLedgerStatement: async (
    companyId: string,
    ledgerId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<any> => {
    const res = await client.get('/reports/ledger-statement', {
      params: { companyId, ledgerId, fromDate, toDate },
    });
    return res.data.data;
  },
  getTrialBalance: async (companyId: string, asOfDate?: string): Promise<any> => {
    const res = await client.get('/reports/trial-balance', { params: { companyId, asOfDate } });
    return res.data.data;
  },
  getProfitAndLoss: async (companyId: string, fromDate?: string, toDate?: string): Promise<any> => {
    const res = await client.get('/reports/profit-loss', { params: { companyId, fromDate, toDate } });
    return res.data.data;
  },
  getBalanceSheet: async (companyId: string, asOfDate?: string): Promise<any> => {
    const res = await client.get('/reports/balance-sheet', { params: { companyId, asOfDate } });
    return res.data.data;
  },
  getCashBankBook: async (companyId: string, fromDate?: string, toDate?: string): Promise<any> => {
    const res = await client.get('/reports/cash-bank-book', { params: { companyId, fromDate, toDate } });
    return res.data.data;
  },
  getStockSummary: async (companyId: string): Promise<any> => {
    const res = await client.get('/reports/stock-summary', { params: { companyId } });
    return res.data.data;
  },

  // GST
  getGSTR1: async (companyId: string, period: string): Promise<any> => {
    const res = await client.get('/gst/gstr1', { params: { companyId, period } });
    return res.data.data;
  },
  getGSTR3B: async (companyId: string, period: string): Promise<any> => {
    const res = await client.get('/gst/gstr3b', { params: { companyId, period } });
    return res.data.data;
  },
  reconcileGSTR2B: async (companyId: string, period: string, records: any): Promise<any> => {
    const res = await client.post('/gst/gstr2b-recon', { companyId, period, recordsJson: records });
    return res.data.data;
  },
  directEFileGSTR1: async (companyId: string, period: string): Promise<any> => {
    const res = await client.post('/gst/gstr1/direct-efile', { companyId, period });
    return res.data;
  },

  exportReportExcel: async (title: string, headers: string[], rows: any[][]) => {
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { success: true };
  },

  // Delivery
  sendEmail: async (invoiceId: string, companyId?: string, recipientEmail?: string, message?: string) => {
    const res = await client.post('/delivery/email', { invoiceId, companyId, recipientEmail, message });
    return res.data;
  },
  sendWhatsApp: async (
    invoiceId: string,
    companyId?: string,
    recipientPhone?: string,
    message?: string,
    forceFallback?: boolean
  ) => {
    const res = await client.post('/delivery/whatsapp', {
      invoiceId,
      companyId,
      recipientPhone,
      message,
      forceFallback,
    });
    return res.data;
  },

  // Settings & DB
  getSettings: async (companyId?: string): Promise<{ data: SettingsType; dbStatus: DbStatus }> => {
    const res = await client.get('/settings', { params: { companyId } });
    return res.data;
  },
  updateSettings: async (settings: Partial<SettingsType>): Promise<SettingsType> => {
    const res = await client.put('/settings', settings);
    return res.data.data;
  },
  testSMTP: async (config: any) => {
    const res = await client.post('/settings/test-smtp', config);
    return res.data;
  },
  testDB: async (param: string | { provider?: 'mongodb' | 'postgres'; uri?: string; mongoUri?: string; postgresUri?: string }) => {
    try {
      let payload: any = {};
      if (typeof param === 'string') {
        const clean = param.trim();
        const isPg = clean.startsWith('postgresql://') || clean.startsWith('postgres://');
        payload = {
          provider: isPg ? 'postgres' : 'mongodb',
          uri: clean,
          postgresUri: isPg ? clean : undefined,
          mongoUri: !isPg ? clean : undefined,
        };
      } else {
        const rawUri = (param.uri || (param.provider === 'postgres' ? param.postgresUri : param.mongoUri) || '').trim();
        const isPg = param.provider === 'postgres' || rawUri.startsWith('postgresql://') || rawUri.startsWith('postgres://');
        payload = {
          ...param,
          provider: isPg ? 'postgres' : 'mongodb',
          uri: rawUri,
          postgresUri: isPg ? rawUri : param.postgresUri,
          mongoUri: !isPg ? rawUri : param.mongoUri,
        };
      }
      const res = await client.post('/settings/test-db', payload);
      return res.data;
    } catch (err: any) {
      if (err.response?.data) {
        return err.response.data;
      }
      return {
        success: false,
        message: err.message || 'Database connection request failed',
        status: { status: 'disconnected', error: err.message },
      };
    }
  },
  migrateDB: async (targetProvider: 'mongodb' | 'postgres', targetUri: string) => {
    const res = await client.post('/settings/migrate-db', { targetProvider, targetUri });
    return res.data;
  },
  importSnapshot: async (bundle: any) => {
    const res = await client.post('/settings/import-snapshot', bundle);
    return res.data;
  },
  loadSampleData: async () => {
    const res = await client.post('/settings/load-sample-data');
    return res.data;
  },
  cleanSampleData: async () => {
    const res = await client.post('/settings/clean-sample-data');
    return res.data;
  },

  // Cloud Storage (Supabase Storage)
  testStorage: async (storageConfig?: any, companyId?: string) => {
    const res = await client.post('/storage/test', { storageConfig, companyId });
    return res.data;
  },
  getStorageUsage: async (companyId?: string) => {
    const res = await client.get('/storage/usage', { params: { companyId } });
    return res.data.data;
  },
  uploadInvoiceToCloud: async (invoiceId: string, template?: string) => {
    const res = await client.post(`/invoices/${invoiceId}/cloud-upload`, { template });
    return res.data;
  },
  getInvoiceSignedUrl: async (invoiceId: string) => {
    const res = await client.post(`/storage/signed-url/${invoiceId}`);
    return res.data;
  },
  runStorageCleanup: async (companyId?: string, days?: number) => {
    const res = await client.post('/storage/cleanup', { companyId, days });
    return res.data;
  },
  cleanupLegacyStorage: async (companyId?: string) => {
    const res = await client.post('/storage/cleanup-legacy', { companyId });
    return res.data;
  },

  // Opt-in Cloud Storage PDF exports
  exportBulkInvoicesCloud: async (partyId: string, companyId: string, range?: string, fromDate?: string, toDate?: string) => {
    const res = await client.get(`/invoices/party/${partyId}/bulk-pdf`, {
      params: { companyId, range, fromDate, toDate, uploadToCloud: 'true' },
    });
    return res.data;
  },
  exportBulkPurchasesCloud: async (partyId: string, companyId: string, range?: string, fromDate?: string, toDate?: string) => {
    const res = await client.get(`/purchases/party/${partyId}/bulk-pdf`, {
      params: { companyId, range, fromDate, toDate, uploadToCloud: 'true' },
    });
    return res.data;
  },
  exportPartyGstReportCloud: async (partyId: string, companyId: string, range?: string, fromDate?: string, toDate?: string) => {
    const res = await client.get(`/parties/${partyId}/gst-summary/pdf`, {
      params: { companyId, range, fromDate, toDate, uploadToCloud: 'true' },
    });
    return res.data;
  },
  exportPartyPurchaseReportCloud: async (partyId: string, companyId: string, range?: string, fromDate?: string, toDate?: string) => {
    const res = await client.get(`/parties/${partyId}/purchase-summary/pdf`, {
      params: { companyId, range, fromDate, toDate, uploadToCloud: 'true' },
    });
    return res.data;
  },


  // URLs for direct downloads & PDFs
  getPartyBulkInvoicesPdfUrl: (partyId: string, companyId: string, range?: string, fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams({ companyId });
    if (range) params.append('range', range);
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    return `${API_BASE}/invoices/party/${partyId}/bulk-pdf?${params.toString()}`;
  },
  getPartyBulkInvoicesPreviewHtmlUrl: (partyId: string, companyId: string, range?: string, fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams({ companyId });
    if (range) params.append('range', range);
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    return `${API_BASE}/invoices/party/${partyId}/bulk-preview-html?${params.toString()}`;
  },
  getPartyBulkPurchasesPdfUrl: (partyId: string, companyId: string, range?: string, fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams({ companyId });
    if (range) params.append('range', range);
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    return `${API_BASE}/purchases/party/${partyId}/bulk-pdf?${params.toString()}`;
  },
  getPartyBulkPurchasesPreviewHtmlUrl: (partyId: string, companyId: string, range?: string, fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams({ companyId });
    if (range) params.append('range', range);
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    return `${API_BASE}/purchases/party/${partyId}/bulk-preview-html?${params.toString()}`;
  },
  getPartyGstReportPdfUrl: (partyId: string, companyId: string, range?: string, fromDate?: string, toDate?: string) => {
    const params = new URLSearchParams({ companyId });
    if (range) params.append('range', range);
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    return `${API_BASE}/parties/${partyId}/gst-summary/pdf?${params.toString()}`;
  },
  getInvoicePdfUrl: (invoiceId: string, template?: string) =>
    `${API_BASE}/invoices/${invoiceId}/pdf?template=${template || 'A4'}`,
  getPartyPurchaseReportPdfUrl: (partyId: string, companyId: string, range?: string, fromDate?: string, toDate?: string) => {

    const params = new URLSearchParams({ companyId });
    if (range) params.append('range', range);
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    return `${API_BASE}/parties/${partyId}/purchase-summary/pdf?${params.toString()}`;
  },
  downloadPdfFromUrl: async (url: string, filename: string): Promise<void> => {
    const cleanUrl = url.startsWith(API_BASE) ? url.substring(API_BASE.length) : url;
    const res = await client.get(cleanUrl, { responseType: 'blob' });
    const contentType = (res.headers && res.headers['content-type']) || (res.data && res.data.type) || '';

    // Check if the response is actually HTML markup rather than a binary PDF
    let isHtml = typeof contentType === 'string' && contentType.includes('text/html');
    let rawText = '';

    if (isHtml) {
      rawText = await res.data.text();
    } else {
      // Inspect the first bytes for standard PDF magic header '%PDF-'
      const slice = res.data.slice(0, 10);
      const textHeader = await slice.text();
      if (textHeader.startsWith('<!') || textHeader.startsWith('<h') || !textHeader.startsWith('%PDF-')) {
        isHtml = true;
        rawText = await res.data.text();
      }
    }

    if (!isHtml) {
      // Genuine binary PDF stream from server
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      return;
    }

    // Response is HTML (e.g. Render cloud host where headless Chrome is unavailable)
    // Convert the HTML into a genuine, valid PDF binary using a same-document sandbox container
    const getHtml2Pdf = async (): Promise<any> => {
      if (typeof window === 'undefined') return null;
      if ((window as any).html2pdf) return (window as any).html2pdf;
      return new Promise((resolve, reject) => {
        const existing = document.querySelector('script[src*="html2pdf"]') as HTMLScriptElement | null;
        if (existing) {
          if ((window as any).html2pdf) return resolve((window as any).html2pdf);
          existing.addEventListener('load', () => resolve((window as any).html2pdf));
          existing.addEventListener('error', (e) => reject(new Error('Failed to load html2pdf script: ' + e)));
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.async = true;
        script.onload = () => resolve((window as any).html2pdf);
        script.onerror = (e) => reject(new Error('Failed to load html2pdf script: ' + e));
        document.head.appendChild(script);
      });
    };

    const html2pdfLib = await getHtml2Pdf();
    if (!html2pdfLib) {
      throw new Error('PDF conversion engine could not be initialized.');
    }

    // Determine format from rawText
    const isA5 = rawText.includes('size: A5') || rawText.includes('A5 landscape') || rawText.includes('A5 Format');
    const targetWidth = isA5 ? '559px' : '794px';

    const parser = new DOMParser();
    const doc = parser.parseFromString(rawText, 'text/html');

    // Remove preview action toolbar and no-print elements
    const toolbar = doc.getElementById('preview-action-toolbar');
    if (toolbar) toolbar.remove();
    doc.querySelectorAll('.no-print').forEach((el) => el.remove());

    // Extract any <style> tags from head or body
    let stylesHtml = '';
    doc.querySelectorAll('style').forEach((st) => {
      stylesHtml += st.outerHTML;
    });

    const bodyHtml = doc.body ? doc.body.innerHTML : rawText;

    // Create a sandbox element in the main document with opacity 0.01 (within viewport)
    // Same-document hosting prevents cross-frame and CORS DOM access errors
    const sandbox = document.createElement('div');
    sandbox.id = 'pdf-render-sandbox';
    sandbox.style.position = 'fixed';
    sandbox.style.top = '0';
    sandbox.style.left = '0';
    sandbox.style.width = targetWidth;
    sandbox.style.opacity = '0.01';
    sandbox.style.pointerEvents = 'none';
    sandbox.style.zIndex = '-99999';
    sandbox.style.backgroundColor = '#ffffff';
    sandbox.innerHTML = stylesHtml + bodyHtml;
    document.body.appendChild(sandbox);

    try {
      // Style all pages and cards inside sandbox to 100% of targetWidth
      const printableDoc = sandbox.querySelector('#printable-document') as HTMLElement | null;
      if (printableDoc) {
        printableDoc.style.padding = '0px';
        printableDoc.style.margin = '0px';
        printableDoc.style.width = targetWidth;
        printableDoc.style.maxWidth = targetWidth;
        printableDoc.style.boxSizing = 'border-box';
      }

      const allCards = sandbox.querySelectorAll('.invoice-card, .report-card');
      allCards.forEach((card) => {
        const el = card as HTMLElement;
        el.style.margin = '0px';
        el.style.boxShadow = 'none';
        el.style.borderRadius = '0px';
        el.style.width = targetWidth;
        el.style.maxWidth = targetWidth;
        el.style.boxSizing = 'border-box';
      });

      const pages = sandbox.querySelectorAll('.invoice-page');
      pages.forEach((p) => {
        const el = p as HTMLElement;
        el.style.margin = '0px';
        el.style.marginBottom = '0px';
        el.style.boxShadow = 'none';
        el.style.padding = '0px';
        el.style.width = targetWidth;
        el.style.maxWidth = targetWidth;
        el.style.boxSizing = 'border-box';
      });

      const targetEl = printableDoc || (allCards.length > 0 ? (allCards[0] as HTMLElement) : sandbox);

      // Wait for fonts and images to load
      if ((document as any).fonts && (document as any).fonts.ready) {
        await (document as any).fonts.ready;
      }
      const images = Array.from(sandbox.querySelectorAll('img'));
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((res) => {
            img.onload = () => res(null);
            img.onerror = () => res(null);
            setTimeout(() => res(null), 500);
          });
        })
      );
      await new Promise((r) => setTimeout(r, 150));

      const opt = {
        margin: [3, 3, 3, 3],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        enableLinks: false,
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: {
          unit: 'mm',
          format: isA5 ? 'a5' : 'a4',
          orientation: isA5 ? 'landscape' : 'portrait',
          compress: true,
        },
        pagebreak: {
          mode: ['css', 'legacy'],
          avoid: ['.avoid-break', 'tr', '.report-card'],
        },
      };

      const pdfBlob = await html2pdfLib().set(opt).from(targetEl).outputPdf('blob');

      // Trigger download of real PDF blob
      const downloadBlobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = downloadBlobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadBlobUrl);
    } catch (err: any) {
      console.error('Client html2pdf conversion error:', err);
      throw new Error(`Failed to generate PDF: ${err.message || err}`);
    } finally {
      sandbox.remove();
    }
  },
  getExportSnapshotUrl: (companyId?: string) =>
    `${API_BASE}/settings/export-snapshot${companyId ? '?companyId=' + companyId : ''}`,
  getGstr1ExcelUrl: (companyId: string, period: string) =>
    `${API_BASE}/gst/gstr1/export-excel?companyId=${companyId}&period=${period}`,
  getGstr1CsvZipUrl: (companyId: string, period: string) =>
    `${API_BASE}/gst/gstr1/export-csv-zip?companyId=${companyId}&period=${period}`,
  getGstr1JsonUrl: (companyId: string, period: string) =>
    `${API_BASE}/gst/gstr1/export-json?companyId=${companyId}&period=${period}`,
  getBackupDownloadUrl: (companyId?: string) =>
    `${API_BASE}/backup/download${companyId ? '?companyId=' + companyId : ''}`,

  // HTML Preview URLs & fetchers
  getInvoicePreviewHtmlUrl: (invoiceId: string, template?: string, copyTitle?: string) => {
    const params = new URLSearchParams();
    if (template) params.append('template', template);
    if (copyTitle) params.append('copy', copyTitle);
    params.append('t', String(Date.now()));
    return `${API_BASE}/invoices/${invoiceId}/preview-html?${params.toString()}`;
  },
  getPurchasePreviewHtmlUrl: (purchaseId: string) => {
    return `${API_BASE}/purchases/${purchaseId}/preview-html?t=${Date.now()}`;
  },
  getPreviewHtmlContent: async (url: string): Promise<string> => {
    try {
      const endpoint = url.startsWith(API_BASE) ? url.substring(API_BASE.length) : url;
      const res = await client.get(endpoint, { responseType: 'text' });
      return res.data;
    } catch (e: any) {
      console.error('Error fetching preview HTML content:', e);
      return '';
    }
  },
};

export { API_BASE, getApiBase };

