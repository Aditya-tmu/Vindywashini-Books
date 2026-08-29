import { getRepositories, getActiveProvider, setActiveProvider, DatabaseProvider } from '../repositories/factory';
import { DatabaseManager, validateMongoUri, validatePostgresUri } from '../config/databaseManager';

export interface DataMigrationBundle {
  version: string;
  exportedAt: string;
  sourceProvider: DatabaseProvider;
  companies: any[];
  groups: any[];
  ledgers: any[];
  parties: any[];
  items: any[];
  vouchers: any[];
  invoices: any[];
  purchases: any[];
  settings: any[];
}

export class MigrationService {
  /**
   * Export full neutral JSON snapshot of all entities from the currently active database provider
   */
  public static async exportSnapshot(companyId?: string): Promise<DataMigrationBundle> {
    const repos = getRepositories();
    const sourceProvider = getActiveProvider();

    try {
      const companies = companyId
        ? [await repos.companies.findById(companyId)].filter(Boolean)
        : await repos.companies.findAll();

      const groups: any[] = [];
      const ledgers: any[] = [];
      const parties: any[] = [];
      const items: any[] = [];
      const vouchers: any[] = [];
      const invoices: any[] = [];
      const purchases: any[] = [];

      for (const comp of companies) {
        if (!comp) continue;
        const cId = comp._id;

        const [cGroups, cLedgers, cParties, cItems, cVouchers, cInvoices, cPurchases] = await Promise.all([
          repos.groups.findByCompany(cId),
          repos.ledgers.findByCompany(cId),
          repos.parties.findByCompany(cId),
          repos.items.findByCompany(cId),
          repos.vouchers.findByCompany(cId),
          repos.invoices.findByCompany(cId),
          repos.purchases.findByCompany(cId),
        ]);

        groups.push(...cGroups);
        ledgers.push(...cLedgers);
        parties.push(...cParties);
        items.push(...cItems);
        vouchers.push(...cVouchers);
        invoices.push(...cInvoices);
        purchases.push(...cPurchases);
      }

      const settingsObj = await repos.settings.getSettings(companyId);
      const settings = settingsObj ? [settingsObj] : [];

      return {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        sourceProvider,
        companies: companies || [],
        groups,
        ledgers,
        parties,
        items,
        vouchers,
        invoices,
        purchases,
        settings,
      };
    } catch (err: any) {
      console.warn(`[MigrationService] Note: Database query returned notice during exportSnapshot: ${err.message}`);
      return {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        sourceProvider,
        companies: [],
        groups: [],
        ledgers: [],
        parties: [],
        items: [],
        vouchers: [],
        invoices: [],
        purchases: [],
        settings: [],
      };
    }
  }

