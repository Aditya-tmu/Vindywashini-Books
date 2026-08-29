export interface ICompanyEntity {
  _id: string;
  legalName: string;
  tradeName?: string;
  gstin?: string;
  pan?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    stateCode: string;
    pincode: string;
  };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
  };
  bankDetails: {
    bankName: string;
    accountNo: string;
    ifsc: string;
    branch?: string;
    upiId?: string;
  };
  financialYearStart?: number;
  currentFY: string;
  invoicePrefix: string;
  invoiceNumberSeq: number;
  invoiceSuffix?: string;
  defaultTemplate: 'POS-58' | 'POS-80' | 'A5' | 'A4';
  termsAndConditions?: string;
  notes?: string;
  logoPath?: string;
  isLockedFY?: boolean;
  lockedFYList?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICompanyRepository {
  findAll(): Promise<ICompanyEntity[]>;
  findById(id: string): Promise<ICompanyEntity | null>;
  findOne(filter?: any): Promise<ICompanyEntity | null>;
  create(data: Partial<ICompanyEntity>): Promise<ICompanyEntity>;
  update(id: string, data: Partial<ICompanyEntity>): Promise<ICompanyEntity | null>;
  delete(id: string): Promise<boolean>;
  incrementInvoiceSeq(id: string): Promise<number>;
  count(): Promise<number>;
}
