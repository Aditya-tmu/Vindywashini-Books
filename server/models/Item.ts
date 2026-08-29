import mongoose, { Schema, Document } from 'mongoose';

export interface IItem extends Document {
  name: string;
  itemType: 'Goods' | 'Service';
  sku?: string;
  barcode?: string;
  description?: string;
  hsnCode: string;
  sacCode?: string;
  uqc: string; // e.g. PCS, NOS, KGS, BOX
  purchaseRate: number;
  saleRate: number;
  gstRate: number; // e.g. 18 for 18%
  cessRate?: number;
  openingStock: number;
  currentStock: number;
  reorderLevel: number;
  category?: string;
  unit: string;
  companyId: mongoose.Types.ObjectId;
}

const ItemSchema = new Schema<IItem>(
  {
    name: { type: String, required: true, trim: true },
    itemType: { type: String, enum: ['Goods', 'Service'], default: 'Goods', index: true },
    sku: { type: String, trim: true, default: '' },
    barcode: { type: String, trim: true, default: '' },
    description: { type: String, default: '' },
    hsnCode: { type: String, required: true, trim: true, default: '9983' },
    sacCode: { type: String, trim: true, default: '' },
    uqc: { type: String, required: true, default: 'PCS' },
    purchaseRate: { type: Number, default: 0 },
    saleRate: { type: Number, required: true, default: 0 },
    gstRate: { type: Number, required: true, default: 18 },
    cessRate: { type: Number, default: 0 },
    openingStock: { type: Number, default: 0 },
    currentStock: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 5 },
    category: { type: String, default: 'General' },
    unit: { type: String, default: 'PCS' },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  },
  { timestamps: true }
);

ItemSchema.index({ companyId: 1, name: 1 });
ItemSchema.index({ companyId: 1, barcode: 1 });
ItemSchema.index({ companyId: 1, hsnCode: 1 });
ItemSchema.index({ companyId: 1, itemType: 1 });

export const Item = mongoose.model<IItem>('Item', ItemSchema);
