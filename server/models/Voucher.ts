import mongoose, { Schema, Document } from 'mongoose';

export type VoucherType =
  | 'Sales'
  | 'Purchase'
  | 'Payment'
  | 'Receipt'
  | 'Contra'
  | 'Journal'
  | 'CreditNote'
  | 'DebitNote';

export interface IVoucherEntry {
  ledgerId: mongoose.Types.ObjectId;
  ledgerName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface IVoucherItem {
  itemId: mongoose.Types.ObjectId;
  name: string;
  hsnCode: string;
  uqc: string;
  quantity: number;
  rate: number;
  discountPercent?: number;
  discountAmount?: number;
  taxableValue: number;
  gstRate: number;
  cgstRate?: number;
  cgstAmount?: number;
  sgstRate?: number;
  sgstAmount?: number;
  igstRate?: number;
  igstAmount?: number;
  cessRate?: number;
  cessAmount?: number;
  total: number;
}

export interface IVoucher extends Document {
  voucherNumber: string;
  voucherType: VoucherType;
  date: Date;
  effectiveDate?: Date;
  referenceNo?: string;
  referenceDate?: Date;
  narration?: string;
  partyId?: mongoose.Types.ObjectId;
  partyName?: string;
  partyGstin?: string;
  placeOfSupply?: string;
  isInterState: boolean;
  reverseCharge: boolean;
  entries: IVoucherEntry[];
  items?: IVoucherItem[];
  subTotal: number;
  totalDiscount: number;
  totalTaxable: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  roundOff: number;
  totalAmount: number;
  isLocked: boolean;
  status: 'Draft' | 'Posted' | 'Cancelled';
  financialYear: string;
  companyId: mongoose.Types.ObjectId;
  auditTrail: Array<{
    action: string;
    timestamp: Date;
    user?: string;
    details?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const VoucherSchema = new Schema<IVoucher>(
  {
    voucherNumber: { type: String, required: true, trim: true },
    voucherType: {
      type: String,
      enum: ['Sales', 'Purchase', 'Payment', 'Receipt', 'Contra', 'Journal', 'CreditNote', 'DebitNote'],
      required: true,
    },
    date: { type: Date, required: true, default: Date.now },
    effectiveDate: { type: Date },
    referenceNo: { type: String, default: '' },
    referenceDate: { type: Date },
    narration: { type: String, default: '' },
    partyId: { type: Schema.Types.ObjectId, ref: 'Party' },
    partyName: { type: String, default: '' },
    partyGstin: { type: String, uppercase: true, default: '' },
    placeOfSupply: { type: String, default: '10-Bihar' },
    isInterState: { type: Boolean, default: false },
    reverseCharge: { type: Boolean, default: false },
    entries: [
      {
        ledgerId: { type: Schema.Types.ObjectId, ref: 'Ledger', required: true },
        ledgerName: { type: String, required: true },
        debit: { type: Number, default: 0 },
        credit: { type: Number, default: 0 },
        description: { type: String, default: '' },
      },
    ],
    items: [
      {
        itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
        name: { type: String, required: true },
        hsnCode: { type: String, default: '' },
        uqc: { type: String, default: 'PCS' },
        quantity: { type: Number, required: true, default: 1 },
        rate: { type: Number, required: true, default: 0 },
        discountPercent: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        taxableValue: { type: Number, required: true, default: 0 },
        gstRate: { type: Number, required: true, default: 18 },
        cgstRate: { type: Number, default: 0 },
        cgstAmount: { type: Number, default: 0 },
        sgstRate: { type: Number, default: 0 },
        sgstAmount: { type: Number, default: 0 },
        igstRate: { type: Number, default: 0 },
        igstAmount: { type: Number, default: 0 },
        cessRate: { type: Number, default: 0 },
        cessAmount: { type: Number, default: 0 },
        total: { type: Number, required: true, default: 0 },
      },
    ],
    subTotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalTaxable: { type: Number, default: 0 },
    cgstTotal: { type: Number, default: 0 },
    sgstTotal: { type: Number, default: 0 },
    igstTotal: { type: Number, default: 0 },
    cessTotal: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    isLocked: { type: Boolean, default: false },
    status: { type: String, enum: ['Posted', 'Draft', 'Cancelled'], default: 'Posted' },
    financialYear: { type: String, required: true, default: '2025-2026' },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    auditTrail: [
      {
        action: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        user: { type: String, default: 'Admin' },
        details: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

VoucherSchema.index({ companyId: 1, financialYear: 1, voucherType: 1, voucherNumber: 1 }, { unique: true });
VoucherSchema.index({ companyId: 1, date: -1 });
VoucherSchema.index({ companyId: 1, partyId: 1 });
VoucherSchema.index({ companyId: 1, status: 1 });

export const Voucher = mongoose.model<IVoucher>('Voucher', VoucherSchema);
