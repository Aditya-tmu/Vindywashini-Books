import { Item } from '../../models/Item';
import { IItemRepository, IItemEntity } from '../interfaces/IItemRepository';

const toEntity = (doc: any): IItemEntity => {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    ...obj,
    _id: String(obj._id),
    companyId: String(obj.companyId),
  };
};

export class MongoItemRepository implements IItemRepository {
  async findByCompany(companyId: string): Promise<IItemEntity[]> {
    const docs = await Item.find({ companyId }).sort({ name: 1 });
    return docs.map(toEntity);
  }

  async findById(id: string): Promise<IItemEntity | null> {
    const doc = await Item.findById(id);
    return doc ? toEntity(doc) : null;
  }

  async create(data: Partial<IItemEntity>): Promise<IItemEntity> {
    const doc = new Item(data);
    const saved = await doc.save();
    return toEntity(saved);
  }

  async update(id: string, data: Partial<IItemEntity>): Promise<IItemEntity | null> {
    const doc = await Item.findByIdAndUpdate(id, { $set: data }, { new: true });
    return doc ? toEntity(doc) : null;
  }

  async updateStock(id: string, qtyDiff: number): Promise<IItemEntity | null> {
    const doc = await Item.findByIdAndUpdate(
      id,
      { $inc: { currentStock: qtyDiff } },
      { new: true }
    );
    return doc ? toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await Item.findByIdAndDelete(id);
    return Boolean(res);
  }

  async countByCompany(companyId: string): Promise<number> {
    return await Item.countDocuments({ companyId });
  }
}
