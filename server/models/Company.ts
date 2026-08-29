import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
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
  financialYearStart: number; // Month (e.g. 4 for April)
  currentFY: string; // e.g. "2025-2026"
  invoicePrefix: string; // e.g. "VWB/"
  invoiceNumberSeq: number; // current sequential count
  invoiceSuffix?: string; // e.g. "/25-26"
  defaultTemplate: 'POS-58' | 'POS-80' | 'A5' | 'A4';
  additionalGstins?: string[];
  termsAndConditions?: string;
  notes?: string;
  lockedFYs?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompany>(
  {
    legalName: { type: String, required: true, trim: true },
    tradeName: { type: String, required: true, trim: true },
    gstin: { type: String, uppercase: true, trim: true, default: '' },
    pan: { type: String, uppercase: true, trim: true, default: '' },
    address: {
      line1: { type: String, default: '' },
      line2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, required: true, default: 'Bihar' },
      stateCode: { type: String, required: true, default: '10' },
      pincode: { type: String, default: '' },
    },
    contact: {
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      website: { type: String, default: '' },
    },
    bankDetails: {
      bankName: { type: String, default: '' },
      accountNo: { type: String, default: '' },
      ifsc: { type: String, default: '' },
      branch: { type: String, default: '' },
      upiId: { type: String, default: '' },
    },
    logoPath: { type: String, default: '' },
    financialYearStart: { type: Number, default: 4 },
    currentFY: { type: String, default: '2025-2026' },
    invoicePrefix: { type: String, default: 'INV/' },
    invoiceNumberSeq: { type: Number, default: 1 },
    invoiceSuffix: { type: String, default: '' },
    defaultTemplate: {
      type: String,
      enum: ['POS-58', 'POS-80', 'A5', 'A4'],
      default: 'A4',
    },
    additionalGstins: [{ type: String }],
    termsAndConditions: {
      type: String,
      default: '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is not made within the due date.\n3. Subject to local jurisdiction only.',
    },
    notes: { type: String, default: 'Thank you for your business!' },
    lockedFYs: [{ type: String }],
  },
  { timestamps: true }
);

export const Company = mongoose.model<ICompany>('Company', CompanySchema);
