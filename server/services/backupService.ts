import fs from 'fs';
import path from 'path';
import { getRepositories } from '../repositories/factory';
import { MigrationService } from './migrationService';
import { getBackupsDir } from '../config/paths';

export class BackupService {
  /**
   * Export all database records to a JSON backup file (Provider-agnostic)
   */
  public static async createBackup(
    companyId?: string,
    outputDir?: string
  ): Promise<{ filePath: string; filename: string; summary: any }> {
    const defaultDir = outputDir || getBackupsDir();
    if (!fs.existsSync(defaultDir)) {
      fs.mkdirSync(defaultDir, { recursive: true });
    }

    const snapshot = await MigrationService.exportSnapshot(companyId);

    const backupData = {
      version: '1.0.0',
      exportedAt: snapshot.exportedAt || new Date().toISOString(),
      companyId: companyId || 'ALL',
      data: {
        companies: snapshot.companies || [],
        groups: snapshot.groups || [],
        ledgers: snapshot.ledgers || [],
        items: snapshot.items || [],
        parties: snapshot.parties || [],
        vouchers: snapshot.vouchers || [],
        invoices: snapshot.invoices || [],
        purchases: snapshot.purchases || [],
        settings: snapshot.settings || [],
        auditLogs: [],
        gstReturns: [],
      },
    };

    const summary = {
      companies: backupData.data.companies.length,
      groups: backupData.data.groups.length,
      ledgers: backupData.data.ledgers.length,
      items: backupData.data.items.length,
      parties: backupData.data.parties.length,
      vouchers: backupData.data.vouchers.length,
      invoices: backupData.data.invoices.length,
      purchases: backupData.data.purchases.length,
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `VindywashiniBooks_Backup_${timestamp}.json`;
    const filePath = path.join(defaultDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');

    return { filePath, filename, summary };
  }

  /**
   * Restore database from JSON backup file (Provider-agnostic)
   */
  public static async restoreBackup(
    backupFilePath: string
  ): Promise<{ success: boolean; message: string; restoredCounts: any }> {
    if (!fs.existsSync(backupFilePath)) {
      throw new Error('Backup file not found at path: ' + backupFilePath);
    }

    const content = fs.readFileSync(backupFilePath, 'utf8');
    const backupJson = JSON.parse(content);

    if (!backupJson.data) {
      throw new Error('Invalid backup file format');
    }

    const snapshotBundle = {
      version: backupJson.version || '1.0.0',
      exportedAt: backupJson.exportedAt || new Date().toISOString(),
      sourceProvider: backupJson.sourceProvider || 'mongodb',
      companies: backupJson.data.companies || [],
      groups: backupJson.data.groups || [],
      ledgers: backupJson.data.ledgers || [],
      parties: backupJson.data.parties || [],
      items: backupJson.data.items || [],
      vouchers: backupJson.data.vouchers || [],
      invoices: backupJson.data.invoices || [],
      purchases: backupJson.data.purchases || [],
      settings: backupJson.data.settings || [],
    };

    const importRes = await MigrationService.importSnapshot(snapshotBundle as any);

    return {
      success: importRes.success,
      message: importRes.errors.length > 0 
        ? `Database backup partially restored with ${importRes.errors.length} notice(s).` 
        : 'Database backup successfully restored!',
      restoredCounts: importRes.counts,
    };
  }
}
