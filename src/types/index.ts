export interface Company {
  _id: string;
  legalName: string;
  tradeName: string;
  gstin: string;
  pan: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    stateCode: string;
    pincode: string;
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  bankDetails: {
    bankName: string;
    accountNo: string;
    ifsc: string;
    branch: string;
    upiId?: string;
  };
  logoPath?: string;
  financialYearStart: number;
  currentFY: string;
  invoicePrefix: string;
  invoiceNumberSeq: number;
  invoiceSuffix?: string;
  defaultTemplate: 'POS-58' | 'POS-80' | 'A5' | 'A4';
  termsAndConditions?: string;
  notes?: string;
  lockedFYs?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Group {
  _id: string;
  name: string;
  parentName?: string | null;
  nature: 'Assets' | 'Liabilities' | 'Income' | 'Expenses' | 'Primary';
  isPrimary: boolean;
  companyId: string;
}

export interface Ledger {
  _id: string;
  name: string;
  groupName: string;
  nature: 'Assets' | 'Liabilities' | 'Income' | 'Expenses';
  openingBalance: number;
  openingType: 'Dr' | 'Cr';
  currentBalance: number;
  gstin?: string;
  pan?: string;
  address?: string;
  state?: string;
  stateCode?: string;
  phone?: string;
  email?: string;
  isSystem?: boolean;
  companyId: string;
}

export interface Item {
  _id: string;
  name: string;
  itemType?: 'Goods' | 'Service';
  sku?: string;
  barcode?: string;
  description?: string;
  hsnCode: string;
  sacCode?: string;
  uqc: string;
  purchaseRate: number;
  saleRate: number;
  gstRate: number;
  cessRate?: number;
  openingStock: number;
  currentStock: number;
  reorderLevel: number;
  category?: string;
  unit: string;
  companyId: string;
}

export interface PurchaseBill {
  _id: string;
  billNumber: string;
  supplierInvoiceNumber: string;
  supplierInvoiceDate: string;
  date: string;
  supplierId?: string;
  supplierName: string;
  supplierGstin?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    stateCode?: string;
    pincode?: string;
  };
  placeOfSupply: string;
  isInterState: boolean;
  reverseCharge: boolean;
  items: Array<{
    itemId?: string;
    name: string;
    itemType?: 'Goods' | 'Service';
    hsnCode: string;
    uqc: string;
    quantity: number;
    purchaseRate: number;
    discountPercent?: number;
    discountAmount?: number;
    taxableValue: number;
    gstRate: number;
    cgstAmount?: number;
    sgstAmount?: number;
    igstAmount?: number;
    total: number;
  }>;
  taxSummary: ITaxSummary[];
  subTotal: number;
  totalDiscount: number;
  totalTaxable: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;
  paymentMode: 'Cash' | 'Credit' | 'Bank' | 'UPI';
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial' | 'Cancelled';
  paidAmount: number;

  balanceAmount: number;
  isDraft?: boolean;
  notes?: string;
  voucherId?: string;
  companyId: string;
  financialYear: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Party {
  _id: string;
  name: string;
  type: 'Customer' | 'Supplier' | 'Both';
  ledgerId?: string;
  gstin?: string;
  pan?: string;
  phone?: string;
  email?: string;
  billingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    stateCode: string;
    pincode: string;
  };
  placeOfSupply: string;
  openingBalance: number;
  openingType: 'Dr' | 'Cr';
  currentBalance: number;
  creditLimit: number;
  creditDays: number;
  notes?: string;
  companyId: string;
}

export type VoucherType =
  | 'Sales'
  | 'Purchase'
  | 'Payment'
  | 'Receipt'
  | 'Contra'
  | 'Journal'
  | 'CreditNote'
  | 'DebitNote';

export interface TaxSummary {
  gstRate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
}
export type ITaxSummary = TaxSummary;

