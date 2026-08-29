import { app, BrowserWindow, ipcMain, shell, dialog, Menu } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';

// Logging setup for Electron and Server
const getLogDirectory = () => {
  const appData = process.env.APPDATA || process.env.USERPROFILE || process.cwd();
  const dir = path.join(appData, 'VindywashiniBooks', 'logs');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
  return dir;
};

const serverLogPath = path.join(getLogDirectory(), 'server.log');
const electronLogPath = path.join(getLogDirectory(), 'electron.log');

function logElectron(message: string) {
  const formatted = `[${new Date().toISOString()}] [Electron] ${message}\n`;
  try {
    fs.appendFileSync(electronLogPath, formatted);
  } catch {}
  console.log(message);
}

function logServer(message: string) {
  const formatted = `[${new Date().toISOString()}] [Server] ${message}\n`;
  try {
    fs.appendFileSync(serverLogPath, formatted);
  } catch {}
  console.log(message);
}

// Process-level safety guards to avoid unhandled JS error dialogs
process.on('uncaughtException', (err) => {
  logElectron(`[UncaughtException] ${err.stack || err.message}`);
});
process.on('unhandledRejection', (reason) => {
  logElectron(`[UnhandledRejection] ${reason}`);
});

// Avoid Windows disk-cache and GPU shader lock collisions across multiple launches
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-http-cache');

// Single Instance Lock: Ensure only one instance of the app runs at a time
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;

// Remove generic default menu bar (File, Edit, View, Window, Help)
Menu.setApplicationMenu(null);

// Configure AutoUpdater
autoUpdater.logger = console;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function sendUpdateStatus(status: string, payload: Record<string, any> = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', { status, ...payload });
  }
}

autoUpdater.on('checking-for-update', () => {
  sendUpdateStatus('checking');
});

autoUpdater.on('update-available', (info) => {
  sendUpdateStatus('available', {
    version: info.version,
    releaseDate: info.releaseDate,
    releaseNotes: info.releaseNotes,
  });
});

autoUpdater.on('update-not-available', (info) => {
  sendUpdateStatus('not-available', {
    version: info.version,
  });
});

autoUpdater.on('error', (err) => {
  sendUpdateStatus('error', {
    error: err?.message || 'Error checking for updates',
  });
});

autoUpdater.on('download-progress', (progressObj) => {
  sendUpdateStatus('downloading', {
    percent: Math.round(progressObj.percent),
    bytesPerSecond: progressObj.bytesPerSecond,
    transferred: progressObj.transferred,
    total: progressObj.total,
  });
});

autoUpdater.on('update-downloaded', (info) => {
  sendUpdateStatus('downloaded', {
    version: info.version,
  });
});

function createWindow() {
  const iconPath = path.join(__dirname, '../logo.ico');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'Vindywashini Books - Desktop Accounting & Billing',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    frame: true,
    autoHideMenuBar: true,
    backgroundColor: '#090d16',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.removeMenu();

  // Allow F12 or Ctrl+Shift+I to toggle DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow?.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      logElectron('[Electron] Vite dev server not reached on port 5173, loading local dist/index.html...');
      mainWindow?.loadFile(path.join(__dirname, '../dist/index.html'));
    });
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Native IPC Handlers
ipcMain.handle('open-external', async (_, url: string) => {
  if (url) await shell.openExternal(url);
  return true;
});

ipcMain.handle('show-item-in-folder', async (_, fullPath: string) => {
  if (fullPath && fs.existsSync(fullPath)) {
    shell.showItemInFolder(fullPath);
    return true;
  }
  return false;
});

ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  try {
    return await mainWindow.webContents.getPrintersAsync();
  } catch (err) {
    console.error('Error getting printers:', err);
    return [];
  }
});

ipcMain.handle('print-html', async (_, htmlContent: string, printerName?: string) => {
  return new Promise((resolve) => {
    let printTarget = printerName;
    const printWindow = new BrowserWindow({
      show: false,
      parent: mainWindow || undefined,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    printWindow.webContents.on('did-finish-load', async () => {
      try {
        // Small delay to ensure external Tailwind CSS & Google fonts are fully laid out
        await new Promise((r) => setTimeout(r, 300));

        // If no explicit printerName passed, detect and target the system default printer
        if (!printTarget && mainWindow) {
          try {
            const printers = await mainWindow.webContents.getPrintersAsync();
            const defaultP = printers.find((p) => p.isDefault);
            if (defaultP) {
              printTarget = defaultP.name;
            }
          } catch {}
        }

        const options: any = {
          silent: Boolean(printTarget),
          printBackground: true,
        };
        if (printTarget) {
          options.deviceName = printTarget;
        }

        printWindow.webContents.print(options, (success, failureReason) => {
          try {
            printWindow.destroy();
          } catch {}
          resolve({ success, failureReason });
        });
      } catch (err: any) {
        try {
          printWindow.destroy();
        } catch {}
        resolve({ success: false, failureReason: err.message });
      }
    });

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`).catch((err) => {
      try {
        printWindow.destroy();
      } catch {}
      resolve({ success: false, failureReason: err.message });
    });
  });
});

ipcMain.handle('export-pdf', async (_, htmlContent: string, defaultFilename: string) => {
  if (!mainWindow) return { success: false, error: 'No main window' };

  const saveDialogResult = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Invoice as PDF',
    defaultPath: defaultFilename || 'Invoice.pdf',
    filters: [{ name: 'PDF Documents (*.pdf)', extensions: ['pdf'] }],
  });

  if (saveDialogResult.canceled || !saveDialogResult.filePath) {
    return { success: false, canceled: true };
  }

  return new Promise((resolve) => {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    printWindow.webContents.on('did-finish-load', async () => {
      try {
        const pdfData = await printWindow.webContents.printToPDF({
          printBackground: true,
          pageSize: 'A4',
          margins: { marginType: 'default' },
        });
        fs.writeFileSync(saveDialogResult.filePath, pdfData);
        printWindow.destroy();
        resolve({ success: true, filePath: saveDialogResult.filePath });
      } catch (err: any) {
        printWindow.destroy();
        resolve({ success: false, error: err.message });
      }
    });

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`).catch((err) => {
      printWindow.destroy();
      resolve({ success: false, error: err.message });
    });
  });
});

ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// AutoUpdater & Utility IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('open-logs-folder', async () => {
  const logDir = getLogDirectory();
  if (fs.existsSync(logDir)) {
    shell.openPath(logDir);
    return true;
  }
  return false;
});

