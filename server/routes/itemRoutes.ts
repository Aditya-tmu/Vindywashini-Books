import { Router } from 'express';
import { getRepositories } from '../repositories/factory';

const router = Router();

/**
 * GET /api/items - List inventory items for a company
 */
router.get('/', async (req, res) => {
  try {
    const { companyId, search, category } = req.query;
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'companyId is required' });
    }

    const repos = getRepositories();
    let items = await repos.items.findByCompany(String(companyId));

    if (category) {
      items = items.filter((it) => it.category === category);
    }
    if (search) {
      const q = String(search).toLowerCase();
      items = items.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          (it.barcode && it.barcode.toLowerCase().includes(q)) ||
          (it.hsnCode && it.hsnCode.toLowerCase().includes(q)) ||
          (it.sacCode && it.sacCode.toLowerCase().includes(q))
      );
    }

    res.json({ success: true, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/items/:id - Get single item
 */
router.get('/:id', async (req, res) => {
  try {
    const repos = getRepositories();
    const item = await repos.items.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Item not found' });
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/items - Create item in master
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      itemType,
      barcode,
      description,
      hsnCode,
      sacCode,
      uqc,
      purchaseRate,
      saleRate,
      gstRate,
      cessRate,
      openingStock,
      reorderLevel,
      category,
      unit,
      companyId,
    } = req.body;

    if (!name || !companyId) {
      return res.status(400).json({ success: false, error: 'Item name and companyId are required' });
    }

    const repos = getRepositories();
    const saved = await repos.items.create({
      name,
      itemType: itemType || 'Goods',
      barcode: barcode || '',
      description: description || '',
      hsnCode: hsnCode || '9983',
      sacCode: sacCode || '',
      uqc: uqc || 'PCS',
      purchaseRate: Number(purchaseRate) || 0,
      saleRate: Number(saleRate) || 0,
      gstRate: Number(gstRate) || 18,
      cessRate: Number(cessRate) || 0,
      openingStock: Number(openingStock) || 0,
      currentStock: Number(openingStock) || 0,
      reorderLevel: Number(reorderLevel) || 5,
      category: category || 'General',
      unit: unit || uqc || 'PCS',
      companyId,
    });

    res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/items/:id - Update item
 */
router.put('/:id', async (req, res) => {
  try {
    const repos = getRepositories();
    const updated = await repos.items.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Item not found' });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/items/:id - Delete item
 */
router.delete('/:id', async (req, res) => {
  try {
    const repos = getRepositories();
    await repos.items.delete(req.params.id);
    res.json({ success: true, message: 'Item deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
