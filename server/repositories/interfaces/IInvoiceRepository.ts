export interface IInvoiceLineItemEntity {
  itemId?: string;
  name: string;
  itemType?: 'Goods' | 'Service';
  hsnCode?: string;
  sacCode?: string;
  uqc?: string;
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

export interface IInvoiceEntity {
  _id: string;
  invoiceNumber: string;
  voucherId?: string;
  date: Date;
  dueDate?: Date;
  customerId?: string;
  customerName: string;
  customerGstin?: string;
  customerPhone?: string;
  customerEmail?: string;
  billingAddress: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    stateCode?: string;
    pincode?: string;
  };
  shippingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    stateCode?: string;
    pincode?: string;
  };
  placeOfSupply: string;
  isInterState: boolean;
  reverseCharge?: boolean;
  items: IInvoiceLineItemEntity[];
  taxSummary: {
    gstRate: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    totalTax: number;
  }[];
  subTotal: number;
  totalDiscount: number;
  totalTaxable: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  roundOff: number;
  grandTotal: number;
  amountInWords?: string;
  templateUsed: 'POS-58' | 'POS-80' | 'A5' | 'A4';
  paymentMode: 'Cash' | 'Bank' | 'UPI' | 'Credit' | 'Mixed';
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial';
  paidAmount: number;
  balanceAmount: number;
  pdfPath?: string;
  cloudStoragePath?: string;
  signedUrl?: string;
  signedUrlExpiresAt?: Date;
  cloudUploadStatus?: 'uploaded' | 'pending' | 'failed' | 'not_configured';
  cloudUploadError?: string;
  notes?: string;
  terms?: string;
  bankDetailsSnapshot?: any;
  companyId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPartyGstSummary {
  partyId: string;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  totalTax: number;
  totalRoundOff: number;
  grandTotal: number;
  invoiceCount: number;
  invoices: IInvoiceEntity[];
}

export interface IInvoiceRepository {
  findByCompany(companyId: string, filter?: any): Promise<IInvoiceEntity[]>;
  findById(id: string): Promise<IInvoiceEntity | null>;
  findByNumber(companyId: string, invoiceNumber: string): Promise<IInvoiceEntity | null>;
  findByParty(companyId: string, partyId: string, filter?: any): Promise<IInvoiceEntity[]>;
  getPartyGstSummary(
    companyId: string,
    partyId: string,
    filter?: { startDate?: Date; endDate?: Date }
  ): Promise<IPartyGstSummary>;
  create(data: Partial<IInvoiceEntity>): Promise<IInvoiceEntity>;
  update(id: string, data: Partial<IInvoiceEntity>): Promise<IInvoiceEntity | null>;
  delete(id: string): Promise<boolean>;
  countByCompany(companyId: string): Promise<number>;
}