ipcMain.handle('check-for-updates', async () => {
  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;
  if (isDev) {
    return { dev: true, message: 'Auto update check is simulated in dev mode.' };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (err: any) {
    logElectron(`[AutoUpdater] checkForUpdates error: ${err.message}`);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err: any) {
    logElectron(`[AutoUpdater] downloadUpdate error: ${err.message}`);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('quit-and-install', () => {
  autoUpdater.quitAndInstall(false, true);
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

async function checkBackendHealth(): Promise<boolean> {
  return new Promise((resolve) => {
    const http = require('http');
    const req = http.get('http://127.0.0.1:4545/api/health', { timeout: 1500 }, (res: any) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function startAndVerifyBackend(): Promise<{ success: boolean; error?: string }> {
  logElectron('Checking if backend server is already listening on port 4545...');
  const alreadyActive = await checkBackendHealth();
  if (alreadyActive) {
    logElectron('Backend server is already active on port 4545.');
    return { success: true };
  }

  logElectron('Initializing local backend server process...');
  const candidates = [
    path.join(__dirname, '../dist-server/index.js'),
    path.join(__dirname, 'dist-server/index.js'),
    path.join(app.getAppPath(), 'dist-server/index.js'),
    path.join(process.cwd(), 'dist-server/index.js'),
    path.join(process.resourcesPath || '', 'app.asar.unpacked/dist-server/index.js'),
  ];

  let initError = '';
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        require(p);
        logServer(`Successfully loaded server module from: ${p}`);
        break;
      } catch (e: any) {
        initError = e.stack || e.message;
        logServer(`Failed loading server module from ${p}: ${initError}`);
      }
    }
  }

  // Poll for up to 10 seconds for backend to bind port 4545
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const healthy = await checkBackendHealth();
    if (healthy) {
      logElectron(`Backend server confirmed healthy and responsive on port 4545 (attempt ${i + 1}).`);
      return { success: true };
    }
  }

  const errMsg = initError || 'Backend service failed to bind to port 4545 within 10 seconds.';
  logElectron(`[Backend Startup Failed]: ${errMsg}`);
  return { success: false, error: errMsg };
}

app.whenReady().then(async () => {
  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;
  logElectron(`Vindywashini Books starting (Version: ${app.getVersion()}, isDev: ${isDev})...`);

  createWindow();

  // Actively verify backend readiness
  const backendState = await startAndVerifyBackend();
  if (!backendState.success && mainWindow && !mainWindow.isDestroyed()) {
    logElectron(`Presenting backend startup error screen to user.`);
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Backend Startup Error - Vindywashini Books</title>
          <style>
            body { background: #090d16; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 24px; box-sizing: border-box; }
            .card { background: #0f172a; border: 1px solid #dc2626; border-radius: 16px; padding: 32px; max-width: 580px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); }
            h1 { color: #f87171; font-size: 20px; margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px; }
            p { color: #94a3b8; font-size: 13px; line-height: 1.6; margin: 0 0 16px 0; }
            pre { background: #020617; color: #fca5a5; padding: 12px; border-radius: 8px; font-size: 11px; overflow-x: auto; max-height: 140px; border: 1px solid #334155; margin-bottom: 20px; font-family: monospace; white-space: pre-wrap; word-break: break-all; }
            .actions { display: flex; gap: 10px; }
            .btn { background: #059669; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
            .btn:hover { background: #10b981; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>⚠ Backend Service Failed to Start</h1>
            <p>Vindywashini Books internal backend service on <strong>http://127.0.0.1:4545</strong> could not start or bind to its local port.</p>
            <pre>${backendState.error || 'Connection refused on port 4545'}</pre>
            <p>Persistent logs are available at:<br><code style="color: #38bdf8;">${serverLogPath}</code></p>
            <div class="actions">
              <button class="btn" onclick="window.location.reload()">Retry Startup</button>
            </div>
          </div>
        </body>
      </html>
    `;
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
  }

  // Automatically check for updates 8s after startup in production
  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        logElectron(`[AutoUpdater] Initial check notice: ${err.message}`);
      });
    }, 8000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
