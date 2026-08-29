import { Router } from 'express';
import { getRepositories } from '../repositories/factory';
import { EmailService } from '../services/emailService';
import { DatabaseManager, validateMongoUri, validatePostgresUri, loadPersistedDbConfig, savePersistedDbConfig } from '../config/databaseManager';
import { MigrationService } from '../services/migrationService';

const router = Router();

/**
 * GET /api/settings - Get settings for company
 */
router.get('/', async (req, res) => {
  const dbStatus = DatabaseManager.getStatus();
  try {
    const { companyId } = req.query;
    const repos = getRepositories();
    const settings = await repos.settings.getSettings(companyId as string | undefined);
    const persisted = loadPersistedDbConfig();

    res.json({
      success: true,
      data: settings || {
        databaseProvider: persisted.provider,
        mongoUri: persisted.mongoUri,
        postgresUri: persisted.postgresUri,
      },
      dbStatus,
    });
  } catch (err: any) {
    const persisted = loadPersistedDbConfig();
    res.json({
      success: true,
      data: {
        databaseProvider: persisted.provider,
        mongoUri: persisted.mongoUri,
        postgresUri: persisted.postgresUri,
      },
      dbStatus,
    });
  }
});

/**
 * PUT /api/settings - Update settings
 */
router.put('/', async (req, res) => {
  try {
    const { companyId, ...updates } = req.body;
    const repos = getRepositories();
    const settings = await repos.settings.updateSettings(companyId, updates);

    if (updates.databaseProvider || updates.mongoUri || updates.postgresUri) {
      savePersistedDbConfig({
        provider: updates.databaseProvider,
        mongoUri: updates.mongoUri,
        postgresUri: updates.postgresUri,
      });
    }

    res.json({ success: true, data: settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/settings/test-smtp - Test SMTP email credentials
 */
router.post('/test-smtp', async (req, res) => {
  try {
    const { host, port, secure, user, pass } = req.body;
    const result = await EmailService.testSMTP({
      host: host || 'smtp.gmail.com',
      port: Number(port) || 587,
      secure: Boolean(secure),
      user: user || '',
      pass: pass || '',
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/settings/db-status - Check current database connection status
 */
router.get('/db-status', (req, res) => {
  res.json({ success: true, ...DatabaseManager.getStatus() });
});

/**
 * POST /api/settings/test-db - Test/Change database connection string (MongoDB or PostgreSQL/Supabase)
 */
router.post('/test-db', async (req, res) => {
  try {
    const rawUri = (req.body.uri || req.body.postgresUri || req.body.mongoUri || '').trim();
    const isPgUri = rawUri.startsWith('postgresql://') || rawUri.startsWith('postgres://');
    const isMongoUri = rawUri.startsWith('mongodb://') || rawUri.startsWith('mongodb+srv://');

    const rawProvider = req.body.provider || req.body.databaseProvider;
    let provider: 'postgres' | 'mongodb' = 'mongodb';

    if (isPgUri) {
      provider = 'postgres';
    } else if (isMongoUri) {
      provider = 'mongodb';
    } else if (rawProvider === 'postgres' || rawProvider === 'supabase') {
      provider = 'postgres';
    } else {
      provider = 'mongodb';
    }

    const uri = rawUri;

    if (!uri) {
      return res.status(400).json({
        success: false,
        message: `${provider === 'postgres' ? 'PostgreSQL' : 'MongoDB'} connection string is required.`,
        status: DatabaseManager.getStatus(),
      });
    }

    // Provider-specific validation
    if (provider === 'postgres') {
      const validation = validatePostgresUri(uri);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error || 'Invalid PostgreSQL connection URI. Expected postgresql://...',
          status: DatabaseManager.getStatus(),
        });
      }
    } else {
      const validation = validateMongoUri(uri);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error || 'Invalid MongoDB connection URI. Expected mongodb:// or mongodb+srv://...',
          status: DatabaseManager.getStatus(),
        });
      }
    }

    const connected = await DatabaseManager.connect(provider, uri);
    const status = DatabaseManager.getStatus();

    if (connected) {
      res.json({
        success: true,
        message: `Successfully connected to ${provider === 'postgres' ? 'PostgreSQL / Supabase' : 'MongoDB'} Database (${status.name || status.host})!`,
        status,
      });
    } else {
      let failureMessage =
        `Could not connect to ${provider === 'postgres' ? 'PostgreSQL / Supabase' : 'MongoDB'} Database. ` +
        (status.error || 'Please verify host, credentials, SSL settings, or IP whitelist.');

      if (provider === 'postgres' && (uri.includes('db.') && uri.includes('.supabase.co'))) {
        failureMessage =
          'This looks like a Supabase Direct Connection host (db.<project-ref>.supabase.co), which requires IPv6 and fails on most home/office networks. ' +
          'Please use the Session Pooler host instead (format: aws-0-<region>.pooler.supabase.com with user: postgres.<project-ref> and port: 5432) from Supabase Dashboard → Connect → Session Pooler.';
      }

      res.status(400).json({
        success: false,
        message: failureMessage,
        status,
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, status: DatabaseManager.getStatus() });
  }
});

/**
 * POST /api/settings/migrate-db - 1-Click Migration from current active DB to target DB
 */
router.post('/migrate-db', async (req, res) => {
  try {
    const rawTarget = req.body.targetProvider || 'postgres';
    const targetProvider = rawTarget === 'postgres' || rawTarget === 'supabase' ? 'postgres' : 'mongodb';
    const targetUri = req.body.targetUri || (targetProvider === 'postgres' ? req.body.postgresUri : req.body.mongoUri);

    if (!targetUri) {
      return res.status(400).json({ success: false, message: 'Target connection string is required for migration.' });
    }

    const result = await MigrationService.migrateBetweenProviders(targetProvider, targetUri);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Migration failed: ' + err.message });
  }
});

/**
 * GET /api/settings/export-snapshot - Export neutral JSON data bundle
 */
router.get('/export-snapshot', async (req, res) => {
  try {
    const { companyId } = req.query;
    const bundle = await MigrationService.exportSnapshot(companyId as string | undefined);
    res.setHeader('Content-Disposition', `attachment; filename=VWB_Data_Snapshot_${Date.now()}.json`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(bundle, null, 2));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/settings/import-snapshot - Import neutral JSON data bundle
 */
router.post('/import-snapshot', async (req, res) => {
  try {
    const bundle = req.body;
    if (!bundle || !bundle.companies) {
      return res.status(400).json({ success: false, message: 'Invalid data snapshot bundle.' });
    }
    const result = await MigrationService.importSnapshot(bundle);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Import failed: ' + err.message });
  }
});

/**
 * POST /api/settings/load-sample-data - Explicit user-triggered demo data seeding
 */
router.post('/load-sample-data', async (req, res) => {
  try {
    const result = await DatabaseManager.seedSampleData();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Could not load sample data: ' + err.message });
  }
});

/**
 * POST /api/settings/clean-sample-data - Explicit user-triggered demo data cleanup
 */
router.post('/clean-sample-data', async (req, res) => {
  try {
    const result = await DatabaseManager.cleanSampleData();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Could not clean sample data: ' + err.message });
  }
});

export default router;
