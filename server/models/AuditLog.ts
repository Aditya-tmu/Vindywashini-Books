import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  companyId: mongoose.Types.ObjectId;
  userId?: string;
  userName?: string;
  entityType: 'Voucher' | 'Invoice' | 'Party' | 'Item' | 'Ledger' | 'Company' | 'Settings';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PRINT' | 'SEND_EMAIL' | 'SEND_WHATSAPP' | 'FILE_GST' | 'LOCK_FY';
  details: string;
  previousState?: any;
  newState?: any;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    userId: { type: String, default: 'Admin' },
    userName: { type: String, default: 'Administrator' },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    action: { type: String, required: true },
    details: { type: String, default: '' },
    previousState: { type: Schema.Types.Mixed },
    newState: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

AuditLogSchema.index({ companyId: 1, timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
