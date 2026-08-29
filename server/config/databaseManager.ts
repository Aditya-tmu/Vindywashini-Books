import fs from 'fs';
import path from 'path';
import { connectDB, getConnectionStatus as getMongoStatus, normalizeMongoUri } from './db';
import { PostgresClient } from '../repositories/postgres/postgresClient';
import { setActiveProvider, getActiveProvider, DatabaseProvider, getRepositories } from '../repositories/factory';
import { PRE_SEEDED_GROUPS, PRE_SEEDED_LEDGERS } from './constants';
import { numberToWordsIndian } from '../utils/numberToWords';

export interface DbConfigData {
  provider: DatabaseProvider;
  uri: string;
  mongoUri?: string;
  postgresUri?: string;
  updatedAt?: string;
}

const getConfigFilePath = () => {
  const appData = process.env.APPDATA || process.env.USERPROFILE || process.cwd();
  const configDir = path.join(appData, 'VindywashiniBooks');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  return path.join(configDir, 'db-config.json');
};

export const validateMongoUri = (uri: string): { valid: boolean; error?: string } => {
  if (!uri || typeof uri !== 'string') return { valid: false, error: 'MongoDB connection string is required.' };
  const clean = uri.trim();
  if (!clean.startsWith('mongodb://') && !clean.startsWith('mongodb+srv://')) {
    return {
      valid: false,
      error: 'Invalid MongoDB connection URI. Must start with "mongodb://" or "mongodb+srv://"',
    };
  }
  return { valid: true };
};

export const validatePostgresUri = (uri: string): { valid: boolean; error?: string } => {
  if (!uri || typeof uri !== 'string') return { valid: false, error: 'PostgreSQL / Supabase connection string is required.' };
  const clean = uri.trim();
  if (!clean.startsWith('postgresql://') && !clean.startsWith('postgres://')) {
    return {
      valid: false,
      error: 'Invalid PostgreSQL connection URI. Must start with "postgresql://" or "postgres://"',
    };
  }
  return { valid: true };
};

export const loadPersistedDbConfig = (): DbConfigData => {
  try {
    const configPath = getConfigFilePath();
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data && data.provider) {
        return {
          provider: data.provider,
          uri: data.uri || (data.provider === 'postgres' ? data.postgresUri : data.mongoUri) || 'mongodb://127.0.0.1:27017/vindywashini_books',
          mongoUri: data.mongoUri || 'mongodb://127.0.0.1:27017/vindywashini_books',
          postgresUri: data.postgresUri || '',
        };
      }
    }
  } catch (err) {
    console.warn('[DatabaseManager] Could not load persisted db config:', err);
  }

  const defaultMongo = process.env.MONGO_URI ? normalizeMongoUri(process.env.MONGO_URI) : 'mongodb://127.0.0.1:27017/vindywashini_books';
  return {
    provider: (process.env.DB_PROVIDER as any) || 'mongodb',
    uri: defaultMongo,
    mongoUri: defaultMongo,
    postgresUri: process.env.POSTGRES_URI || '',
  };
};

export const savePersistedDbConfig = (data: Partial<DbConfigData>) => {
  try {
    const current = loadPersistedDbConfig();
    const merged: DbConfigData = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    const configPath = getConfigFilePath();
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2));
  } catch (err) {
    console.warn('[DatabaseManager] Could not save persisted db config:', err);
  }
};

// Synchronously set active provider on module load so repositories match persisted config
try {
  const initialConfig = loadPersistedDbConfig();
  if (initialConfig.provider === 'postgres') {
    setActiveProvider('postgres');
  } else {
    setActiveProvider('mongodb');
  }
} catch {}

export class DatabaseManager {
  private static isConnecting = false;

  public static getActiveProvider(): DatabaseProvider {
    return getActiveProvider();
  }

