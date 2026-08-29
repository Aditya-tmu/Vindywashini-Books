import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { DatabaseManager } from './config/databaseManager';

// Route imports
import companyRoutes from './routes/companyRoutes';
import ledgerRoutes from './routes/ledgerRoutes';
import itemRoutes from './routes/itemRoutes';
import partyRoutes from './routes/partyRoutes';
import voucherRoutes from './routes/voucherRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import purchaseRoutes from './routes/purchaseRoutes';
import reportRoutes from './routes/reportRoutes';
import gstRoutes from './routes/gstRoutes';
import deliveryRoutes from './routes/deliveryRoutes';
import settingsRoutes from './routes/settingsRoutes';
import backupRoutes from './routes/backupRoutes';
import storageRoutes from './routes/storageRoutes';

import { getUploadsDir, getLogsDir } from './config/paths';

const app = express();
const PORT = process.env.PORT || 4545;

const logServerFile = path.join(getLogsDir(), 'server.log');
function appendServerLog(type: string, msg: string) {
  const line = `[${new Date().toISOString()}] [${type}] ${msg}\n`;
  try {
    fs.appendFileSync(logServerFile, line);
  } catch {}
}

// Global process error safety guards
process.on('uncaughtException', (err) => {
  appendServerLog('UncaughtException', err.stack || err.message);
  console.error('[Server UncaughtException]:', err);
});
process.on('unhandledRejection', (reason: any) => {
  appendServerLog('UnhandledRejection', String(reason));
  console.error('[Server UnhandledRejection]:', reason);
});

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static asset folders in AppData
const uploadsDir = getUploadsDir();
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/companies', companyRoutes);
app.use('/api/ledgers', ledgerRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/gst', gstRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/storage', storageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'Vindywashini Books',
    version: '1.0.0',
    provider: DatabaseManager.getActiveProvider(),
    dbStatus: DatabaseManager.getStatus(),
    timestamp: new Date().toISOString(),
  });
});

appendServerLog('ServerBoot', 'Server module loaded, setting up routes and middleware...');

// Start Express Server
function startServer() {
  try {
    const server = app.listen(Number(PORT), '0.0.0.0', () => {
      appendServerLog('ServerListening', `Backend successfully listening on http://127.0.0.1:${PORT} (Provider: ${DatabaseManager.getActiveProvider().toUpperCase()})`);
      console.log(`=======================================================`);
      console.log(` Vindywashini Books Backend running at http://127.0.0.1:${PORT}`);
      console.log(` Active Database Provider: ${DatabaseManager.getActiveProvider().toUpperCase()}`);
      console.log(`=======================================================`);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        appendServerLog('ServerWarning', `Port ${PORT} is already in use; attaching to existing backend process.`);
        console.log(`[Server] Port ${PORT} already in use, attaching to existing backend process.`);
      } else {
        appendServerLog('ServerError', `Server error on port ${PORT}: ${err.message}`);
        console.error('[Server Error]:', err.message);
      }
    });

    // Connect to persisted active database backend (MongoDB or Postgres/Supabase)
    const initDb = async () => {
      try {
        const isConnected = await DatabaseManager.connect();
        const status = DatabaseManager.getStatus();
        appendServerLog('DBInit', `Database connection initialized: ${isConnected ? 'CONNECTED' : 'OFFLINE'} (${status.provider})`);
        console.log(`[DB] Database Connection Result: ${isConnected ? 'CONNECTED' : 'OFFLINE'} (${status.provider})`);
      } catch (err: any) {
        appendServerLog('DBError', `Connection attempt error: ${err?.message || err}`);
        console.error('[DB] Connection attempt error:', err?.message || err);
      }
    };

    initDb();

    // Background auto-reconnect timer if disconnected
    const reconnectInterval = setInterval(async () => {
      const status = DatabaseManager.getStatus();
      if (status.readyState !== 1) {
        console.log(`[DB Auto-Reconnect] Attempting background reconnect (${status.provider})...`);
        await DatabaseManager.connect(status.provider);
      }
    }, 10000);

    if (reconnectInterval && typeof reconnectInterval.unref === 'function') {
      reconnectInterval.unref();
    }

    return server;
  } catch (err: any) {
    appendServerLog('ServerStartupError', `Failed to start server: ${err.message}`);
    console.warn('[Server Startup Notice]:', err.message);
  }
}

startServer();

export default app;
