import { PostgresClient } from './postgresClient';
import { IVoucherRepository, IVoucherEntity } from '../interfaces/IVoucherRepository';

const mapRow = (r: any): IVoucherEntity => {
  if (!r) return r;
  return {
    _id: r._id,
    voucherNumber: r.voucher_number,
    voucherType: r.voucher_type,
    date: r.date,
    partyId: r.party_id || undefined,
    partyName: r.party_name || undefined,
    partyGstin: r.party_gstin || undefined,
    placeOfSupply: r.place_of_supply || undefined,
    isInterState: Boolean(r.is_inter_state),
    entries: typeof r.entries === 'string' ? JSON.parse(r.entries) : r.entries || [],
    items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items || [],
    subTotal: Number(r.sub_total) || 0,
    totalDiscount: Number(r.total_discount) || 0,
    totalTaxable: Number(r.total_taxable) || 0,
    cgstTotal: Number(r.cgst_total) || 0,
    sgstTotal: Number(r.sgst_total) || 0,
    igstTotal: Number(r.igst_total) || 0,
    cessTotal: Number(r.cess_total) || 0,
    roundOff: Number(r.round_off) || 0,
    totalAmount: Number(r.total_amount) || 0,
    narration: r.narration || undefined,
    status: r.status || 'Posted',
    cancellationReason: r.cancellation_reason || undefined,
    financialYear: r.financial_year || '2025-2026',
    auditTrail: typeof r.audit_trail === 'string' ? JSON.parse(r.audit_trail) : r.audit_trail || [],
    companyId: r.company_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

export class PostgresVoucherRepository implements IVoucherRepository {
  async findByCompany(companyId: string, filter: any = {}): Promise<IVoucherEntity[]> {
    let q = 'SELECT * FROM vouchers WHERE company_id = $1';
    const params: any[] = [companyId];
    let idx = 2;

    if (filter.voucherType) {
      q += ` AND voucher_type = $${idx++}`;
      params.push(filter.voucherType);
    }
    if (filter.status) {
      q += ` AND status = $${idx++}`;
      params.push(filter.status);
    }
    if (filter.financialYear) {
      q += ` AND financial_year = $${idx++}`;
      params.push(filter.financialYear);
    }
    if (filter.partyId) {
      q += ` AND party_id = $${idx++}`;
      params.push(filter.partyId);
    }
    if (filter.startDate && filter.endDate) {
      q += ` AND date >= $${idx++} AND date <= $${idx++}`;
      params.push(filter.startDate, filter.endDate);
    }

    q += ' ORDER BY date DESC, created_at DESC';
    const res = await PostgresClient.query(q, params);
    return res.rows.map(mapRow);
  }

  async findById(id: string): Promise<IVoucherEntity | null> {
    const res = await PostgresClient.query('SELECT * FROM vouchers WHERE _id = $1', [id]);
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async findByNumber(companyId: string, voucherNumber: string): Promise<IVoucherEntity | null> {
    const res = await PostgresClient.query(
      'SELECT * FROM vouchers WHERE company_id = $1 AND voucher_number = $2 LIMIT 1',
      [companyId, voucherNumber]
    );
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async create(data: Partial<IVoucherEntity>): Promise<IVoucherEntity> {
    const id = data._id || PostgresClient.generateId();
    const q = `
      INSERT INTO vouchers (
        _id, voucher_number, voucher_type, date, party_id, party_name, party_gstin,
        place_of_supply, is_inter_state, entries, items, sub_total, total_discount,
        total_taxable, cgst_total, sgst_total, igst_total, cess_total, round_off,
        total_amount, narration, status, cancellation_reason, financial_year,
        audit_trail, company_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, NOW(), NOW())
      RETURNING *
    `;
    const params = [
      id,
      data.voucherNumber,
      data.voucherType || 'Sales',
      data.date || new Date(),
      data.partyId || null,
      data.partyName || null,
      data.partyGstin || null,
      data.placeOfSupply || null,
      Boolean(data.isInterState),
      JSON.stringify(data.entries || []),
      JSON.stringify(data.items || []),
      data.subTotal || 0,
      data.totalDiscount || 0,
      data.totalTaxable || 0,
      data.cgstTotal || 0,
      data.sgstTotal || 0,
      data.igstTotal || 0,
      data.cessTotal || 0,
      data.roundOff || 0,
      data.totalAmount || 0,
      data.narration || null,
      data.status || 'Posted',
      data.cancellationReason || null,
      data.financialYear || '2025-2026',
      JSON.stringify(data.auditTrail || []),
      data.companyId,
    ];
    const res = await PostgresClient.query(q, params);
    return mapRow(res.rows[0]);
  }

  async update(id: string, data: Partial<IVoucherEntity>): Promise<IVoucherEntity | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const merged = { ...current, ...data };
    const q = `
      UPDATE vouchers SET
        voucher_number = $2,
        voucher_type = $3,
        date = $4,
        party_id = $5,
        party_name = $6,
        party_gstin = $7,
        place_of_supply = $8,
        is_inter_state = $9,
        entries = $10,
        items = $11,
        sub_total = $12,
        total_discount = $13,
        total_taxable = $14,
        cgst_total = $15,
        sgst_total = $16,
        igst_total = $17,
        cess_total = $18,
        round_off = $19,
        total_amount = $20,
        narration = $21,
        status = $22,
        cancellation_reason = $23,
        financial_year = $24,
        audit_trail = $25,
        updated_at = NOW()
      WHERE _id = $1
      RETURNING *
    `;
    const params = [
      id,
      merged.voucherNumber,
      merged.voucherType,
      merged.date,
      merged.partyId || null,
      merged.partyName || null,
      merged.partyGstin || null,
      merged.placeOfSupply || null,
      Boolean(merged.isInterState),
      JSON.stringify(merged.entries || []),
      JSON.stringify(merged.items || []),
      merged.subTotal,
      merged.totalDiscount,
      merged.totalTaxable,
      merged.cgstTotal,
      merged.sgstTotal,
      merged.igstTotal,
      merged.cessTotal,
      merged.roundOff,
      merged.totalAmount,
      merged.narration || null,
      merged.status,
      merged.cancellationReason || null,
      merged.financialYear,
      JSON.stringify(merged.auditTrail || []),
    ];
    const res = await PostgresClient.query(q, params);
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async cancel(id: string, reason?: string): Promise<IVoucherEntity | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const trail = current.auditTrail || [];
    trail.push({
      action: 'CANCELLED',
      timestamp: new Date(),
      user: 'Admin',
      details: reason || 'Voucher cancelled',
    });

    const res = await PostgresClient.query(
      `UPDATE vouchers SET
        status = 'Cancelled',
        cancellation_reason = $2,
        audit_trail = $3,
        updated_at = NOW()
      WHERE _id = $1
      RETURNING *`,
      [id, reason || 'Cancelled by user', JSON.stringify(trail)]
    );
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await PostgresClient.query('DELETE FROM vouchers WHERE _id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  async countByCompany(companyId: string): Promise<number> {
    const res = await PostgresClient.query('SELECT COUNT(*) FROM vouchers WHERE company_id = $1', [companyId]);
    return Number(res.rows[0].count);
  }
}
