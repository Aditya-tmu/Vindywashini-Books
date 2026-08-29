import mongoose, { Schema, Document } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  parentName?: string | null;
  nature: 'Assets' | 'Liabilities' | 'Income' | 'Expenses' | 'Primary';
  isPrimary: boolean;
  companyId: mongoose.Types.ObjectId;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true, trim: true },
    parentName: { type: String, default: null },
    nature: {
      type: String,
      enum: ['Assets', 'Liabilities', 'Income', 'Expenses', 'Primary'],
      required: true,
    },
    isPrimary: { type: Boolean, default: false },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  },
  { timestamps: true }
);

GroupSchema.index({ companyId: 1, name: 1 }, { unique: true });

export const Group = mongoose.model<IGroup>('Group', GroupSchema);