export interface VoucherEntry {
  ledgerId: string;
  ledgerName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface VoucherItem {
  itemId?: string;
  name: string;
  hsnCode: string;
  uqc: string;
  quantity: number;
  rate: number;
  discountPercent?: number;
  discountAmount?: number;
  taxableValue: number;
  gstRate: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  cessAmount?: number;
  total: number;
}

export interface Voucher {
  _id: string;
  voucherNumber: string;
  voucherType: VoucherType;
  date: string;
  effectiveDate?: string;
  referenceNo?: string;
  narration?: string;
  partyId?: string;
  partyName?: string;
  partyGstin?: string;
  placeOfSupply?: string;
  isInterState: boolean;
  status?: string;
  entries: VoucherEntry[];
  items?: VoucherItem[];
  subTotal: number;
  totalDiscount: number;
  totalTaxable: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  roundOff: number;
  totalAmount: number;
  financialYear: string;
  companyId: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  voucherId: string;
  date: string;
  dueDate?: string;
  customerId?: string;
  customerName: string;
  customerGstin?: string;
  customerPhone?: string;
  customerEmail?: string;
  billingAddress: {
    line1?: string;
    city?: string;
    state: string;
    stateCode: string;
    pincode?: string;
  };
  placeOfSupply: string;
  isInterState: boolean;
  items: VoucherItem[];
  taxSummary: Array<{
    gstRate: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    totalTax: number;
  }>;
  subTotal: number;
  totalDiscount: number;
  totalTaxable: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;
  templateUsed: 'POS-58' | 'POS-80' | 'A5' | 'A4';
  pdfPath?: string;
  cloudStoragePath?: string;
  signedUrl?: string;
  signedUrlExpiresAt?: string;
  cloudUploadStatus?: 'uploaded' | 'pending' | 'failed' | 'not_configured';
  cloudUploadError?: string;
  paymentMode: 'Cash' | 'Credit' | 'Bank' | 'UPI' | 'Split';
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial' | 'Cancelled';
  paidAmount: number;

  balanceAmount: number;
  notes?: string;
  terms?: string;
  companyId: string;
  deliveries?: Array<{
    channel: 'email' | 'whatsapp';
    sentAt: string;
    status: string;
    recipient: string;
    messageId?: string;
    error?: string;
  }>;
}

export interface SettingsType {
  _id?: string;
  companyId?: string;
  databaseProvider?: 'mongodb' | 'postgres';
  mongoUri: string;
  postgresUri?: string;
  smtp: {
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromEmail: string;
    fromName: string;
  };
  whatsapp: {
    mode: 'fallback' | 'cloud_api';
    accessToken?: string;
    phoneNumberId?: string;
    businessAccountId?: string;
    defaultGreetingTemplate: string;
  };
  gsp: {
    provider: string;
    clientId?: string;
    clientSecret?: string;
    username?: string;
    environment: 'sandbox' | 'production';
    enabled: boolean;
  };
  storage?: {
    enabled: boolean;
    supabaseUrl: string;
    serviceRoleKey: string;
    bucketName: string;
    signedUrlExpiryDays: number;
    autoCleanupDays: number;
    useShortLinks?: boolean;
  };
  printers: {
    posPrinterName?: string;
    regularPrinterName?: string;
    paperWidthMm: number;
  };
}

export interface StorageUsageInfo {
  configured: boolean;
  bucketName: string;
  totalBytes: number;
  totalFiles: number;
  planLimitBytes: number;
  percentUsed: number;
  warning: boolean;
  error?: string;
}

export interface DbStatus {
  provider?: 'mongodb' | 'postgres';
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  uri: string;
  error: string | null;
  host: string;
  name: string;
  readyState?: number;
}

export interface UpdateStatusData {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  releaseDate?: string;
  releaseNotes?: string | any[];
  error?: string;
  percent?: number;
  bytesPerSecond?: number;
  transferred?: number;
  total?: number;
}

export interface ElectronAPI {
  openExternal: (url: string) => Promise<boolean>;
  showItemInFolder: (fullPath: string) => Promise<boolean>;
  getPrinters: () => Promise<any[]>;
  printHtml: (htmlContent: string, printerName?: string) => Promise<any>;
  exportPdf: (htmlContent: string, defaultFilename: string) => Promise<any>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  getAppVersion: () => Promise<string>;
  checkForUpdates: () => Promise<{ success?: boolean; dev?: boolean; updateInfo?: any; error?: string }>;
  downloadUpdate: () => Promise<{ success?: boolean; error?: string }>;
  quitAndInstall: () => Promise<void>;
  onUpdateStatus: (callback: (data: UpdateStatusData) => void) => () => void;
  isElectron?: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

