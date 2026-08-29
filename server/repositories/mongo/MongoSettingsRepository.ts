import { Settings } from '../../models/Settings';
import { ISettingsRepository, ISettingsEntity } from '../interfaces/ISettingsRepository';

const toEntity = (doc: any): ISettingsEntity => {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    ...obj,
    _id: String(obj._id),
    companyId: obj.companyId ? String(obj.companyId) : undefined,
  };
};

export class MongoSettingsRepository implements ISettingsRepository {
  async getSettings(companyId?: string): Promise<ISettingsEntity | null> {
    let doc = null;
    if (companyId) {
      doc = await Settings.findOne({ companyId });
    }
    if (!doc) {
      doc = await Settings.findOne();
    }
    return doc ? toEntity(doc) : null;
  }

  async updateSettings(companyId: string | undefined, data: Partial<ISettingsEntity>): Promise<ISettingsEntity> {
    const filter = companyId ? { companyId } : {};
    const doc = await Settings.findOneAndUpdate(filter, { $set: data }, { new: true, upsert: true });
    return toEntity(doc);
  }
}
