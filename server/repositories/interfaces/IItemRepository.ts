export interface IItemEntity {
  _id: string;
  name: string;
  itemType?: 'Goods' | 'Service';
  hsnCode?: string;
  sacCode?: string;
  uqc: string;
  unit?: string;
  category?: string;
  description?: string;
  purchaseRate: number;
  saleRate: number;
  gstRate: number;
  cessRate?: number;
  openingStock: number;
  currentStock: number;
  reorderLevel?: number;
  barcode?: string;
  companyId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IItemRepository {
  findByCompany(companyId: string): Promise<IItemEntity[]>;
  findById(id: string): Promise<IItemEntity | null>;
  create(data: Partial<IItemEntity>): Promise<IItemEntity>;
  update(id: string, data: Partial<IItemEntity>): Promise<IItemEntity | null>;
  updateStock(id: string, qtyDiff: number): Promise<IItemEntity | null>;
  delete(id: string): Promise<boolean>;
  countByCompany(companyId: string): Promise<number>;
}
