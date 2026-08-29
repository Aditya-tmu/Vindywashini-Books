import { Company } from '../../models/Company';
import { ICompanyRepository, ICompanyEntity } from '../interfaces/ICompanyRepository';

const toEntity = (doc: any): ICompanyEntity => {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    ...obj,
    _id: String(obj._id),
  };
};

export class MongoCompanyRepository implements ICompanyRepository {
  async findAll(): Promise<ICompanyEntity[]> {
    const docs = await Company.find().sort({ createdAt: -1 });
    return docs.map(toEntity);
  }

  async findById(id: string): Promise<ICompanyEntity | null> {
    const doc = await Company.findById(id);
    return doc ? toEntity(doc) : null;
  }

  async findOne(filter: any = {}): Promise<ICompanyEntity | null> {
    const doc = await Company.findOne(filter);
    return doc ? toEntity(doc) : null;
  }

  async create(data: Partial<ICompanyEntity>): Promise<ICompanyEntity> {
    const doc = new Company(data);
    const saved = await doc.save();
    return toEntity(saved);
  }

  async update(id: string, data: Partial<ICompanyEntity>): Promise<ICompanyEntity | null> {
    const doc = await Company.findByIdAndUpdate(id, { $set: data }, { new: true });
    return doc ? toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await Company.findByIdAndDelete(id);
    return Boolean(res);
  }

  async incrementInvoiceSeq(id: string): Promise<number> {
    const comp = await Company.findByIdAndUpdate(
      id,
      { $inc: { invoiceNumberSeq: 1 } },
      { new: true }
    );
    return comp ? comp.invoiceNumberSeq : 1;
  }

  async count(): Promise<number> {
    return await Company.countDocuments();
  }
}
