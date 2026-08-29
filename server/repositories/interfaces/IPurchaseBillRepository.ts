export interface IPurchaseBillLineItemEntity {
  itemId?: string;
  name: string;
  itemType?: 'Goods' | 'Service';
  hsnCode?: string;
  sacCode?: string;
  uqc?: string;
  quantity: number;
  purchaseRate: number;
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

export interface IPurchaseBillEntity {
  _id: string;
  billNumber: string;
  supplierInvoiceNumber: string;
  supplierInvoiceDate: Date;
  date: Date;
  dueDate?: Date;
  supplierId?: string;
  supplierName: string;
  supplierGstin?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierAddress?: {
    line1?: string;
    city?: string;
    state?: string;
    stateCode?: string;
    pincode?: string;
  };
  placeOfSupply: string;
  isInterState: boolean;
  reverseCharge?: boolean;
  items: IPurchaseBillLineItemEntity[];
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
  voucherId?: string;
  paymentMode: 'Cash' | 'Bank' | 'Credit' | 'UPI';
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial';
  paidAmount: number;
  balanceAmount: number;
  bankCharges?: number;
  notes?: string;
  financialYear: string;
  companyId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPartyPurchaseSummary {
  supplierId: string;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  totalTax: number;
  totalRoundOff: number;
  grandTotal: number;
  billCount: number;
  purchases: IPurchaseBillEntity[];
}

export interface IPurchaseBillRepository {
  findByCompany(companyId: string, filter?: any): Promise<IPurchaseBillEntity[]>;
  findById(id: string): Promise<IPurchaseBillEntity | null>;
  findByNumber(companyId: string, billNumber: string): Promise<IPurchaseBillEntity | null>;
  findByParty(companyId: string, supplierId: string, filter?: any): Promise<IPurchaseBillEntity[]>;
  getPartyPurchaseSummary(
    companyId: string,
    supplierId: string,
    filter?: { startDate?: Date; endDate?: Date }
  ): Promise<IPartyPurchaseSummary>;
  create(data: Partial<IPurchaseBillEntity>): Promise<IPurchaseBillEntity>;
  update(id: string, data: Partial<IPurchaseBillEntity>): Promise<IPurchaseBillEntity | null>;
  delete(id: string): Promise<boolean>;
  countByCompany(companyId: string): Promise<number>;
}

