import { PostgresClient } from './postgresClient';
import { IItemRepository, IItemEntity } from '../interfaces/IItemRepository';

const mapRow = (r: any): IItemEntity => {
  if (!r) return r;
  return {
    _id: r._id,
    name: r.name,
    itemType: r.item_type || 'Goods',
    hsnCode: r.hsn_code || undefined,
    sacCode: r.sac_code || undefined,
    uqc: r.uqc || 'PCS',
    unit: r.unit || undefined,
    category: r.category || undefined,
    description: r.description || undefined,
    purchaseRate: Number(r.purchase_rate) || 0,
    saleRate: Number(r.sale_rate) || 0,
    gstRate: Number(r.gst_rate) || 0,
    cessRate: Number(r.cess_rate) || 0,
    openingStock: Number(r.opening_stock) || 0,
    currentStock: Number(r.current_stock) || 0,
    reorderLevel: Number(r.reorder_level) || 0,
    barcode: r.barcode || undefined,
    companyId: r.company_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

export class PostgresItemRepository implements IItemRepository {
  async findByCompany(companyId: string): Promise<IItemEntity[]> {
    const res = await PostgresClient.query('SELECT * FROM items WHERE company_id = $1 ORDER BY name ASC', [companyId]);
    return res.rows.map(mapRow);
  }

  async findById(id: string): Promise<IItemEntity | null> {
    const res = await PostgresClient.query('SELECT * FROM items WHERE _id = $1', [id]);
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async create(data: Partial<IItemEntity>): Promise<IItemEntity> {
    const id = data._id || PostgresClient.generateId();
    const q = `
      INSERT INTO items (
        _id, name, item_type, hsn_code, sac_code, uqc, unit, category, description,
        purchase_rate, sale_rate, gst_rate, cess_rate, opening_stock, current_stock,
        reorder_level, barcode, company_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
      RETURNING *
    `;
    const params = [
      id,
      data.name,
      data.itemType || 'Goods',
      data.hsnCode || null,
      data.sacCode || null,
      data.uqc || 'PCS',
      data.unit || null,
      data.category || null,
      data.description || null,
      data.purchaseRate || 0,
      data.saleRate || 0,
      data.gstRate || 0,
      data.cessRate || 0,
      data.openingStock || 0,
      data.currentStock !== undefined ? data.currentStock : data.openingStock || 0,
      data.reorderLevel || 0,
      data.barcode || null,
      data.companyId,
    ];
    const res = await PostgresClient.query(q, params);
    return mapRow(res.rows[0]);
  }

  async update(id: string, data: Partial<IItemEntity>): Promise<IItemEntity | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const merged = { ...current, ...data };
    const q = `
      UPDATE items SET
        name = $2,
        item_type = $3,
        hsn_code = $4,
        sac_code = $5,
        uqc = $6,
        unit = $7,
        category = $8,
        description = $9,
        purchase_rate = $10,
        sale_rate = $11,
        gst_rate = $12,
        cess_rate = $13,
        opening_stock = $14,
        current_stock = $15,
        reorder_level = $16,
        barcode = $17,
        updated_at = NOW()
      WHERE _id = $1
      RETURNING *
    `;
    const params = [
      id,
      merged.name,
      merged.itemType || 'Goods',
      merged.hsnCode || null,
      merged.sacCode || null,
      merged.uqc || 'PCS',
      merged.unit || null,
      merged.category || null,
      merged.description || null,
      merged.purchaseRate,
      merged.saleRate,
      merged.gstRate,
      merged.cessRate,
      merged.openingStock,
      merged.currentStock,
      merged.reorderLevel,
      merged.barcode || null,
    ];
    const res = await PostgresClient.query(q, params);
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async updateStock(id: string, qtyDiff: number): Promise<IItemEntity | null> {
    const res = await PostgresClient.query(
      'UPDATE items SET current_stock = current_stock + $2, updated_at = NOW() WHERE _id = $1 RETURNING *',
      [id, qtyDiff]
    );
    return res.rows.length > 0 ? mapRow(res.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const res = await PostgresClient.query('DELETE FROM items WHERE _id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  async countByCompany(companyId: string): Promise<number> {
    const res = await PostgresClient.query('SELECT COUNT(*) FROM items WHERE company_id = $1', [companyId]);
    return Number(res.rows[0].count);
  }
}
