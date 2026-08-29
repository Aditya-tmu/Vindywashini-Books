import { Invoice } from '../../models/Invoice';
import { IInvoiceRepository, IInvoiceEntity } from '../interfaces/IInvoiceRepository';

const toEntity = (doc: any): IInvoiceEntity => {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    ...obj,
    _id: String(obj._id),
    companyId: String(obj.companyId),
    voucherId: obj.voucherId ? String(obj.voucherId) : undefined,
    customerId: obj.customerId ? String(obj.customerId) : undefined,
    items: (obj.items || []).map((it: any) => ({
      ...it,
      itemId: it.itemId ? String(it.itemId) : undefined,
    })),
  };
};

export class MongoInvoiceRepository implements IInvoiceRepository {
  async findByCompany(companyId: string, filter: any = {}): Promise<IInvoiceEntity[]> {
    const query: any = { companyId, ...filter };
    const docs = await Invoice.find(query).sort({ date: -1, createdAt: -1 });
    return docs.map(toEntity);
  }

  async findById(id: string): Promise<IInvoiceEntity | null> {
    const doc = await Invoice.findById(id);
    return doc ? toEntity(doc) : null;
  }

  async findByNumber(companyId: string, invoiceNumber: string): Promise<IInvoiceEntity | null> {
    const doc = await Invoice.findOne({ companyId, invoiceNumber });
    return doc ? toEntity(doc) : null;
  }

  async findByParty(companyId: string, partyId: string, filter: any = {}): Promise<IInvoiceEntity[]> {
    const query: any = {
      companyId,
      customerId: partyId,
      ...filter,
    };
    const docs = await Invoice.find(query).sort({ date: -1, createdAt: -1 });
    return docs.map(toEntity);
  }

  async getPartyGstSummary(
    companyId: string,
    partyId: string,
    filter: { startDate?: Date; endDate?: Date } = {}
  ): Promise<any> {
    const query: any = {
      companyId,
      customerId: partyId,
    };
    if (filter.startDate || filter.endDate) {
      query.date = {};
      if (filter.startDate) query.date.$gte = filter.startDate;
      if (filter.endDate) query.date.$lte = filter.endDate;
    }

    const docs = await Invoice.find(query).sort({ date: -1, createdAt: -1 });
    const invoices = docs.map(toEntity);

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalCess = 0;
    let totalRoundOff = 0;
    let grandTotal = 0;

    for (const inv of invoices) {
      totalTaxable += Number(inv.totalTaxable ?? (inv as any).taxableAmount ?? 0);
      totalCgst += Number(inv.cgstTotal ?? (inv as any).totalCgst ?? 0);
      totalSgst += Number(inv.sgstTotal ?? (inv as any).totalSgst ?? 0);
      totalIgst += Number(inv.igstTotal ?? (inv as any).totalIgst ?? 0);
      totalCess += Number(inv.cessTotal || 0);
      totalRoundOff += Number(inv.roundOff || 0);
      grandTotal += Number(inv.grandTotal || 0);
    }
    const totalTax = totalCgst + totalSgst + totalIgst + totalCess;

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

  async create(data: Partial<IInvoiceEntity>): Promise<IInvoiceEntity> {
    const doc = new Invoice(data);
    const saved = await doc.save();
    return toEntity(saved);
  }

  async update(id: string, data: Partial<IInvoiceEntity>): Promise<IInvoiceEntity | null> {
    const doc = await Invoice.findByIdAndUpdate(id, { $set: data }, { new: true });
    return doc ? toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await Invoice.findByIdAndDelete(id);
    return Boolean(res);
  }

  async countByCompany(companyId: string): Promise<number> {
    return await Invoice.countDocuments({ companyId });
  }
}

