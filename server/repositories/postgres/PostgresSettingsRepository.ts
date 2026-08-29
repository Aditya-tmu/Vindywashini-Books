import { PostgresClient } from './postgresClient';
import { ISettingsRepository, ISettingsEntity } from '../interfaces/ISettingsRepository';

const mapRow = (r: any): ISettingsEntity => {
  if (!r) return r;
  return {
    _id: r._id,
    companyId: r.company_id || undefined,
    databaseProvider: r.database_provider || 'postgres',
    mongoUri: r.mongo_uri || undefined,
    postgresUri: r.postgres_uri || undefined,
    smtp: typeof r.smtp === 'string' ? JSON.parse(r.smtp) : r.smtp || {},
    whatsapp: typeof r.whatsapp === 'string' ? JSON.parse(r.whatsapp) : r.whatsapp || {},
    gsp: typeof r.gsp === 'string' ? JSON.parse(r.gsp) : r.gsp || {},
    storage: typeof r.storage === 'string' ? JSON.parse(r.storage) : r.storage || {},
    defaultTemplate: r.default_template || 'A4',
    printerConfig: typeof r.printer_config === 'string' ? JSON.parse(r.printer_config) : r.printer_config || {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

export class PostgresSettingsRepository implements ISettingsRepository {
  async getSettings(companyId?: string): Promise<ISettingsEntity | null> {
    let q = 'SELECT * FROM app_settings';
    const params: any[] = [];
    if (companyId) {
      q += ' WHERE company_id = $1';
      params.push(companyId);
    }
    q += ' ORDER BY created_at DESC LIMIT 1';
    const res = await PostgresClient.query(q, params);
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async updateSettings(companyId: string | undefined, data: Partial<ISettingsEntity>): Promise<ISettingsEntity> {
    const existing = await this.getSettings(companyId);
    if (!existing) {
      const id = data._id || PostgresClient.generateId();
      const q = `
        INSERT INTO app_settings (
          _id, company_id, database_provider, mongo_uri, postgres_uri, smtp,
          whatsapp, gsp, storage, default_template, printer_config, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *
      `;
      const params = [
        id,
        companyId || null,
        data.databaseProvider || 'postgres',
        data.mongoUri || null,
        data.postgresUri || null,
        JSON.stringify(data.smtp || {}),
        JSON.stringify(data.whatsapp || {}),
        JSON.stringify(data.gsp || {}),
        JSON.stringify(data.storage || {}),
        data.defaultTemplate || 'A4',
        JSON.stringify(data.printerConfig || {}),
      ];
      const res = await PostgresClient.query(q, params);
      return mapRow(res.rows[0]);
    }

    const merged = { ...existing, ...data };
    const q = `
      UPDATE app_settings SET
        database_provider = $2,
        mongo_uri = $3,
        postgres_uri = $4,
        smtp = $5,
        whatsapp = $6,
        gsp = $7,
        storage = $8,
        default_template = $9,
        printer_config = $10,
        updated_at = NOW()
      WHERE _id = $1
      RETURNING *
    `;
    const params = [
      existing._id,
      merged.databaseProvider || 'postgres',
      merged.mongoUri || null,
      merged.postgresUri || null,
      JSON.stringify(merged.smtp || {}),
      JSON.stringify(merged.whatsapp || {}),
      JSON.stringify(merged.gsp || {}),
      JSON.stringify(merged.storage || {}),
      merged.defaultTemplate || 'A4',
      JSON.stringify(merged.printerConfig || {}),
    ];
    const res = await PostgresClient.query(q, params);
    return mapRow(res.rows[0]);
  }
}
