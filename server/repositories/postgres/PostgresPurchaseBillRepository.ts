import { PostgresClient } from './postgresClient';
import { IPurchaseBillRepository, IPurchaseBillEntity } from '../interfaces/IPurchaseBillRepository';

const mapRow = (r: any): IPurchaseBillEntity => {
  if (!r) return r;
  return {
    _id: r._id,
    billNumber: r.bill_number,
    supplierInvoiceNumber: r.supplier_invoice_number,
    supplierInvoiceDate: r.supplier_invoice_date,
    date: r.date,
    dueDate: r.due_date || undefined,
    supplierId: r.supplier_id || undefined,
    supplierName: r.supplier_name,
    supplierGstin: r.supplier_gstin || undefined,
    supplierPhone: r.supplier_phone || undefined,
    supplierEmail: r.supplier_email || undefined,
    supplierAddress: typeof r.supplier_address === 'string' ? JSON.parse(r.supplier_address) : r.supplier_address || {},
    placeOfSupply: r.place_of_supply,
    isInterState: Boolean(r.is_inter_state),
    reverseCharge: Boolean(r.reverse_charge),
    items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items || [],
    taxSummary: typeof r.tax_summary === 'string' ? JSON.parse(r.tax_summary) : r.tax_summary || [],
    subTotal: Number(r.sub_total) || 0,
    totalDiscount: Number(r.total_discount) || 0,
    totalTaxable: Number(r.total_taxable) || 0,
    cgstTotal: Number(r.cgst_total) || 0,
    sgstTotal: Number(r.sgst_total) || 0,
    igstTotal: Number(r.igst_total) || 0,
    cessTotal: Number(r.cess_total) || 0,
    roundOff: Number(r.round_off) || 0,
    grandTotal: Number(r.grand_total) || 0,
    amountInWords: r.amount_in_words || undefined,
    voucherId: r.voucher_id || undefined,
    paymentMode: r.payment_mode || 'Cash',
    paymentStatus: r.payment_status || 'Paid',
    paidAmount: Number(r.paid_amount) || 0,
    balanceAmount: Number(r.balance_amount) || 0,
    bankCharges: Number(r.bank_charges) || 0,
    notes: r.notes || undefined,
    financialYear: r.financial_year || '2025-2026',
    companyId: r.company_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

export class PostgresPurchaseBillRepository implements IPurchaseBillRepository {
  async findByCompany(companyId: string, filter: any = {}): Promise<IPurchaseBillEntity[]> {
    let q = 'SELECT * FROM purchase_bills WHERE company_id = $1';
    const params: any[] = [companyId];
    let idx = 2;

    if (filter.supplierId) {
      q += ` AND supplier_id = $${idx++}`;
      params.push(filter.supplierId);
    }
    if (filter.paymentStatus) {
      q += ` AND payment_status = $${idx++}`;
      params.push(filter.paymentStatus);
    }
    if (filter.startDate && filter.endDate) {
      q += ` AND date >= $${idx++} AND date <= $${idx++}`;
      params.push(filter.startDate, filter.endDate);
    }

    q += ' ORDER BY date DESC, created_at DESC';
    const res = await PostgresClient.query(q, params);
    return res.rows.map(mapRow);
  }

  async findByParty(companyId: string, supplierId: string, filter: any = {}): Promise<IPurchaseBillEntity[]> {
    let q = 'SELECT * FROM purchase_bills WHERE company_id = $1 AND supplier_id = $2';
    const params: any[] = [companyId, supplierId];
    let idx = 3;

    if (filter.startDate && filter.endDate) {
      q += ` AND date >= $${idx++} AND date <= $${idx++}`;
      params.push(filter.startDate, filter.endDate);
    } else if (filter.startDate) {
      q += ` AND date >= $${idx++}`;
      params.push(filter.startDate);
    } else if (filter.endDate) {
      q += ` AND date <= $${idx++}`;
      params.push(filter.endDate);
    }

    q += ' ORDER BY date DESC, created_at DESC';
    const res = await PostgresClient.query(q, params);
    return res.rows.map(mapRow);
  }

  async getPartyPurchaseSummary(
    companyId: string,
    supplierId: string,
    filter: { startDate?: Date; endDate?: Date } = {}
  ): Promise<any> {
    const purchases = await this.findByParty(companyId, supplierId, filter);

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalCess = 0;
    let totalTax = 0;
    let totalRoundOff = 0;
    let grandTotal = 0;

    for (const p of purchases) {
      totalTaxable += Number(p.totalTaxable || 0);
      totalCgst += Number(p.cgstTotal || 0);
      totalSgst += Number(p.sgstTotal || 0);
      totalIgst += Number(p.igstTotal || 0);
      totalCess += Number(p.cessTotal || 0);
      totalRoundOff += Number(p.roundOff || 0);
      grandTotal += Number(p.grandTotal || 0);
    }
    totalTax = totalCgst + totalSgst + totalIgst + totalCess;

    return {
      supplierId,
      totalTaxable: Math.round(totalTaxable * 100) / 100,
      totalCgst: Math.round(totalCgst * 100) / 100,
      totalSgst: Math.round(totalSgst * 100) / 100,
      totalIgst: Math.round(totalIgst * 100) / 100,
      totalCess: Math.round(totalCess * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalRoundOff: Math.round(totalRoundOff * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      billCount: purchases.length,
      purchases,
    };
  }

  async findById(id: string): Promise<IPurchaseBillEntity | null> {
    const res = await PostgresClient.query('SELECT * FROM purchase_bills WHERE _id = $1', [id]);
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async findByNumber(companyId: string, billNumber: string): Promise<IPurchaseBillEntity | null> {
    const res = await PostgresClient.query(
      'SELECT * FROM purchase_bills WHERE company_id = $1 AND bill_number = $2 LIMIT 1',
      [companyId, billNumber]
    );
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }


  async create(data: Partial<IPurchaseBillEntity>): Promise<IPurchaseBillEntity> {
    const id = data._id || PostgresClient.generateId();
    const q = `
      INSERT INTO purchase_bills (
        _id, bill_number, supplier_invoice_number, supplier_invoice_date, date, due_date,
        supplier_id, supplier_name, supplier_gstin, supplier_phone, supplier_email,
        supplier_address, place_of_supply, is_inter_state, reverse_charge, items, tax_summary,
        sub_total, total_discount, total_taxable, cgst_total, sgst_total, igst_total, cess_total,
        round_off, grand_total, amount_in_words, voucher_id, payment_mode, payment_status,
        paid_amount, balance_amount, bank_charges, notes, financial_year, company_id,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, NOW(), NOW())
      RETURNING *
    `;
    const params = [
      id,
      data.billNumber,
      data.supplierInvoiceNumber,
      data.supplierInvoiceDate || new Date(),
      data.date || new Date(),
      data.dueDate || null,
      data.supplierId || null,
      data.supplierName,
      data.supplierGstin || null,
      data.supplierPhone || null,
      data.supplierEmail || null,
      JSON.stringify(data.supplierAddress || {}),
      data.placeOfSupply,
      Boolean(data.isInterState),
      Boolean(data.reverseCharge),
      JSON.stringify(data.items || []),
      JSON.stringify(data.taxSummary || []),
      data.subTotal || 0,
      data.totalDiscount || 0,
      data.totalTaxable || 0,
      data.cgstTotal || 0,
      data.sgstTotal || 0,
      data.igstTotal || 0,
      data.cessTotal || 0,
      data.roundOff || 0,
      data.grandTotal || 0,
      data.amountInWords || null,
      data.voucherId || null,
      data.paymentMode || 'Cash',
      data.paymentStatus || 'Paid',
      data.paidAmount || 0,
      data.balanceAmount || 0,
      data.bankCharges || 0,
      data.notes || null,
      data.financialYear || '2025-2026',
      data.companyId,
    ];
    const res = await PostgresClient.query(q, params);
    return mapRow(res.rows[0]);
  }

  async update(id: string, data: Partial<IPurchaseBillEntity>): Promise<IPurchaseBillEntity | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const merged = { ...current, ...data };
    const q = `
      UPDATE purchase_bills SET
        bill_number = $2,
        supplier_invoice_number = $3,
        supplier_invoice_date = $4,
        date = $5,
        due_date = $6,
        supplier_id = $7,
        supplier_name = $8,
        supplier_gstin = $9,
        supplier_phone = $10,
        supplier_email = $11,
        supplier_address = $12,
        place_of_supply = $13,
        is_inter_state = $14,
        reverse_charge = $15,
        items = $16,
        tax_summary = $17,
        sub_total = $18,
        total_discount = $19,
        total_taxable = $20,
        cgst_total = $21,
        sgst_total = $22,
        igst_total = $23,
        cess_total = $24,
        round_off = $25,
        grand_total = $26,
        amount_in_words = $27,
        voucher_id = $28,
        payment_mode = $29,
        payment_status = $30,
        paid_amount = $31,
        balance_amount = $32,
        bank_charges = $33,
        notes = $34,
        financial_year = $35,
        updated_at = NOW()
      WHERE _id = $1
      RETURNING *
    `;
    const params = [
      id,
      merged.billNumber,
      merged.supplierInvoiceNumber,
      merged.supplierInvoiceDate,
      merged.date,
      merged.dueDate || null,
      merged.supplierId || null,
      merged.supplierName,
      merged.supplierGstin || null,
      merged.supplierPhone || null,
      merged.supplierEmail || null,
      JSON.stringify(merged.supplierAddress || {}),
      merged.placeOfSupply,
      Boolean(merged.isInterState),
      Boolean(merged.reverseCharge),
      JSON.stringify(merged.items || []),
      JSON.stringify(merged.taxSummary || []),
      merged.subTotal,
      merged.totalDiscount,
      merged.totalTaxable,
      merged.cgstTotal,
      merged.sgstTotal,
      merged.igstTotal,
      merged.cessTotal,
      merged.roundOff,
      merged.grandTotal,
      merged.amountInWords || null,
      merged.voucherId || null,
      merged.paymentMode,
      merged.paymentStatus,
      merged.paidAmount,
      merged.balanceAmount,
      merged.bankCharges,
      merged.notes || null,
      merged.financialYear,
    ];
    const res = await PostgresClient.query(q, params);
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await PostgresClient.query('DELETE FROM purchase_bills WHERE _id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  async countByCompany(companyId: string): Promise<number> {
    const res = await PostgresClient.query('SELECT COUNT(*) FROM purchase_bills WHERE company_id = $1', [companyId]);
    return Number(res.rows[0].count);
  }
}
