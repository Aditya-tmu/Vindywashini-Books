import { Router } from 'express';
import { getRepositories } from '../repositories/factory';

const router = Router();

/**
 * GET /api/ledgers - List ledgers for a company
 */
router.get('/', async (req, res) => {
  try {
    const { companyId, groupName, search } = req.query;
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'companyId query param is required' });
    }

    const repos = getRepositories();
    let ledgers = await repos.ledgers.findByCompany(String(companyId));

    if (groupName) {
      ledgers = ledgers.filter((l) => l.groupName === groupName);
    }
    if (search) {
      const q = String(search).toLowerCase();
      ledgers = ledgers.filter((l) => l.name.toLowerCase().includes(q) || l.groupName.toLowerCase().includes(q));
    }

    res.json({ success: true, data: ledgers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/ledgers/groups - List Groups (Chart of Accounts tree)
 */
router.get('/groups', async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'companyId is required' });
    }

    const repos = getRepositories();
    const groups = await repos.groups.findByCompany(String(companyId));
    res.json({ success: true, data: groups });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/ledgers - Create Ledger
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      groupName,
      nature,
      openingBalance,
      openingType,
      gstin,
      pan,
      address,
      state,
      stateCode,
      phone,
      email,
      companyId,
    } = req.body;

    if (!name || !groupName || !companyId) {
      return res.status(400).json({ success: false, error: 'Name, groupName, and companyId are required' });
    }

    const repos = getRepositories();
    let finalNature = nature;
    if (!finalNature) {
      const groups = await repos.groups.findByCompany(companyId);
      const parent = groups.find((g) => g.name === groupName);
      finalNature = parent?.nature || 'Assets';
    }

    const saved = await repos.ledgers.create({
      name,
      groupName,
      nature: finalNature,
      openingBalance: Number(openingBalance) || 0,
      openingType: openingType || 'Dr',
      currentBalance: Number(openingBalance) || 0,
      gstin: (gstin || '').toUpperCase(),
      pan: (pan || '').toUpperCase(),
      address: typeof address === 'object' ? address : { line1: address || '', state: state || '', stateCode: stateCode || '' },
      contact: { phone: phone || '', email: email || '' },
      companyId,
    });

    res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/ledgers/:id - Update Ledger
 */
router.put('/:id', async (req, res) => {
  try {
    const repos = getRepositories();
    const updated = await repos.ledgers.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Ledger not found' });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/ledgers/:id - Delete non-system Ledger
 */
router.delete('/:id', async (req, res) => {
  try {
    const repos = getRepositories();
    const ledger = await repos.ledgers.findById(req.params.id);
    if (!ledger) return res.status(404).json({ success: false, error: 'Ledger not found' });
    if (ledger.isSystem) {
      return res.status(400).json({ success: false, error: 'System ledgers cannot be deleted.' });
    }

    await repos.ledgers.delete(req.params.id);
    res.json({ success: true, message: 'Ledger deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
