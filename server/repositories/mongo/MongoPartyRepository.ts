import { Party } from '../../models/Party';
import { IPartyRepository, IPartyEntity } from '../interfaces/IPartyRepository';

const toEntity = (doc: any): IPartyEntity => {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    ...obj,
    _id: String(obj._id),
    companyId: String(obj.companyId),
  };
};

export class MongoPartyRepository implements IPartyRepository {
  async findByCompany(companyId: string, type?: string): Promise<IPartyEntity[]> {
    const filter: any = { companyId };
    if (type) filter.type = type;
    const docs = await Party.find(filter).sort({ name: 1 });
    return docs.map(toEntity);
  }

  async findById(id: string): Promise<IPartyEntity | null> {
    const doc = await Party.findById(id);
    return doc ? toEntity(doc) : null;
  }

  async findByName(companyId: string, name: string): Promise<IPartyEntity | null> {
    const doc = await Party.findOne({
      companyId,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });
    return doc ? toEntity(doc) : null;
  }

  async create(data: Partial<IPartyEntity>): Promise<IPartyEntity> {
    const doc = new Party(data);
    const saved = await doc.save();
    return toEntity(saved);
  }

  async update(id: string, data: Partial<IPartyEntity>): Promise<IPartyEntity | null> {
    const doc = await Party.findByIdAndUpdate(id, { $set: data }, { new: true });
    return doc ? toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await Party.findByIdAndDelete(id);
    return Boolean(res);
  }

  async countByCompany(companyId: string): Promise<number> {
    return await Party.countDocuments({ companyId });
  }
}
