export interface ILedgerEntity {
  _id: string;
  name: string;
  groupName: string;
  nature: 'Assets' | 'Liabilities' | 'Income' | 'Expenses';
  openingBalance: number;
  openingType: 'Dr' | 'Cr';
  currentBalance: number;
  gstin?: string;
  pan?: string;
  isSystem?: boolean;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
  };
  bankDetails?: {
    accountNo?: string;
    ifsc?: string;
    bankName?: string;
  };
  companyId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ILedgerRepository {
  findByCompany(companyId: string): Promise<ILedgerEntity[]>;
  findById(id: string): Promise<ILedgerEntity | null>;
  findByName(companyId: string, name: string): Promise<ILedgerEntity | null>;
  create(data: Partial<ILedgerEntity>): Promise<ILedgerEntity>;
  update(id: string, data: Partial<ILedgerEntity>): Promise<ILedgerEntity | null>;
  updateBalance(id: string, amountDiff: number): Promise<ILedgerEntity | null>;
  delete(id: string): Promise<boolean>;
  countByCompany(companyId: string): Promise<number>;
  createBulk(ledgers: Partial<ILedgerEntity>[]): Promise<ILedgerEntity[]>;
}
