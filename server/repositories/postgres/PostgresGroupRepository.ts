import { PostgresClient } from './postgresClient';
import { IGroupRepository, IGroupEntity } from '../interfaces/IGroupRepository';

const mapRow = (r: any): IGroupEntity => {
  if (!r) return r;
  return {
    _id: r._id,
    name: r.name,
    parentName: r.parent_name || undefined,
    nature: r.nature,
    isPrimary: Boolean(r.is_primary),
    companyId: r.company_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

export class PostgresGroupRepository implements IGroupRepository {
  async findByCompany(companyId: string): Promise<IGroupEntity[]> {
    const res = await PostgresClient.query('SELECT * FROM groups WHERE company_id = $1 ORDER BY name ASC', [companyId]);
    return res.rows.map(mapRow);
  }

  async create(data: Partial<IGroupEntity>): Promise<IGroupEntity> {
    const id = data._id || PostgresClient.generateId();
    const q = `
      INSERT INTO groups (_id, name, parent_name, nature, is_primary, company_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;
    const params = [
      id,
      data.name,
      data.parentName || null,
      data.nature,
      Boolean(data.isPrimary),
      data.companyId,
    ];
    const res = await PostgresClient.query(q, params);
    return mapRow(res.rows[0]);
  }

  async countByCompany(companyId: string): Promise<number> {
    const res = await PostgresClient.query('SELECT COUNT(*) FROM groups WHERE company_id = $1', [companyId]);
    return Number(res.rows[0].count);
  }

  async createBulk(groups: Partial<IGroupEntity>[]): Promise<IGroupEntity[]> {
    const results: IGroupEntity[] = [];
    for (const g of groups) {
      results.push(await this.create(g));
    }
    return results;
  }
}
