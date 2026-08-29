import { PurchaseBill } from '../../models/PurchaseBill';
import { IPurchaseBillRepository, IPurchaseBillEntity } from '../interfaces/IPurchaseBillRepository';

const toEntity = (doc: any): IPurchaseBillEntity => {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    ...obj,
    _id: String(obj._id),
    companyId: String(obj.companyId),
    supplierId: obj.supplierId ? String(obj.supplierId) : undefined,
    voucherId: obj.voucherId ? String(obj.voucherId) : undefined,
    items: (obj.items || []).map((it: any) => ({
      ...it,
      itemId: it.itemId ? String(it.itemId) : undefined,
    })),
  };
};

export class MongoPurchaseBillRepository implements IPurchaseBillRepository {
  async findByCompany(companyId: string, filter: any = {}): Promise<IPurchaseBillEntity[]> {
    const query: any = { companyId, ...filter };
    const docs = await PurchaseBill.find(query).sort({ date: -1, createdAt: -1 });
    return docs.map(toEntity);
  }

  async findById(id: string): Promise<IPurchaseBillEntity | null> {
    const doc = await PurchaseBill.findById(id);
    return doc ? toEntity(doc) : null;
  }

  async findByNumber(companyId: string, billNumber: string): Promise<IPurchaseBillEntity | null> {
    const doc = await PurchaseBill.findOne({ companyId, billNumber });
    return doc ? toEntity(doc) : null;
  }

  async findByParty(companyId: string, supplierId: string, filter: any = {}): Promise<IPurchaseBillEntity[]> {
    const query: any = {
      companyId,
      supplierId,
      ...filter,
    };
    const docs = await PurchaseBill.find(query).sort({ date: -1, createdAt: -1 });
    return docs.map(toEntity);
  }

  async getPartyPurchaseSummary(
    companyId: string,
    supplierId: string,
    filter: { startDate?: Date; endDate?: Date } = {}
  ): Promise<any> {
    const query: any = {
      companyId,
      supplierId,
    };
    if (filter.startDate || filter.endDate) {
      query.date = {};
      if (filter.startDate) query.date.$gte = filter.startDate;
      if (filter.endDate) query.date.$lte = filter.endDate;
    }

    const docs = await PurchaseBill.find(query).sort({ date: -1, createdAt: -1 });
    const purchases = docs.map(toEntity);

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalCess = 0;
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
    const totalTax = totalCgst + totalSgst + totalIgst + totalCess;

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

  async create(data: Partial<IPurchaseBillEntity>): Promise<IPurchaseBillEntity> {
    const doc = new PurchaseBill(data);
    const saved = await doc.save();
    return toEntity(saved);
  }

  async update(id: string, data: Partial<IPurchaseBillEntity>): Promise<IPurchaseBillEntity | null> {
    const doc = await PurchaseBill.findByIdAndUpdate(id, { $set: data }, { new: true });
    return doc ? toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await PurchaseBill.findByIdAndDelete(id);
    return Boolean(res);
  }

  async countByCompany(companyId: string): Promise<number> {
    return await PurchaseBill.countDocuments({ companyId });
  }
}

