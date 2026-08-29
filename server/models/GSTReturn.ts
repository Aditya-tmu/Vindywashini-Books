import mongoose, { Schema, Document } from 'mongoose';

export interface IGSTReturn extends Document {
  companyId: mongoose.Types.ObjectId;
  period: string; // e.g. "2025-07" or "2025-Q1"
  returnType: 'GSTR-1' | 'GSTR-3B' | 'GSTR-2B-Recon';
  summaryData: any;
  jsonData?: any;
  exportFiles: Array<{
    format: 'xlsx' | 'csv' | 'json' | 'pdf';
    filename: string;
    filePath: string;
    generatedAt: Date;
  }>;
  filingStatus: 'Draft' | 'Generated' | 'Uploaded' | 'Filed';
  gspRefId?: string;
  arn?: string;
  filingDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GSTReturnSchema = new Schema<IGSTReturn>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    period: { type: String, required: true },
    returnType: {
      type: String,
      enum: ['GSTR-1', 'GSTR-3B', 'GSTR-2B-Recon'],
      required: true,
    },
    summaryData: { type: Schema.Types.Mixed, default: {} },
    jsonData: { type: Schema.Types.Mixed, default: {} },
    exportFiles: [
      {
        format: { type: String, required: true },
        filename: { type: String, required: true },
        filePath: { type: String, required: true },
        generatedAt: { type: Date, default: Date.now },
      },
    ],
    filingStatus: {
      type: String,
      enum: ['Draft', 'Generated', 'Uploaded', 'Filed'],
      default: 'Draft',
    },
    gspRefId: { type: String },
    arn: { type: String },
    filingDate: { type: Date },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

GSTReturnSchema.index({ companyId: 1, returnType: 1, period: 1 });

export const GSTReturn = mongoose.model<IGSTReturn>('GSTReturn', GSTReturnSchema);
