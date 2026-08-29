import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  companyId?: mongoose.Types.ObjectId;
  mongoUri: string;
  smtp: {
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromEmail: string;
    fromName: string;
  };
  whatsapp: {
    mode: 'fallback' | 'cloud_api';
    accessToken?: string;
    phoneNumberId?: string;
    businessAccountId?: string;
    defaultGreetingTemplate: string;
  };
  gsp: {
    provider: string; // e.g. 'Sandbox / Cygnet / ClearTax'
    clientId?: string;
    clientSecret?: string;
    username?: string;
    environment: 'sandbox' | 'production';
    enabled: boolean;
  };
  storage: {
    enabled: boolean;
    supabaseUrl: string;
    serviceRoleKey: string;
    bucketName: string;
    signedUrlExpiryDays: number;
    autoCleanupDays: number;
  };
  printers: {
    posPrinterName?: string;
    regularPrinterName?: string;
    paperWidthMm: number; // 58 or 80
  };
  backupDirectory?: string;
  autoBackupOnClose: boolean;
}

const SettingsSchema = new Schema<ISettings>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
    mongoUri: { type: String, default: 'mongodb://127.0.0.1:27017/vindywashini_books' },
    smtp: {
      enabled: { type: Boolean, default: false },
      host: { type: String, default: 'smtp.gmail.com' },
      port: { type: Number, default: 587 },
      secure: { type: Boolean, default: false },
      user: { type: String, default: '' },
      pass: { type: String, default: '' },
      fromEmail: { type: String, default: '' },
      fromName: { type: String, default: 'Vindywashini Books' },
    },
    whatsapp: {
      mode: { type: String, enum: ['fallback', 'cloud_api'], default: 'fallback' },
      accessToken: { type: String, default: '' },
      phoneNumberId: { type: String, default: '' },
      businessAccountId: { type: String, default: '' },
      defaultGreetingTemplate: {
        type: String,
        default:
          'Dear {CustomerName}, thank you for shopping with {CompanyName}! Please find your invoice #{InvoiceNo} dated {Date} attached. Total: ₹{Amount}. We appreciate your business!',
      },
    },
    gsp: {
      provider: { type: String, default: 'GST Suvidha Provider (Pluggable)' },
      clientId: { type: String, default: '' },
      clientSecret: { type: String, default: '' },
      username: { type: String, default: '' },
      environment: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },
      enabled: { type: Boolean, default: false },
    },
    storage: {
      enabled: { type: Boolean, default: false },
      supabaseUrl: { type: String, default: '' },
      serviceRoleKey: { type: String, default: '' },
      bucketName: { type: String, default: 'Vindywashini Book' },
      signedUrlExpiryDays: { type: Number, default: 30 },
      autoCleanupDays: { type: Number, default: 0 },
    },
    printers: {
      posPrinterName: { type: String, default: 'Default POS' },
      regularPrinterName: { type: String, default: 'Default Printer' },
      paperWidthMm: { type: Number, default: 80 },
    },
    backupDirectory: { type: String, default: '' },
    autoBackupOnClose: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Settings = mongoose.model<ISettings>('Settings', SettingsSchema);
