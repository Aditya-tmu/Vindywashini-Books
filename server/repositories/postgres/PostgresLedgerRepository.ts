import { PostgresClient } from './postgresClient';
import { ILedgerRepository, ILedgerEntity } from '../interfaces/ILedgerRepository';

const mapRow = (r: any): ILedgerEntity => {
  if (!r) return r;
  return {
    _id: r._id,
    name: r.name,
    groupName: r.group_name,
    nature: r.nature,
    openingBalance: Number(r.opening_balance) || 0,
    openingType: r.opening_type || 'Dr',
    currentBalance: Number(r.current_balance) || 0,
    gstin: r.gstin || undefined,
    pan: r.pan || undefined,
    isSystem: Boolean(r.is_system),
    address: typeof r.address === 'string' ? JSON.parse(r.address) : r.address || {},
    contact: typeof r.contact === 'string' ? JSON.parse(r.contact) : r.contact || {},
    bankDetails: typeof r.bank_details === 'string' ? JSON.parse(r.bank_details) : r.bank_details || {},
    companyId: r.company_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

export class PostgresLedgerRepository implements ILedgerRepository {
  async findByCompany(companyId: string): Promise<ILedgerEntity[]> {
    const res = await PostgresClient.query('SELECT * FROM ledgers WHERE company_id = $1 ORDER BY name ASC', [companyId]);
    return res.rows.map(mapRow);
  }

  async findById(id: string): Promise<ILedgerEntity | null> {
    const res = await PostgresClient.query('SELECT * FROM ledgers WHERE _id = $1', [id]);
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async findByName(companyId: string, name: string): Promise<ILedgerEntity | null> {
    const res = await PostgresClient.query(
      'SELECT * FROM ledgers WHERE company_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) LIMIT 1',
      [companyId, name]
    );
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async create(data: Partial<ILedgerEntity>): Promise<ILedgerEntity> {
    const id = data._id || PostgresClient.generateId();
    const q = `
      INSERT INTO ledgers (
        _id, name, group_name, nature, opening_balance, opening_type, current_balance,
        gstin, pan, is_system, address, contact, bank_details, company_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *
    `;
    const params = [
      id,
      data.name,
      data.groupName,
      data.nature,
      data.openingBalance || 0,
      data.openingType || 'Dr',
      data.currentBalance !== undefined ? data.currentBalance : data.openingBalance || 0,
      data.gstin || null,
      data.pan || null,
      Boolean(data.isSystem),
      JSON.stringify(data.address || {}),
      JSON.stringify(data.contact || {}),
      JSON.stringify(data.bankDetails || {}),
      data.companyId,
    ];
    const res = await PostgresClient.query(q, params);
    return mapRow(res.rows[0]);
  }

  async update(id: string, data: Partial<ILedgerEntity>): Promise<ILedgerEntity | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const merged = { ...current, ...data };
    const q = `
      UPDATE ledgers SET
        name = $2,
        group_name = $3,
        nature = $4,
        opening_balance = $5,
        opening_type = $6,
        current_balance = $7,
        gstin = $8,
        pan = $9,
        is_system = $10,
        address = $11,
        contact = $12,
        bank_details = $13,
        updated_at = NOW()
      WHERE _id = $1
      RETURNING *
    `;
    const params = [
      id,
      merged.name,
      merged.groupName,
      merged.nature,
      merged.openingBalance,
      merged.openingType,
      merged.currentBalance,
      merged.gstin || null,
      merged.pan || null,
      Boolean(merged.isSystem),
      JSON.stringify(merged.address || {}),
      JSON.stringify(merged.contact || {}),
      JSON.stringify(merged.bankDetails || {}),
    ];
    const res = await PostgresClient.query(q, params);
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async updateBalance(id: string, amountDiff: number): Promise<ILedgerEntity | null> {
    const res = await PostgresClient.query(
      'UPDATE ledgers SET current_balance = current_balance + $2, updated_at = NOW() WHERE _id = $1 RETURNING *',
      [id, amountDiff]
    );
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await PostgresClient.query('DELETE FROM ledgers WHERE _id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  async countByCompany(companyId: string): Promise<number> {
    const res = await PostgresClient.query('SELECT COUNT(*) FROM ledgers WHERE company_id = $1', [companyId]);
    return Number(res.rows[0].count);
  }

  async createBulk(ledgers: Partial<ILedgerEntity>[]): Promise<ILedgerEntity[]> {
    const results: ILedgerEntity[] = [];
    for (const l of ledgers) {
      results.push(await this.create(l));
    }
    return results;
  }
}
