import { Ledger } from '../../models/Ledger';
import { ILedgerRepository, ILedgerEntity } from '../interfaces/ILedgerRepository';

const toEntity = (doc: any): ILedgerEntity => {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    ...obj,
    _id: String(obj._id),
    companyId: String(obj.companyId),
  };
};

export class MongoLedgerRepository implements ILedgerRepository {
  async findByCompany(companyId: string): Promise<ILedgerEntity[]> {
    const docs = await Ledger.find({ companyId }).sort({ name: 1 });
    return docs.map(toEntity);
  }

  async findById(id: string): Promise<ILedgerEntity | null> {
    const doc = await Ledger.findById(id);
    return doc ? toEntity(doc) : null;
  }

  async findByName(companyId: string, name: string): Promise<ILedgerEntity | null> {
    const doc = await Ledger.findOne({ companyId, name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    return doc ? toEntity(doc) : null;
  }

  async create(data: Partial<ILedgerEntity>): Promise<ILedgerEntity> {
    const doc = new Ledger(data);
    const saved = await doc.save();
    return toEntity(saved);
  }

  async update(id: string, data: Partial<ILedgerEntity>): Promise<ILedgerEntity | null> {
    const doc = await Ledger.findByIdAndUpdate(id, { $set: data }, { new: true });
    return doc ? toEntity(doc) : null;
  }

  async updateBalance(id: string, amountDiff: number): Promise<ILedgerEntity | null> {
    const doc = await Ledger.findByIdAndUpdate(
      id,
      { $inc: { currentBalance: amountDiff } },
      { new: true }
    );
    return doc ? toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await Ledger.findByIdAndDelete(id);
    return Boolean(res);
  }

  async countByCompany(companyId: string): Promise<number> {
    return await Ledger.countDocuments({ companyId });
  }

  async createBulk(ledgers: Partial<ILedgerEntity>[]): Promise<ILedgerEntity[]> {
    const created = await Ledger.insertMany(ledgers);
    return created.map(toEntity);
  }
}
