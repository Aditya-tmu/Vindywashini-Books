import mongoose, { Schema, Document } from 'mongoose';

export interface IParty extends Document {
  name: string;
  type: 'Customer' | 'Supplier' | 'Both';
  ledgerId?: mongoose.Types.ObjectId;
  gstin?: string;
  pan?: string;
  phone?: string;
  email?: string;
  billingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    stateCode: string;
    pincode: string;
  };
  shippingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    stateCode: string;
    pincode: string;
  };
  placeOfSupply: string; // state code e.g. "10-Bihar"
  openingBalance: number;
  openingType: 'Dr' | 'Cr';
  currentBalance: number;
  creditLimit: number;
  creditDays: number;
  notes?: string;
  companyId: mongoose.Types.ObjectId;
}

const PartySchema = new Schema<IParty>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['Customer', 'Supplier', 'Both'],
      required: true,
      default: 'Customer',
    },
    ledgerId: { type: Schema.Types.ObjectId, ref: 'Ledger' },
    gstin: { type: String, uppercase: true, trim: true, default: '' },
    pan: { type: String, uppercase: true, trim: true, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
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
    openingBalance: { type: Number, default: 0 },
    openingType: { type: String, enum: ['Dr', 'Cr'], default: 'Dr' },
    currentBalance: { type: Number, default: 0 },
    creditLimit: { type: Number, default: 0 },
    creditDays: { type: Number, default: 30 },
    notes: { type: String, default: '' },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  },
  { timestamps: true }
);

PartySchema.index({ companyId: 1, name: 1 });
PartySchema.index({ companyId: 1, gstin: 1 });
PartySchema.index({ companyId: 1, phone: 1 });

export const Party = mongoose.model<IParty>('Party', PartySchema);
