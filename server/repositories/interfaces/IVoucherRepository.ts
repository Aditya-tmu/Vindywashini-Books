export interface IVoucherEntryEntity {
  ledgerId: string;
  ledgerName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface IVoucherLineItemEntity {
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

export interface IVoucherEntity {
  _id: string;
  voucherNumber: string;
  voucherType: 'Sales' | 'Purchase' | 'Receipt' | 'Payment' | 'Contra' | 'Journal' | 'Credit Note' | 'Debit Note';
  date: Date;
  partyId?: string;
  partyName?: string;
  partyGstin?: string;
  placeOfSupply?: string;
  isInterState?: boolean;
  entries: IVoucherEntryEntity[];
  items?: IVoucherLineItemEntity[];
  subTotal?: number;
  totalDiscount?: number;
  totalTaxable?: number;
  cgstTotal?: number;
  sgstTotal?: number;
  igstTotal?: number;
  cessTotal?: number;
  roundOff?: number;
  totalAmount: number;
  narration?: string;
  status: 'Draft' | 'Posted' | 'Cancelled';
  cancellationReason?: string;
  financialYear: string;
  companyId: string;
  auditTrail?: {
    action: string;
    timestamp: Date;
    user?: string;
    details?: string;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IVoucherRepository {
  findByCompany(companyId: string, filter?: any): Promise<IVoucherEntity[]>;
  findById(id: string): Promise<IVoucherEntity | null>;
  findByNumber(companyId: string, voucherNumber: string): Promise<IVoucherEntity | null>;
  create(data: Partial<IVoucherEntity>): Promise<IVoucherEntity>;
  update(id: string, data: Partial<IVoucherEntity>): Promise<IVoucherEntity | null>;
  cancel(id: string, reason?: string): Promise<IVoucherEntity | null>;
  delete(id: string): Promise<boolean>;
  countByCompany(companyId: string): Promise<number>;
}