  public static getStatus() {
    const provider = getActiveProvider();
    if (provider === 'postgres') {
      const pgStatus = PostgresClient.getStatus();
      let host = 'localhost';
      let name = 'postgres';
      try {
        const url = new URL(pgStatus.uri);
        host = url.host;
        name = url.pathname.replace(/^\//, '') || 'postgres';
      } catch {}

      return {
        provider: 'postgres' as const,
        status: pgStatus.connected ? ('connected' as const) : pgStatus.error ? ('error' as const) : ('disconnected' as const),
        uri: pgStatus.uri,
        error: pgStatus.error,
        readyState: pgStatus.connected ? 1 : 0,
        host,
        name,
      };
    }

    const mongoStatus = getMongoStatus();
    return {
      provider: 'mongodb' as const,
      ...mongoStatus,
    };
  }

  public static async connect(providerChoice?: DatabaseProvider, customUri?: string): Promise<boolean> {
    if (this.isConnecting) return false;
    this.isConnecting = true;

    try {
      const config = loadPersistedDbConfig();
      const rawUri = (customUri || config.uri || '').trim();
      const isPgUri = rawUri.startsWith('postgresql://') || rawUri.startsWith('postgres://');
      const isMongoUri = rawUri.startsWith('mongodb://') || rawUri.startsWith('mongodb+srv://');

      let provider = providerChoice || config.provider || 'mongodb';
      if (isPgUri) {
        provider = 'postgres';
      } else if (isMongoUri) {
        provider = 'mongodb';
      }
      const uriToUse = rawUri;

      if (provider === 'postgres') {
        const validation = validatePostgresUri(uriToUse);
        if (!validation.valid) {
          console.error('[DatabaseManager] Postgres validation failed:', validation.error);
          return false;
        }

        const connected = await PostgresClient.connect(uriToUse);
        if (connected) {
          setActiveProvider('postgres');
          savePersistedDbConfig({
            provider: 'postgres',
            uri: uriToUse,
            postgresUri: uriToUse,
          });
          return true;
        }
        return false;
      }

      // MongoDB fallback
      const mongoNormalized = normalizeMongoUri(uriToUse || config.mongoUri || 'mongodb://127.0.0.1:27017/vindywashini_books');
      const validation = validateMongoUri(mongoNormalized);
      if (!validation.valid) {
        console.error('[DatabaseManager] Mongo validation failed:', validation.error);
        return false;
      }

      // If switching to MongoDB from active Postgres, disconnect Postgres pool
      if (PostgresClient.getStatus().connected) {
        await PostgresClient.disconnect();
      }

      const connected = await connectDB(mongoNormalized);
      if (connected) {
        setActiveProvider('mongodb');
        savePersistedDbConfig({
          provider: 'mongodb',
          uri: mongoNormalized,
          mongoUri: mongoNormalized,
        });
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('[DatabaseManager Connection Error]:', err.message);
      return false;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Manually load sample demo company, ledgers, and inventory items
   * ONLY triggered explicitly upon user request (never on boot, connect, or update).
   */
  public static async seedSampleData(): Promise<{ success: boolean; message: string; companyId?: string }> {
    try {
      const repos = getRepositories();

      // Check if sample company already exists
      const allCompanies = await repos.companies.findAll();
      const existing = allCompanies.find(
        (c) => c.tradeName === 'MAA VINDYWASHINI HARDWARE' || c.legalName === 'MAA VINDYWASHINI HARDWARE & SANITARY'
      );
      if (existing) {
        return {
          success: true,
          message: 'Sample demo company already exists in database.',
          companyId: existing._id,
        };
      }

      console.log(`[DatabaseManager] Manually loading sample demo data into ${getActiveProvider()}...`);

      const savedCompany = await repos.companies.create({
        legalName: 'MAA VINDYWASHINI HARDWARE & SANITARY',
        tradeName: 'MAA VINDYWASHINI HARDWARE',
        gstin: '10ABCDE1234F1Z5',
        pan: 'ABCDE1234F',
        address: {
          line1: 'Main Market Road, Near Gandhi Chowk',
          line2: 'Boring Road',
          city: 'Patna',
          state: 'Bihar',
          stateCode: '10',
          pincode: '800001',
        },
        contact: {
          phone: '+91 98765 43210',
          email: 'billing@vindywashinibooks.local',
          website: 'https://vindywashini.local',
        },
        bankDetails: {
          bankName: 'State Bank of India',
          accountNo: '30998822110',
          ifsc: 'SBIN0001234',
          branch: 'Patna Main Branch',
          upiId: '9876543210@sbi',
        },
        financialYearStart: 4,
        currentFY: '2025-2026',
        invoicePrefix: 'VWB/',
        invoiceNumberSeq: 101,
        invoiceSuffix: '/25-26',
        defaultTemplate: 'A4',
        termsAndConditions:
          '1. Goods once sold will not be taken back without original bill.\n2. Interest @ 18% p.a. will be charged if payment is delayed past 15 days.\n3. Subject to Patna Jurisdiction only.',
        notes: 'Thank you for choosing Maa Vindywashini Hardware! Visit again.',
      });

      // 1. Seed Groups
      for (const g of PRE_SEEDED_GROUPS) {
        await repos.groups.create({
          name: g.name,
          parentName: g.parent || undefined,
          nature: (g.nature as any) || undefined,
          isPrimary: g.isPrimary,
          companyId: savedCompany._id,
        });
      }

      // 2. Seed Ledgers
      for (const l of PRE_SEEDED_LEDGERS) {
        const g = PRE_SEEDED_GROUPS.find((grp) => grp.name === l.group);
        await repos.ledgers.create({
          name: l.name,
          groupName: l.group,
          nature: (g?.nature as any) || (l.name === 'Profit & Loss A/c' ? 'Liabilities' : 'Assets'),
          openingBalance: l.name === 'Cash' ? 50000 : 0,
          openingType: (l.openingType as any) || 'Dr',
          currentBalance: l.name === 'Cash' ? 50000 : 0,
          isSystem: true,
          companyId: savedCompany._id,
        });
      }

      // 3. Seed Items
      const sampleItems = [
        {
          name: 'UltraTech Super Cement (50kg)',
          hsnCode: '2523',
          uqc: 'BAG',
          purchaseRate: 340,
          saleRate: 410,
          gstRate: 28,
          openingStock: 200,
          currentStock: 200,
          reorderLevel: 30,
          category: 'Cement',
          unit: 'BAG',
          companyId: savedCompany._id,
        },
        {
          name: 'TMT Steel Rebar 12mm Fe-550D',
          hsnCode: '7214',
          uqc: 'KGS',
          purchaseRate: 58,
          saleRate: 68,
          gstRate: 18,
          openingStock: 1500,
          currentStock: 1500,
          reorderLevel: 200,
          category: 'Steel',
          unit: 'KGS',
          companyId: savedCompany._id,
        },
        {
          name: 'Supreme PVC Pipe 4 Inch 6kg',
          hsnCode: '3917',
          uqc: 'MTR',
          purchaseRate: 210,
          saleRate: 285,
          gstRate: 18,
          openingStock: 80,
          currentStock: 80,
          reorderLevel: 15,
          category: 'Plumbing',
          unit: 'MTR',
          companyId: savedCompany._id,
        },
        {
          name: 'Asian Paints Apex Ultima White (20L)',
          hsnCode: '3209',
          uqc: 'BTL',
          purchaseRate: 3900,
          saleRate: 4750,
          gstRate: 18,
          openingStock: 25,
          currentStock: 25,
          reorderLevel: 5,
          category: 'Paints',
          unit: 'BTL',
          companyId: savedCompany._id,
        },
        {
          name: 'Brass Ball Valve 1 Inch',
          hsnCode: '8481',
          uqc: 'PCS',
          purchaseRate: 140,
          saleRate: 210,
          gstRate: 18,
          openingStock: 60,
          currentStock: 60,
          reorderLevel: 10,
          category: 'Sanitary',
          unit: 'PCS',
          companyId: savedCompany._id,
        },
      ];

      for (const it of sampleItems) {
        await repos.items.create(it);
      }

      // 4. Seed Parties
      const partyB2B = await repos.parties.create({
        name: 'Rameshwar Builders & Developers',
        type: 'Customer',
        gstin: '10AABCR1234A1Z1',
        phone: '9835012345',
        email: 'rameshwar.patna@gmail.com',
        billingAddress: {
          line1: 'Plot 14, Bailey Road',
          city: 'Patna',
          state: 'Bihar',
          stateCode: '10',
          pincode: '800015',
        },
        placeOfSupply: '10-Bihar',
        openingBalance: 0,
        openingType: 'Dr',
        currentBalance: 0,
        companyId: savedCompany._id,
      });

      await repos.ledgers.create({
        name: partyB2B.name,
        groupName: 'Sundry Debtors',
        nature: 'Assets',
        openingBalance: 0,
        openingType: 'Dr',
        currentBalance: 0,
        isSystem: false,
        companyId: savedCompany._id,
      });

      const supplier = await repos.parties.create({
        name: 'Tata Steel Depot Jamshedpur',
        type: 'Supplier',
        gstin: '20AAACT2727Q1ZG',
        phone: '9431122334',
        email: 'sales.jamshedpur@tatasteel.com',
        billingAddress: {
          line1: 'Industrial Area, Phase 2',
          city: 'Jamshedpur',
          state: 'Jharkhand',
          stateCode: '20',
          pincode: '831001',
        },
        placeOfSupply: '20-Jharkhand',
        openingBalance: 0,
        openingType: 'Cr',
        currentBalance: 0,
        companyId: savedCompany._id,
      });

      await repos.ledgers.create({
        name: supplier.name,
        groupName: 'Sundry Creditors',
        nature: 'Liabilities',
        openingBalance: 0,
        openingType: 'Cr',
        currentBalance: 0,
        isSystem: false,
        companyId: savedCompany._id,
      });

      return {
        success: true,
        message: 'Sample demo company and catalog loaded successfully!',
        companyId: savedCompany._id,
      };
    } catch (err: any) {
      console.error('[DatabaseManager Manual Seed Error]:', err.message);
      return {
        success: false,
        message: 'Failed to load sample data: ' + err.message,
      };
    }
  }

  /**
   * Manually clean / remove demo sample data if user wants a clean database
   */
  public static async cleanSampleData(): Promise<{ success: boolean; message: string; deletedCount?: number }> {
    try {
      const repos = getRepositories();
      const allCompanies = await repos.companies.findAll();
      const sampleCompanies = allCompanies.filter(
        (c) =>
          c.tradeName === 'MAA VINDYWASHINI HARDWARE' ||
          c.legalName === 'MAA VINDYWASHINI HARDWARE & SANITARY' ||
          c.gstin === '10ABCDE1234F1Z5'
      );

      let deletedCount = 0;
      for (const comp of sampleCompanies) {
        await repos.companies.delete(comp._id);
        deletedCount++;
      }

      return {
        success: true,
        message: `Removed ${deletedCount} sample demo company record(s) and all linked vouchers/ledgers.`,
        deletedCount,
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Error cleaning sample data: ' + err.message,
      };
    }
  }
}
