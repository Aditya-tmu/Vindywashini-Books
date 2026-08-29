import mongoose, { Schema, Document } from 'mongoose';

export interface ITaxSummary {
  gstRate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
}

export interface IInvoiceDeliveryLog {
  channel: 'email' | 'whatsapp';
  sentAt: Date;
  status: 'success' | 'failed' | 'manual_fallback_opened';
  recipient: string;
  messageId?: string;
  error?: string;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  voucherId: mongoose.Types.ObjectId;
  date: Date;
  dueDate?: Date;
  customerId?: mongoose.Types.ObjectId;
  customerName: string;
  customerGstin?: string;
  customerPhone?: string;
  customerEmail?: string;
  billingAddress: {
    line1?: string;
    line2?: string;
    city?: string;
    state: string;
    stateCode: string;
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
  reverseCharge: boolean;
  items: Array<{
    itemId?: mongoose.Types.ObjectId;
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
  templateUsed: 'POS-58' | 'POS-80' | 'A5' | 'A4';
  pdfPath?: string;
  cloudStoragePath?: string;
  signedUrl?: string;
  signedUrlExpiresAt?: Date;
  cloudUploadStatus?: 'uploaded' | 'pending' | 'failed' | 'not_configured';
  cloudUploadError?: string;
  paymentMode: 'Cash' | 'Credit' | 'Bank' | 'UPI' | 'Split';
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial';
  paidAmount: number;
  balanceAmount: number;
  notes?: string;
  terms?: string;
  bankDetailsSnapshot?: {
    bankName: string;
    accountNo: string;
    ifsc: string;
    branch: string;
    upiId?: string;
  };
  deliveries: IInvoiceDeliveryLog[];
  companyId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, trim: true },
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
    date: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date },
    customerId: { type: Schema.Types.ObjectId, ref: 'Party' },
    customerName: { type: String, required: true },
    customerGstin: { type: String, uppercase: true, default: '' },
    customerPhone: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
    billingAddress: {
      line1: { type: String, default: '' },
      line2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: 'Bihar' },
      stateCode: { type: String, default: '10' },
      pincode: { type: String, default: '' },
    },
    shippingAddress: {
      line1: { type: String, default: '' },
      line2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      stateCode: { type: String, default: '' },
      pincode: { type: String, default: '' },
    },
    placeOfSupply: { type: String, default: '10-Bihar' },
    isInterState: { type: Boolean, default: false },
    reverseCharge: { type: Boolean, default: false },
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
        cgstAmount: { type: Number, default: 0 },
        sgstAmount: { type: Number, default: 0 },
        igstAmount: { type: Number, default: 0 },
        cessAmount: { type: Number, default: 0 },
        total: { type: Number, required: true, default: 0 },
      },
    ],
    taxSummary: [
      {
        gstRate: { type: Number, required: true },
        taxableValue: { type: Number, required: true },
        cgst: { type: Number, default: 0 },
        sgst: { type: Number, default: 0 },
        igst: { type: Number, default: 0 },
        cess: { type: Number, default: 0 },
        totalTax: { type: Number, required: true },
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
    templateUsed: {
      type: String,
      enum: ['POS-58', 'POS-80', 'A5', 'A4'],
      default: 'A4',
    },
    pdfPath: { type: String, default: '' },
    cloudStoragePath: { type: String, default: '' },
    signedUrl: { type: String, default: '' },
    signedUrlExpiresAt: { type: Date },
    cloudUploadStatus: {
      type: String,
      enum: ['uploaded', 'pending', 'failed', 'not_configured'],
      default: 'not_configured',
    },
    cloudUploadError: { type: String, default: '' },
    paymentMode: {
      type: String,
      enum: ['Cash', 'Credit', 'Bank', 'UPI', 'Split'],
      default: 'Cash',
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Unpaid', 'Partial'],
      default: 'Paid',
    },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    terms: { type: String, default: '' },
    bankDetailsSnapshot: {
      bankName: { type: String, default: '' },
      accountNo: { type: String, default: '' },
      ifsc: { type: String, default: '' },
      branch: { type: String, default: '' },
      upiId: { type: String, default: '' },
    },
    deliveries: [
      {
        channel: { type: String, enum: ['email', 'whatsapp'], required: true },
        sentAt: { type: Date, default: Date.now },
        status: { type: String, enum: ['success', 'failed', 'manual_fallback_opened'], required: true },
        recipient: { type: String, required: true },
        messageId: { type: String },
        error: { type: String },
      },
    ],
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  },
  { timestamps: true }
);

InvoiceSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ companyId: 1, date: -1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
