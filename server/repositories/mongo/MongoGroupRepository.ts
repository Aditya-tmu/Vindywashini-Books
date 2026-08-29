import { Group } from '../../models/Group';
import { IGroupRepository, IGroupEntity } from '../interfaces/IGroupRepository';

const toEntity = (doc: any): IGroupEntity => {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    ...obj,
    _id: String(obj._id),
    companyId: String(obj.companyId),
  };
};

export class MongoGroupRepository implements IGroupRepository {
  async findByCompany(companyId: string): Promise<IGroupEntity[]> {
    const docs = await Group.find({ companyId });
    return docs.map(toEntity);
  }

  async create(data: Partial<IGroupEntity>): Promise<IGroupEntity> {
    const doc = new Group(data);
    const saved = await doc.save();
    return toEntity(saved);
  }

  async countByCompany(companyId: string): Promise<number> {
    return await Group.countDocuments({ companyId });
  }

  async createBulk(groups: Partial<IGroupEntity>[]): Promise<IGroupEntity[]> {
    const created = await Group.insertMany(groups);
    return created.map(toEntity);
  }
}
