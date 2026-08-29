export interface ISettingsEntity {
  _id: string;
  companyId?: string;
  databaseProvider?: 'mongodb' | 'postgres';
  mongoUri?: string;
  postgresUri?: string;
  smtp?: {
    enabled?: boolean;
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
    fromEmail?: string;
    fromName?: string;
  };
  whatsapp?: {
    mode?: 'fallback' | 'cloud_api';
    accessToken?: string;
    phoneNumberId?: string;
    businessAccountId?: string;
    defaultGreetingTemplate?: string;
  };
  gsp?: {
    provider?: string;
    clientId?: string;
    clientSecret?: string;
    username?: string;
    environment?: 'sandbox' | 'production';
    enabled?: boolean;
  };
  storage?: {
    enabled?: boolean;
    supabaseUrl?: string;
    serviceRoleKey?: string;
    bucketName?: string;
    signedUrlExpiryDays?: number;
    autoCleanupDays?: number;
  };
  defaultTemplate?: 'POS-58' | 'POS-80' | 'A5' | 'A4';
  printerConfig?: {
    defaultPrinter?: string;
    silentPrint?: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISettingsRepository {
  getSettings(companyId?: string): Promise<ISettingsEntity | null>;
  updateSettings(companyId: string | undefined, data: Partial<ISettingsEntity>): Promise<ISettingsEntity>;
}
