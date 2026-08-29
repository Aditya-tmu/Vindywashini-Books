import { Pool, PoolConfig } from 'pg';
import crypto from 'crypto';

export function parsePostgresUri(rawUri: string): {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean;
} {
  try {
    const url = new URL(PostgresClient.normalizePostgresUri(rawUri));
    return {
      host: url.hostname || undefined,
      port: url.port ? parseInt(url.port, 10) : 5432,
      user: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      database: url.pathname ? decodeURIComponent(url.pathname.replace(/^\//, '')) : undefined,
      ssl:
        url.searchParams.get('sslmode') === 'require' ||
        url.searchParams.get('ssl') === 'true' ||
        url.searchParams.get('sslmode') === 'prefer',
    };
  } catch {
    return { port: 5432 };
  }
}

export class PostgresClient {
  private static pool: Pool | null = null;
  private static currentUri: string = '';
  private static isConnected: boolean = false;
  private static lastError: string | null = null;

  public static getPool(): Pool | null {
    return this.pool;
  }

  public static getStatus() {
    return {
      connected: this.isConnected,
      uri: this.currentUri,
      error: this.lastError,
    };
  }

  public static normalizePostgresUri(rawUri: string): string {
    if (!rawUri || typeof rawUri !== 'string') return '';
    let uri = rawUri.trim();
    // Normalize postgres:// or postgresql://
    if (!uri.startsWith('postgresql://') && !uri.startsWith('postgres://')) {
      uri = 'postgresql://' + uri;
    }
    return uri;
  }

  /**
   * Centralized shared connection-factory for all PostgreSQL / Supabase pool connections.
   * Ensures rejectUnauthorized: false is consistently applied for all cloud hosts and SSL connections,
   * while passing discrete parameters so node-postgres does not override SSL options.
   */
  public static createPoolConfig(rawUri: string): { config?: PoolConfig; error?: string } {
    const normalized = this.normalizePostgresUri(rawUri);
    if (!normalized) {
      return { error: 'Invalid Postgres connection string' };
    }

    try {
      const url = new URL(normalized);
      const host = url.hostname || '127.0.0.1';

      // Supabase IPv6 direct connection diagnostic check
      if (host.startsWith('db.') && host.endsWith('.supabase.co')) {
        return {
          error: `This looks like a Supabase Direct Connection host (${host}), which requires IPv6 and fails on most home/office networks. Please use the Session Pooler host instead (format: aws-0-<region>.pooler.supabase.com with user: postgres.<project-ref> and port: 5432) from Supabase Dashboard → Connect → Session Pooler.`,
        };
      }

      const port = url.port ? parseInt(url.port, 10) : 5432;
      const user = url.username ? decodeURIComponent(url.username) : 'postgres';
      const password = url.password ? decodeURIComponent(url.password) : '';
      const database = url.pathname ? decodeURIComponent(url.pathname.replace(/^\//, '')) : 'postgres';

      const isLocal = host === 'localhost' || host === '127.0.0.1';
      const isCloudOrSsl =
        !isLocal ||
        host.includes('supabase.co') ||
        host.includes('pooler.supabase.com') ||
        host.includes('rds.amazonaws.com') ||
        host.includes('neon.tech') ||
        host.includes('render.com') ||
        url.searchParams.get('sslmode') === 'require' ||
        url.searchParams.get('ssl') === 'true' ||
        url.searchParams.get('sslmode') === 'prefer';

      const config: PoolConfig = {
        host,
        port,
        user,
        password,
        database,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        max: 10,
      };

      // Discrete SSL configuration to avoid node-postgres self-signed certificate chain rejection
      if (isCloudOrSsl) {
        config.ssl = { rejectUnauthorized: false };
      }

      return { config };
    } catch (err: any) {
      return { error: `Failed to parse Postgres URI: ${err.message}` };
    }
  }

  public static async connect(uri: string): Promise<boolean> {
    const normalized = this.normalizePostgresUri(uri);
    const { config, error } = this.createPoolConfig(normalized);

    if (error || !config) {
      this.lastError = error || 'Invalid Postgres connection configuration';
      this.isConnected = false;
      return false;
    }

    try {
      if (this.pool) {
        await this.pool.end().catch(() => {});
        this.pool = null;
      }

      this.pool = new Pool(config);

      // Verify connection with trivial query
      const client = await this.pool.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }

      this.currentUri = normalized;
      this.isConnected = true;
      this.lastError = null;

      // Auto-run DDL schema migration to create tables if they don't exist
      await this.initSchema();

      console.log('[Postgres] Connected successfully to database:', this.getSanitizedUri(normalized));
      return true;
    } catch (err: any) {
      console.error('[Postgres Connection Error]:', err.message);
      this.lastError = err.message;
      this.isConnected = false;
      if (this.pool) {
        await this.pool.end().catch(() => {});
        this.pool = null;
      }
      return false;
    }
  }

  public static async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end().catch(() => {});
      this.pool = null;
    }
    this.isConnected = false;
    this.currentUri = '';
    console.log('[Postgres] Disconnected from database.');
  }

  public static getSanitizedUri(uri: string): string {
    return uri.replace(/:([^:@]+)@/, ':****@');
  }

  public static generateId(): string {
    return crypto.randomUUID().replace(/-/g, '').substring(0, 24);
  }

  public static async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool || !this.isConnected) {
      throw new Error('PostgreSQL database is not connected. Check Settings -> Database.');
    }
    return await this.pool.query(text, params);
  }

  /**
   * Auto-create all required relational tables for Vindywashini Books
   *
   * Supabase & Postgres Best Practice Note on Row Level Security (RLS):
   * In Vindywashini Books desktop/local architecture, the backend application connects with a direct
   * service connection pool credential, and tenant multi-company isolation is enforced at the repository query
   * boundary (`WHERE company_id = $1` on all CRUD operations with cascading deletes). Tables do not require
   * Supabase JWT auth RLS policies since client apps do not connect directly to Supabase via browser client keys.
   * Tables and foreign key indexes are strictly defined with ON DELETE CASCADE.
   */
  public static async initSchema(): Promise<void> {
    if (!this.pool) return;

    const ddl = `
      -- 1. Companies
      CREATE TABLE IF NOT EXISTS companies (
        _id VARCHAR(64) PRIMARY KEY,
        legal_name TEXT NOT NULL,
        trade_name TEXT,
        gstin VARCHAR(20),
        pan VARCHAR(15),
        address JSONB NOT NULL DEFAULT '{}'::jsonb,
        contact JSONB NOT NULL DEFAULT '{}'::jsonb,
        bank_details JSONB NOT NULL DEFAULT '{}'::jsonb,
        financial_year_start INT DEFAULT 4,
        current_fy VARCHAR(20) DEFAULT '2025-2026',
        invoice_prefix VARCHAR(50) DEFAULT 'INV/',
        invoice_number_seq INT DEFAULT 1,
        invoice_suffix VARCHAR(50) DEFAULT '',
        default_template VARCHAR(20) DEFAULT 'A4',
        terms_and_conditions TEXT,
        notes TEXT,
        logo_path TEXT,
        is_locked_fy BOOLEAN DEFAULT FALSE,
        locked_fy_list JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- 2. Groups
      CREATE TABLE IF NOT EXISTS groups (
        _id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        parent_name VARCHAR(255),
        nature VARCHAR(50) NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        company_id VARCHAR(64) REFERENCES companies(_id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- 3. Ledgers
      CREATE TABLE IF NOT EXISTS ledgers (
        _id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        group_name VARCHAR(255) NOT NULL,
        nature VARCHAR(50) NOT NULL,
        opening_balance NUMERIC(15,2) DEFAULT 0,
        opening_type VARCHAR(10) DEFAULT 'Dr',
        current_balance NUMERIC(15,2) DEFAULT 0,
        gstin VARCHAR(20),
        pan VARCHAR(15),
        is_system BOOLEAN DEFAULT FALSE,
        address JSONB DEFAULT '{}'::jsonb,
        contact JSONB DEFAULT '{}'::jsonb,
        bank_details JSONB DEFAULT '{}'::jsonb,
        company_id VARCHAR(64) REFERENCES companies(_id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- 4. Parties
      CREATE TABLE IF NOT EXISTS parties (
        _id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL,
        gstin VARCHAR(20),
        pan VARCHAR(15),
        phone VARCHAR(50),
        email VARCHAR(255),
        billing_address JSONB DEFAULT '{}'::jsonb,
        shipping_address JSONB DEFAULT '{}'::jsonb,
        place_of_supply VARCHAR(50),
        opening_balance NUMERIC(15,2) DEFAULT 0,
        opening_type VARCHAR(10) DEFAULT 'Dr',
        current_balance NUMERIC(15,2) DEFAULT 0,
        credit_limit NUMERIC(15,2) DEFAULT 0,
        payment_terms_days INT DEFAULT 30,
        company_id VARCHAR(64) REFERENCES companies(_id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- 5. Items
      CREATE TABLE IF NOT EXISTS items (
        _id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        item_type VARCHAR(20) DEFAULT 'Goods',
        hsn_code VARCHAR(20),
        sac_code VARCHAR(20),
        uqc VARCHAR(20) DEFAULT 'PCS',
        unit VARCHAR(20),
        category VARCHAR(100),
        description TEXT,
        purchase_rate NUMERIC(15,2) DEFAULT 0,
        sale_rate NUMERIC(15,2) DEFAULT 0,
        gst_rate NUMERIC(5,2) DEFAULT 0,
        cess_rate NUMERIC(5,2) DEFAULT 0,
        opening_stock NUMERIC(15,2) DEFAULT 0,
        current_stock NUMERIC(15,2) DEFAULT 0,
        reorder_level NUMERIC(15,2) DEFAULT 0,
        barcode VARCHAR(100),
        company_id VARCHAR(64) REFERENCES companies(_id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- 6. Vouchers
      CREATE TABLE IF NOT EXISTS vouchers (
        _id VARCHAR(64) PRIMARY KEY,
        voucher_number VARCHAR(100) NOT NULL,
        voucher_type VARCHAR(50) NOT NULL,
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        party_id VARCHAR(64),
        party_name VARCHAR(255),
        party_gstin VARCHAR(20),
        place_of_supply VARCHAR(50),
        is_inter_state BOOLEAN DEFAULT FALSE,
        entries JSONB NOT NULL DEFAULT '[]'::jsonb,
        items JSONB DEFAULT '[]'::jsonb,
        sub_total NUMERIC(15,2) DEFAULT 0,
        total_discount NUMERIC(15,2) DEFAULT 0,
        total_taxable NUMERIC(15,2) DEFAULT 0,
        cgst_total NUMERIC(15,2) DEFAULT 0,
        sgst_total NUMERIC(15,2) DEFAULT 0,
        igst_total NUMERIC(15,2) DEFAULT 0,
        cess_total NUMERIC(15,2) DEFAULT 0,
        round_off NUMERIC(15,2) DEFAULT 0,
        total_amount NUMERIC(15,2) NOT NULL,
        narration TEXT,
        status VARCHAR(20) DEFAULT 'Posted',
        cancellation_reason TEXT,
        financial_year VARCHAR(20) NOT NULL,
        audit_trail JSONB DEFAULT '[]'::jsonb,
        company_id VARCHAR(64) REFERENCES companies(_id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- 7. Invoices
      CREATE TABLE IF NOT EXISTS invoices (
        _id VARCHAR(64) PRIMARY KEY,
        invoice_number VARCHAR(100) NOT NULL,
        voucher_id VARCHAR(64),
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        due_date TIMESTAMP WITH TIME ZONE,
        customer_id VARCHAR(64),
        customer_name VARCHAR(255) NOT NULL,
        customer_gstin VARCHAR(20),
        customer_phone VARCHAR(50),
        customer_email VARCHAR(255),
        billing_address JSONB NOT NULL DEFAULT '{}'::jsonb,
        shipping_address JSONB DEFAULT '{}'::jsonb,
        place_of_supply VARCHAR(50) NOT NULL,
        is_inter_state BOOLEAN DEFAULT FALSE,
        reverse_charge BOOLEAN DEFAULT FALSE,
        items JSONB NOT NULL DEFAULT '[]'::jsonb,
        tax_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
        sub_total NUMERIC(15,2) DEFAULT 0,
        total_discount NUMERIC(15,2) DEFAULT 0,
        total_taxable NUMERIC(15,2) DEFAULT 0,
        cgst_total NUMERIC(15,2) DEFAULT 0,
        sgst_total NUMERIC(15,2) DEFAULT 0,
        igst_total NUMERIC(15,2) DEFAULT 0,
        cess_total NUMERIC(15,2) DEFAULT 0,
        round_off NUMERIC(15,2) DEFAULT 0,
        grand_total NUMERIC(15,2) NOT NULL,
        amount_in_words TEXT,
        template_used VARCHAR(20) DEFAULT 'A4',
        payment_mode VARCHAR(20) DEFAULT 'Cash',
        payment_status VARCHAR(20) DEFAULT 'Paid',
        paid_amount NUMERIC(15,2) DEFAULT 0,
        balance_amount NUMERIC(15,2) DEFAULT 0,
        pdf_path TEXT,
        cloud_storage_path TEXT,
        signed_url TEXT,
        signed_url_expires_at TIMESTAMP WITH TIME ZONE,
        cloud_upload_status VARCHAR(50) DEFAULT 'not_configured',
        cloud_upload_error TEXT,
        notes TEXT,
        terms TEXT,
        bank_details_snapshot JSONB DEFAULT '{}'::jsonb,
        company_id VARCHAR(64) REFERENCES companies(_id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- 8. Purchase Bills
      CREATE TABLE IF NOT EXISTS purchase_bills (
        _id VARCHAR(64) PRIMARY KEY,
        bill_number VARCHAR(100) NOT NULL,
        supplier_invoice_number VARCHAR(100) NOT NULL,
        supplier_invoice_date TIMESTAMP WITH TIME ZONE NOT NULL,
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        due_date TIMESTAMP WITH TIME ZONE,
        supplier_id VARCHAR(64),
        supplier_name VARCHAR(255) NOT NULL,
        supplier_gstin VARCHAR(20),
        supplier_phone VARCHAR(50),
        supplier_email VARCHAR(255),
        supplier_address JSONB DEFAULT '{}'::jsonb,
        placeOfSupply VARCHAR(50) NOT NULL,
        is_inter_state BOOLEAN DEFAULT FALSE,
        reverse_charge BOOLEAN DEFAULT FALSE,
        items JSONB NOT NULL DEFAULT '[]'::jsonb,
        tax_summary JSONB NOT NULL DEFAULT '[]'::jsonb,
        sub_total NUMERIC(15,2) DEFAULT 0,
        total_discount NUMERIC(15,2) DEFAULT 0,
        total_taxable NUMERIC(15,2) DEFAULT 0,
        cgst_total NUMERIC(15,2) DEFAULT 0,
        sgst_total NUMERIC(15,2) DEFAULT 0,
        igst_total NUMERIC(15,2) DEFAULT 0,
        cess_total NUMERIC(15,2) DEFAULT 0,
        round_off NUMERIC(15,2) DEFAULT 0,
        grand_total NUMERIC(15,2) NOT NULL,
        amount_in_words TEXT,
        voucher_id VARCHAR(64),
        payment_mode VARCHAR(20) DEFAULT 'Cash',
        payment_status VARCHAR(20) DEFAULT 'Paid',
        paid_amount NUMERIC(15,2) DEFAULT 0,
        balance_amount NUMERIC(15,2) DEFAULT 0,
        bank_charges NUMERIC(15,2) DEFAULT 0,
        notes TEXT,
        financial_year VARCHAR(20) NOT NULL,
        company_id VARCHAR(64) REFERENCES companies(_id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- 9. App Settings
      CREATE TABLE IF NOT EXISTS app_settings (
        _id VARCHAR(64) PRIMARY KEY,
        company_id VARCHAR(64),
        database_provider VARCHAR(20) DEFAULT 'postgres',
        mongo_uri TEXT,
        postgres_uri TEXT,
        smtp JSONB DEFAULT '{}'::jsonb,
        whatsapp JSONB DEFAULT '{}'::jsonb,
        gsp JSONB DEFAULT '{}'::jsonb,
        storage JSONB DEFAULT '{}'::jsonb,
        default_template VARCHAR(20) DEFAULT 'A4',
        printer_config JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Incremental column migrations for existing Postgres tables
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cloud_storage_path TEXT;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS signed_url TEXT;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS signed_url_expires_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cloud_upload_status VARCHAR(50) DEFAULT 'not_configured';
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cloud_upload_error TEXT;
      ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS storage JSONB DEFAULT '{}'::jsonb;

      -- Create helpful indexes
      CREATE INDEX IF NOT EXISTS idx_ledgers_company ON ledgers(company_id);
      CREATE INDEX IF NOT EXISTS idx_parties_company ON parties(company_id);
      CREATE INDEX IF NOT EXISTS idx_items_company ON items(company_id);
      CREATE INDEX IF NOT EXISTS idx_vouchers_company ON vouchers(company_id);
      CREATE INDEX IF NOT EXISTS idx_vouchers_num ON vouchers(company_id, voucher_number);
      CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_num ON invoices(company_id, invoice_number);
      CREATE INDEX IF NOT EXISTS idx_purchases_company ON purchase_bills(company_id);
      CREATE INDEX IF NOT EXISTS idx_purchases_num ON purchase_bills(company_id, bill_number);
    `;

    await this.pool.query(ddl);
    console.log('[Postgres] Schema initialization verified.');
  }
}
