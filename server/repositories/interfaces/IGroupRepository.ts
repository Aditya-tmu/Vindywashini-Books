export interface IGroupEntity {
  _id: string;
  name: string;
  parentName?: string;
  nature: 'Assets' | 'Liabilities' | 'Income' | 'Expenses';
  isPrimary?: boolean;
  companyId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IGroupRepository {
  findByCompany(companyId: string): Promise<IGroupEntity[]>;
  create(data: Partial<IGroupEntity>): Promise<IGroupEntity>;
  countByCompany(companyId: string): Promise<number>;
  createBulk(groups: Partial<IGroupEntity>[]): Promise<IGroupEntity[]>;
}
