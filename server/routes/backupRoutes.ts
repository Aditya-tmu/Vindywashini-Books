import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { BackupService } from '../services/backupService';
import { getBackupsDir, getTempDir } from '../config/paths';

const router = Router();
const upload = multer({ dest: getTempDir() });

/**
 * GET /api/backup/download - Generate and download full JSON backup
 */
router.get('/download', async (req, res) => {
  try {
    const { companyId } = req.query;
    const outputDir = getBackupsDir();
    const result = await BackupService.createBackup(companyId ? String(companyId) : undefined, outputDir);
    res.download(result.filePath, result.filename);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/backup/restore - Restore database from uploaded JSON backup
 */
router.post('/restore', upload.single('backupFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No backup file uploaded' });
    }

    const result = await BackupService.restoreBackup(req.file.path);
    fs.unlinkSync(req.file.path);

    res.json(result);
  } catch (err: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
