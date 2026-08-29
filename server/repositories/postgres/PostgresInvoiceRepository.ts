import { PostgresClient } from './postgresClient';
import { IInvoiceRepository, IInvoiceEntity } from '../interfaces/IInvoiceRepository';

const mapRow = (r: any): IInvoiceEntity => {
  if (!r) return r;
  return {
    _id: r._id,
    invoiceNumber: r.invoice_number,
    voucherId: r.voucher_id || undefined,
    date: r.date,
    dueDate: r.due_date || undefined,
    customerId: r.customer_id || undefined,
    customerName: r.customer_name,
    customerGstin: r.customer_gstin || undefined,
    customerPhone: r.customer_phone || undefined,
    customerEmail: r.customer_email || undefined,
    billingAddress: typeof r.billing_address === 'string' ? JSON.parse(r.billing_address) : r.billing_address || {},
    shippingAddress: typeof r.shipping_address === 'string' ? JSON.parse(r.shipping_address) : r.shipping_address || {},
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
    templateUsed: r.template_used || 'A4',
    paymentMode: r.payment_mode || 'Cash',
    paymentStatus: r.payment_status || 'Paid',
    paidAmount: Number(r.paid_amount) || 0,
    balanceAmount: Number(r.balance_amount) || 0,
    pdfPath: r.pdf_path || undefined,
    cloudStoragePath: r.cloud_storage_path || undefined,
    signedUrl: r.signed_url || undefined,
    signedUrlExpiresAt: r.signed_url_expires_at || undefined,
    cloudUploadStatus: r.cloud_upload_status || 'not_configured',
    cloudUploadError: r.cloud_upload_error || undefined,
    notes: r.notes || undefined,
    terms: r.terms || undefined,
    bankDetailsSnapshot: typeof r.bank_details_snapshot === 'string' ? JSON.parse(r.bank_details_snapshot) : r.bank_details_snapshot || {},
    companyId: r.company_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

export class PostgresInvoiceRepository implements IInvoiceRepository {
  async findByCompany(companyId: string, filter: any = {}): Promise<IInvoiceEntity[]> {
    let q = 'SELECT * FROM invoices WHERE company_id = $1';
    const params: any[] = [companyId];
    let idx = 2;

    if (filter.customerId) {
      q += ` AND customer_id = $${idx++}`;
      params.push(filter.customerId);
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

  async findByParty(companyId: string, partyId: string, filter: any = {}): Promise<IInvoiceEntity[]> {
    let q = 'SELECT * FROM invoices WHERE company_id = $1 AND customer_id = $2';
    const params: any[] = [companyId, partyId];
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

  async getPartyGstSummary(
    companyId: string,
    partyId: string,
    filter: { startDate?: Date; endDate?: Date } = {}
  ): Promise<any> {
    const invoices = await this.findByParty(companyId, partyId, filter);

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalCess = 0;
    let totalTax = 0;
    let totalRoundOff = 0;
    let grandTotal = 0;

    for (const inv of invoices) {
      totalTaxable += Number(inv.totalTaxable || 0);
      totalCgst += Number(inv.cgstTotal || 0);
      totalSgst += Number(inv.sgstTotal || 0);
      totalIgst += Number(inv.igstTotal || 0);
      totalCess += Number(inv.cessTotal || 0);
      totalRoundOff += Number(inv.roundOff || 0);
      grandTotal += Number(inv.grandTotal || 0);
    }
    totalTax = totalCgst + totalSgst + totalIgst + totalCess;

    return {
      partyId,
      totalTaxable: Math.round(totalTaxable * 100) / 100,
      totalCgst: Math.round(totalCgst * 100) / 100,
      totalSgst: Math.round(totalSgst * 100) / 100,
      totalIgst: Math.round(totalIgst * 100) / 100,
      totalCess: Math.round(totalCess * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalRoundOff: Math.round(totalRoundOff * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      invoiceCount: invoices.length,
      invoices,
    };
  }

  async findById(id: string): Promise<IInvoiceEntity | null> {
    const res = await PostgresClient.query('SELECT * FROM invoices WHERE _id = $1', [id]);
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async findByNumber(companyId: string, invoiceNumber: string): Promise<IInvoiceEntity | null> {
    const res = await PostgresClient.query(
      'SELECT * FROM invoices WHERE company_id = $1 AND invoice_number = $2 LIMIT 1',
      [companyId, invoiceNumber]
    );
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }


  async create(data: Partial<IInvoiceEntity>): Promise<IInvoiceEntity> {
    const id = data._id || PostgresClient.generateId();
    const q = `
      INSERT INTO invoices (
        _id, invoice_number, voucher_id, date, due_date, customer_id, customer_name,
        customer_gstin, customer_phone, customer_email, billing_address, shipping_address,
        place_of_supply, is_inter_state, reverse_charge, items, tax_summary, sub_total,
        total_discount, total_taxable, cgst_total, sgst_total, igst_total, cess_total,
        round_off, grand_total, amount_in_words, template_used, payment_mode, payment_status,
        paid_amount, balance_amount, pdf_path, cloud_storage_path, signed_url, signed_url_expires_at,
        cloud_upload_status, cloud_upload_error, notes, terms, bank_details_snapshot, company_id,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, NOW(), NOW())
      RETURNING *
    `;
    const params = [
      id,
      data.invoiceNumber,
      data.voucherId || null,
      data.date || new Date(),
      data.dueDate || null,
      data.customerId || null,
      data.customerName,
      data.customerGstin || null,
      data.customerPhone || null,
      data.customerEmail || null,
      JSON.stringify(data.billingAddress || {}),
      JSON.stringify(data.shippingAddress || {}),
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
      data.templateUsed || 'A4',
      data.paymentMode || 'Cash',
      data.paymentStatus || 'Paid',
      data.paidAmount || 0,
      data.balanceAmount || 0,
      data.pdfPath || null,
      data.cloudStoragePath || null,
      data.signedUrl || null,
      data.signedUrlExpiresAt || null,
      data.cloudUploadStatus || 'not_configured',
      data.cloudUploadError || null,
      data.notes || null,
      data.terms || null,
      JSON.stringify(data.bankDetailsSnapshot || {}),
      data.companyId,
    ];
    const res = await PostgresClient.query(q, params);
    return mapRow(res.rows[0]);
  }

  async update(id: string, data: Partial<IInvoiceEntity>): Promise<IInvoiceEntity | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const merged = { ...current, ...data };
    const q = `
      UPDATE invoices SET
        invoice_number = $2,
        voucher_id = $3,
        date = $4,
        due_date = $5,
        customer_id = $6,
        customer_name = $7,
        customer_gstin = $8,
        customer_phone = $9,
        customer_email = $10,
        billing_address = $11,
        shipping_address = $12,
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
        template_used = $28,
        payment_mode = $29,
        payment_status = $30,
        paid_amount = $31,
        balance_amount = $32,
        pdf_path = $33,
        cloud_storage_path = $34,
        signed_url = $35,
        signed_url_expires_at = $36,
        cloud_upload_status = $37,
        cloud_upload_error = $38,
        notes = $39,
        terms = $40,
        bank_details_snapshot = $41,
        updated_at = NOW()
      WHERE _id = $1
      RETURNING *
    `;
    const params = [
      id,
      merged.invoiceNumber,
      merged.voucherId || null,
      merged.date,
      merged.dueDate || null,
      merged.customerId || null,
      merged.customerName,
      merged.customerGstin || null,
      merged.customerPhone || null,
      merged.customerEmail || null,
      JSON.stringify(merged.billingAddress || {}),
      JSON.stringify(merged.shippingAddress || {}),
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
      merged.templateUsed,
      merged.paymentMode,
      merged.paymentStatus,
      merged.paidAmount,
      merged.balanceAmount,
      merged.pdfPath || null,
      merged.cloudStoragePath || null,
      merged.signedUrl || null,
      merged.signedUrlExpiresAt || null,
      merged.cloudUploadStatus || 'not_configured',
      merged.cloudUploadError || null,
      merged.notes || null,
      merged.terms || null,
      JSON.stringify(merged.bankDetailsSnapshot || {}),
    ];
    const res = await PostgresClient.query(q, params);
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await PostgresClient.query('DELETE FROM invoices WHERE _id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  async countByCompany(companyId: string): Promise<number> {
    const res = await PostgresClient.query('SELECT COUNT(*) FROM invoices WHERE company_id = $1', [companyId]);
    return Number(res.rows[0].count);
  }
}
