import { PostgresClient } from './postgresClient';
import { ICompanyRepository, ICompanyEntity } from '../interfaces/ICompanyRepository';

const mapRow = (r: any): ICompanyEntity => {
  if (!r) return r;
  return {
    _id: r._id,
    legalName: r.legal_name,
    tradeName: r.trade_name || undefined,
    gstin: r.gstin || undefined,
    pan: r.pan || undefined,
    address: typeof r.address === 'string' ? JSON.parse(r.address) : r.address || {},
    contact: typeof r.contact === 'string' ? JSON.parse(r.contact) : r.contact || {},
    bankDetails: typeof r.bank_details === 'string' ? JSON.parse(r.bank_details) : r.bank_details || {},
    financialYearStart: r.financial_year_start,
    currentFY: r.current_fy || '2025-2026',
    invoicePrefix: r.invoice_prefix || 'INV/',
    invoiceNumberSeq: Number(r.invoice_number_seq) || 1,
    invoiceSuffix: r.invoice_suffix || '',
    defaultTemplate: r.default_template || 'A4',
    termsAndConditions: r.terms_and_conditions || undefined,
    notes: r.notes || undefined,
    logoPath: r.logo_path || undefined,
    isLockedFY: Boolean(r.is_locked_fy),
    lockedFYList: typeof r.locked_fy_list === 'string' ? JSON.parse(r.locked_fy_list) : r.locked_fy_list || [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

export class PostgresCompanyRepository implements ICompanyRepository {
  async findAll(): Promise<ICompanyEntity[]> {
    const res = await PostgresClient.query('SELECT * FROM companies ORDER BY created_at DESC');
    return res.rows.map(mapRow);
  }

  async findById(id: string): Promise<ICompanyEntity | null> {
    const res = await PostgresClient.query('SELECT * FROM companies WHERE _id = $1', [id]);
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async findOne(filter: any = {}): Promise<ICompanyEntity | null> {
    if (filter._id) return this.findById(filter._id);
    const res = await PostgresClient.query('SELECT * FROM companies LIMIT 1');
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async create(data: Partial<ICompanyEntity>): Promise<ICompanyEntity> {
    const id = data._id || PostgresClient.generateId();
    const q = `
      INSERT INTO companies (
        _id, legal_name, trade_name, gstin, pan, address, contact, bank_details,
        financial_year_start, current_fy, invoice_prefix, invoice_number_seq,
        invoice_suffix, default_template, terms_and_conditions, notes, logo_path,
        is_locked_fy, locked_fy_list, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
      RETURNING *
    `;
    const params = [
      id,
      data.legalName,
      data.tradeName || data.legalName,
      data.gstin || null,
      data.pan || null,
      JSON.stringify(data.address || {}),
      JSON.stringify(data.contact || {}),
      JSON.stringify(data.bankDetails || {}),
      data.financialYearStart || 4,
      data.currentFY || '2025-2026',
      data.invoicePrefix || 'INV/',
      data.invoiceNumberSeq || 1,
      data.invoiceSuffix || '',
      data.defaultTemplate || 'A4',
      data.termsAndConditions || null,
      data.notes || null,
      data.logoPath || null,
      Boolean(data.isLockedFY),
      JSON.stringify(data.lockedFYList || []),
    ];
    const res = await PostgresClient.query(q, params);
    return mapRow(res.rows[0]);
  }

  async update(id: string, data: Partial<ICompanyEntity>): Promise<ICompanyEntity | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const merged = { ...current, ...data };
    const q = `
      UPDATE companies SET
        legal_name = $2,
        trade_name = $3,
        gstin = $4,
        pan = $5,
        address = $6,
        contact = $7,
        bank_details = $8,
        financial_year_start = $9,
        current_fy = $10,
        invoice_prefix = $11,
        invoice_number_seq = $12,
        invoice_suffix = $13,
        default_template = $14,
        terms_and_conditions = $15,
        notes = $16,
        logo_path = $17,
        is_locked_fy = $18,
        locked_fy_list = $19,
        updated_at = NOW()
      WHERE _id = $1
      RETURNING *
    `;
    const params = [
      id,
      merged.legalName,
      merged.tradeName,
      merged.gstin || null,
      merged.pan || null,
      JSON.stringify(merged.address || {}),
      JSON.stringify(merged.contact || {}),
      JSON.stringify(merged.bankDetails || {}),
      merged.financialYearStart,
      merged.currentFY,
      merged.invoicePrefix,
      merged.invoiceNumberSeq,
      merged.invoiceSuffix,
      merged.defaultTemplate,
      merged.termsAndConditions || null,
      merged.notes || null,
      merged.logoPath || null,
      Boolean(merged.isLockedFY),
      JSON.stringify(merged.lockedFYList || []),
    ];
    const res = await PostgresClient.query(q, params);
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await PostgresClient.query('DELETE FROM companies WHERE _id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  async incrementInvoiceSeq(id: string): Promise<number> {
    const res = await PostgresClient.query(
      'UPDATE companies SET invoice_number_seq = invoice_number_seq + 1, updated_at = NOW() WHERE _id = $1 RETURNING invoice_number_seq',
      [id]
    );
    return res.rows.length > 0 ? Number(res.rows[0].invoice_number_seq) : 1;
  }

  async count(): Promise<number> {
    const res = await PostgresClient.query('SELECT COUNT(*) FROM companies');
    return Number(res.rows[0].count);
  }
}
