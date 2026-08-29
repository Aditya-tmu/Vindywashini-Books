import mongoose, { Schema, Document } from 'mongoose';
import { ITaxSummary } from './Invoice';

export interface IPurchaseBill extends Document {
  billNumber: string;
  supplierInvoiceNumber: string;
  supplierInvoiceDate: Date;
  voucherId: mongoose.Types.ObjectId;
  date: Date;
  dueDate?: Date;
  supplierId?: mongoose.Types.ObjectId;
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
    itemId?: mongoose.Types.ObjectId;
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
    cessAmount?: number;
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
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial';
  paidAmount: number;
  balanceAmount: number;
  isDraft: boolean;
  notes?: string;
  companyId: mongoose.Types.ObjectId;
  financialYear: string;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseBillSchema = new Schema<IPurchaseBill>(
  {
    billNumber: { type: String, required: true, trim: true },
    supplierInvoiceNumber: { type: String, required: true, trim: true },
    supplierInvoiceDate: { type: Date, required: true, default: Date.now },
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher' },
    date: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Party' },
    supplierName: { type: String, required: true },
    supplierGstin: { type: String, uppercase: true, default: '' },
    supplierPhone: { type: String, default: '' },
    supplierEmail: { type: String, default: '' },
    supplierAddress: {
      line1: { type: String, default: '' },
      line2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: 'Bihar' },
      stateCode: { type: String, default: '10' },
      pincode: { type: String, default: '' },
    },
    placeOfSupply: { type: String, default: '10-Bihar' },
    isInterState: { type: Boolean, default: false },
    reverseCharge: { type: Boolean, default: false },
    items: [
      {
        itemId: { type: Schema.Types.ObjectId, ref: 'Item' },
        name: { type: String, required: true },
        itemType: { type: String, enum: ['Goods', 'Service'], default: 'Goods' },
        hsnCode: { type: String, default: '9983' },
        uqc: { type: String, default: 'PCS' },
        quantity: { type: Number, required: true, default: 1 },
        purchaseRate: { type: Number, required: true, default: 0 },
        discountPercent: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        taxableValue: { type: Number, required: true, default: 0 },
        gstRate: { type: Number, required: true, default: 18 },
        cgstAmount: { type: Number, default: 0 },
        sgstAmount: { type: Number, default: 0 },
        igstAmount: { type: Number, default: 0 },
        cessAmount: { type: Number, default: 0 },
        total: { type: Number, required: true, default: 0 },
      },
    ],
    taxSummary: [
      {
        gstRate: Number,
        taxableValue: Number,
        cgst: Number,
        sgst: Number,
        igst: Number,
        cess: Number,
        totalTax: Number,
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
    grandTotal: { type: Number, required: true, default: 0 },
    amountInWords: { type: String, default: '' },
    paymentMode: { type: String, enum: ['Cash', 'Credit', 'Bank', 'UPI'], default: 'Credit' },
    paymentStatus: { type: String, enum: ['Paid', 'Unpaid', 'Partial'], default: 'Unpaid' },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    isDraft: { type: Boolean, default: false },
    notes: { type: String, default: '' },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    financialYear: { type: String, required: true, default: '2025-2026' },
  },
  { timestamps: true }
);

PurchaseBillSchema.index({ companyId: 1, financialYear: 1, billNumber: 1 }, { unique: true });
PurchaseBillSchema.index({ companyId: 1, supplierId: 1 });
PurchaseBillSchema.index({ companyId: 1, date: -1 });

export const PurchaseBill = mongoose.model<IPurchaseBill>('PurchaseBill', PurchaseBillSchema);