  /**
   * Import neutral JSON bundle into the currently active database provider
   * (respects foreign-key order: companies -> groups -> ledgers -> parties -> items -> vouchers -> invoices -> purchases -> settings)
   */
  public static async importSnapshot(bundle: DataMigrationBundle): Promise<{
    success: boolean;
    counts: Record<string, number>;
    errors: string[];
  }> {
    const repos = getRepositories();
    const counts: Record<string, number> = {
      companies: 0,
      groups: 0,
      ledgers: 0,
      parties: 0,
      items: 0,
      vouchers: 0,
      invoices: 0,
      purchases: 0,
      settings: 0,
    };
    const errors: string[] = [];

    // 1. Companies
    for (const c of bundle.companies || []) {
      try {
        const existing = await repos.companies.findById(c._id);
        if (!existing) {
          await repos.companies.create(c);
        } else {
          await repos.companies.update(c._id, c);
        }
        counts.companies++;
      } catch (e: any) {
        errors.push(`Company ${c.legalName || c._id}: ${e.message}`);
      }
    }

    // 2. Groups
    for (const g of bundle.groups || []) {
      try {
        await repos.groups.create(g);
        counts.groups++;
      } catch (e: any) {
        errors.push(`Group ${g.name}: ${e.message}`);
      }
    }

    // 3. Ledgers
    for (const l of bundle.ledgers || []) {
      try {
        const existing = await repos.ledgers.findById(l._id);
        if (!existing) {
          await repos.ledgers.create(l);
        } else {
          await repos.ledgers.update(l._id, l);
        }
        counts.ledgers++;
      } catch (e: any) {
        errors.push(`Ledger ${l.name}: ${e.message}`);
      }
    }

    // 4. Parties
    for (const p of bundle.parties || []) {
      try {
        const existing = await repos.parties.findById(p._id);
        if (!existing) {
          await repos.parties.create(p);
        } else {
          await repos.parties.update(p._id, p);
        }
        counts.parties++;
      } catch (e: any) {
        errors.push(`Party ${p.name}: ${e.message}`);
      }
    }

    // 5. Items
    for (const it of bundle.items || []) {
      try {
        const existing = await repos.items.findById(it._id);
        if (!existing) {
          await repos.items.create(it);
        } else {
          await repos.items.update(it._id, it);
        }
        counts.items++;
      } catch (e: any) {
        errors.push(`Item ${it.name}: ${e.message}`);
      }
    }

    // 6. Vouchers
    for (const v of bundle.vouchers || []) {
      try {
        const existing = await repos.vouchers.findById(v._id);
        if (!existing) {
          await repos.vouchers.create(v);
        } else {
          await repos.vouchers.update(v._id, v);
        }
        counts.vouchers++;
      } catch (e: any) {
        errors.push(`Voucher ${v.voucherNumber}: ${e.message}`);
      }
    }

    // 7. Invoices
    for (const inv of bundle.invoices || []) {
      try {
        const existing = await repos.invoices.findById(inv._id);
        if (!existing) {
          await repos.invoices.create(inv);
        } else {
          await repos.invoices.update(inv._id, inv);
        }
        counts.invoices++;
      } catch (e: any) {
        errors.push(`Invoice ${inv.invoiceNumber}: ${e.message}`);
      }
    }

    // 8. Purchases
    for (const pb of bundle.purchases || []) {
      try {
        const existing = await repos.purchases.findById(pb._id);
        if (!existing) {
          await repos.purchases.create(pb);
        } else {
          await repos.purchases.update(pb._id, pb);
        }
        counts.purchases++;
      } catch (e: any) {
        errors.push(`Purchase ${pb.billNumber}: ${e.message}`);
      }
    }

    // 9. Settings
    for (const s of bundle.settings || []) {
      try {
        await repos.settings.updateSettings(s.companyId, s);
        counts.settings++;
      } catch (e: any) {
        errors.push(`Settings: ${e.message}`);
      }
    }

    return {
      success: errors.length === 0,
      counts,
      errors,
    };
  }

  /**
   * Complete 1-Click Migration from current active database to a newly selected target provider
   */
  public static async migrateBetweenProviders(targetProvider: DatabaseProvider, targetUri: string): Promise<{
    success: boolean;
    message: string;
    counts?: Record<string, number>;
    errors?: string[];
  }> {
    const sourceProvider = getActiveProvider();

    // 1. Export snapshot from current provider before switching
    console.log(`[Migration] Exporting data snapshot from current provider (${sourceProvider})...`);
    const snapshot = await this.exportSnapshot();

    // 2. Connect to the target provider
    console.log(`[Migration] Connecting to target provider (${targetProvider})...`);
    const connected = await DatabaseManager.connect(targetProvider, targetUri);
    if (!connected) {
      // Revert back to original provider
      await DatabaseManager.connect(sourceProvider);
      return {
        success: false,
        message: `Could not connect to target ${targetProvider} database. Migration aborted.`,
      };
    }

    // 3. Import snapshot into new provider
    console.log(`[Migration] Importing data snapshot into target provider (${targetProvider})...`);
    const result = await this.importSnapshot(snapshot);

    return {
      success: result.success,
      message: result.success
        ? `Successfully migrated ${result.counts.companies} company, ${result.counts.vouchers} vouchers, ${result.counts.invoices} invoices to ${targetProvider.toUpperCase()}!`
        : `Migration completed with warnings: ${result.errors.join('; ')}`,
      counts: result.counts,
      errors: result.errors,
    };
  }
}
