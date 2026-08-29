import { PostgresClient } from './postgresClient';
import { IPartyRepository, IPartyEntity } from '../interfaces/IPartyRepository';

const mapRow = (r: any): IPartyEntity => {
  if (!r) return r;
  return {
    _id: r._id,
    name: r.name,
    type: r.type,
    gstin: r.gstin || undefined,
    pan: r.pan || undefined,
    phone: r.phone || undefined,
    email: r.email || undefined,
    billingAddress: typeof r.billing_address === 'string' ? JSON.parse(r.billing_address) : r.billing_address || {},
    shippingAddress: typeof r.shipping_address === 'string' ? JSON.parse(r.shipping_address) : r.shipping_address || {},
    placeOfSupply: r.place_of_supply || undefined,
    openingBalance: Number(r.opening_balance) || 0,
    openingType: r.opening_type || 'Dr',
    currentBalance: Number(r.current_balance) || 0,
    creditLimit: Number(r.credit_limit) || 0,
    paymentTermsDays: Number(r.payment_terms_days) || 30,
    companyId: r.company_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

export class PostgresPartyRepository implements IPartyRepository {
  async findByCompany(companyId: string, type?: string): Promise<IPartyEntity[]> {
    let q = 'SELECT * FROM parties WHERE company_id = $1';
    const params: any[] = [companyId];
    if (type) {
      q += ' AND type = $2';
      params.push(type);
    }
    q += ' ORDER BY name ASC';
    const res = await PostgresClient.query(q, params);
    return res.rows.map(mapRow);
  }

  async findById(id: string): Promise<IPartyEntity | null> {
    const res = await PostgresClient.query('SELECT * FROM parties WHERE _id = $1', [id]);
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async findByName(companyId: string, name: string): Promise<IPartyEntity | null> {
    const res = await PostgresClient.query(
      'SELECT * FROM parties WHERE company_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) LIMIT 1',
      [companyId, name]
    );
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async create(data: Partial<IPartyEntity>): Promise<IPartyEntity> {
    const id = data._id || PostgresClient.generateId();
    const q = `
      INSERT INTO parties (
        _id, name, type, gstin, pan, phone, email, billing_address, shipping_address,
        place_of_supply, opening_balance, opening_type, current_balance, credit_limit,
        payment_terms_days, company_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
      RETURNING *
    `;
    const params = [
      id,
      data.name,
      data.type || 'Customer',
      data.gstin || null,
      data.pan || null,
      data.phone || null,
      data.email || null,
      JSON.stringify(data.billingAddress || {}),
      JSON.stringify(data.shippingAddress || {}),
      data.placeOfSupply || null,
      data.openingBalance || 0,
      data.openingType || 'Dr',
      data.currentBalance !== undefined ? data.currentBalance : data.openingBalance || 0,
      data.creditLimit || 0,
      data.paymentTermsDays || 30,
      data.companyId,
    ];
    const res = await PostgresClient.query(q, params);
    return mapRow(res.rows[0]);
  }

  async update(id: string, data: Partial<IPartyEntity>): Promise<IPartyEntity | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const merged = { ...current, ...data };
    const q = `
      UPDATE parties SET
        name = $2,
        type = $3,
        gstin = $4,
        pan = $5,
        phone = $6,
        email = $7,
        billing_address = $8,
        shipping_address = $9,
        place_of_supply = $10,
        opening_balance = $11,
        opening_type = $12,
        current_balance = $13,
        credit_limit = $14,
        payment_terms_days = $15,
        updated_at = NOW()
      WHERE _id = $1
      RETURNING *
    `;
    const params = [
      id,
      merged.name,
      merged.type,
      merged.gstin || null,
      merged.pan || null,
      merged.phone || null,
      merged.email || null,
      JSON.stringify(merged.billingAddress || {}),
      JSON.stringify(merged.shippingAddress || {}),
      merged.placeOfSupply || null,
      merged.openingBalance,
      merged.openingType,
      merged.currentBalance,
      merged.creditLimit,
      merged.paymentTermsDays,
    ];
    const res = await PostgresClient.query(q, params);
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await PostgresClient.query('DELETE FROM parties WHERE _id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  async countByCompany(companyId: string): Promise<number> {
    const res = await PostgresClient.query('SELECT COUNT(*) FROM parties WHERE company_id = $1', [companyId]);
    return Number(res.rows[0].count);
  }
}
