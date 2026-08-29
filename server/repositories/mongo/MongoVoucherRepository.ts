import { Voucher } from '../../models/Voucher';
import { IVoucherRepository, IVoucherEntity } from '../interfaces/IVoucherRepository';

const toEntity = (doc: any): IVoucherEntity => {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    ...obj,
    _id: String(obj._id),
    companyId: String(obj.companyId),
    partyId: obj.partyId ? String(obj.partyId) : undefined,
    entries: (obj.entries || []).map((e: any) => ({
      ...e,
      ledgerId: String(e.ledgerId || ''),
    })),
    items: (obj.items || []).map((it: any) => ({
      ...it,
      itemId: it.itemId ? String(it.itemId) : undefined,
    })),
  };
};

export class MongoVoucherRepository implements IVoucherRepository {
  async findByCompany(companyId: string, filter: any = {}): Promise<IVoucherEntity[]> {
    const query: any = { companyId, ...filter };
    const docs = await Voucher.find(query).sort({ date: -1, createdAt: -1 });
    return docs.map(toEntity);
  }

  async findById(id: string): Promise<IVoucherEntity | null> {
    const doc = await Voucher.findById(id);
    return doc ? toEntity(doc) : null;
  }

  async findByNumber(companyId: string, voucherNumber: string): Promise<IVoucherEntity | null> {
    const doc = await Voucher.findOne({ companyId, voucherNumber });
    return doc ? toEntity(doc) : null;
  }

  async create(data: Partial<IVoucherEntity>): Promise<IVoucherEntity> {
    const doc = new Voucher(data);
    const saved = await doc.save();
    return toEntity(saved);
  }

  async update(id: string, data: Partial<IVoucherEntity>): Promise<IVoucherEntity | null> {
    const doc = await Voucher.findByIdAndUpdate(id, { $set: data }, { new: true });
    return doc ? toEntity(doc) : null;
  }

  async cancel(id: string, reason?: string): Promise<IVoucherEntity | null> {
    const doc = await Voucher.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'Cancelled',
          cancellationReason: reason || 'Cancelled by user',
        },
        $push: {
          auditTrail: {
            action: 'CANCELLED',
            timestamp: new Date(),
            user: 'Admin',
            details: reason || 'Voucher cancelled',
          },
        },
      },
      { new: true }
    );
    return doc ? toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await Voucher.findByIdAndDelete(id);
    return Boolean(res);
  }

  async countByCompany(companyId: string): Promise<number> {
    return await Voucher.countDocuments({ companyId });
  }
}
