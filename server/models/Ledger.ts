import mongoose, { Schema, Document } from 'mongoose';

export interface ILedger extends Document {
  name: string;
  groupName: string;
  nature: 'Assets' | 'Liabilities' | 'Income' | 'Expenses' | 'Primary';
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
  creditPeriodDays?: number;
  creditLimit?: number;
  bankAccountDetails?: {
    accountNo?: string;
    ifsc?: string;
    bankName?: string;
    branch?: string;
  };
  isSystem: boolean;
  companyId: mongoose.Types.ObjectId;
}

const LedgerSchema = new Schema<ILedger>(
  {
    name: { type: String, required: true, trim: true },
    groupName: { type: String, required: true, trim: true },
    nature: {
      type: String,
      enum: ['Assets', 'Liabilities', 'Income', 'Expenses', 'Primary'],
      required: true,
      default: 'Assets',
    },
    openingBalance: { type: Number, default: 0 },
    openingType: { type: String, enum: ['Dr', 'Cr'], default: 'Dr' },
    currentBalance: { type: Number, default: 0 },
    gstin: { type: String, uppercase: true, trim: true, default: '' },
    pan: { type: String, uppercase: true, trim: true, default: '' },
    address: { type: String, default: '' },
    state: { type: String, default: '' },
    stateCode: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    creditPeriodDays: { type: Number, default: 0 },
    creditLimit: { type: Number, default: 0 },
    bankAccountDetails: {
      accountNo: { type: String, default: '' },
      ifsc: { type: String, default: '' },
      bankName: { type: String, default: '' },
      branch: { type: String, default: '' },
    },
    isSystem: { type: Boolean, default: false },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  },
  { timestamps: true }
);

LedgerSchema.index({ companyId: 1, name: 1 }, { unique: true });

export const Ledger = mongoose.model<ILedger>('Ledger', LedgerSchema);
