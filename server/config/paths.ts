import path from 'path';
import fs from 'fs';

export const getUserDataDir = (): string => {
  const base = process.env.APPDATA || process.env.USERPROFILE || process.cwd();
  const dir = path.join(base, 'VindywashiniBooks');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      console.warn('[Paths] Could not create userDataDir:', e);
    }
  }
  return dir;
};

export const getUploadsDir = (): string => {
  const dir = path.join(getUserDataDir(), 'uploads');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      console.warn('[Paths] Could not create uploadsDir:', e);
    }
  }
  return dir;
};

export const getLogosDir = (): string => {
  const dir = path.join(getUploadsDir(), 'logos');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      console.warn('[Paths] Could not create logosDir:', e);
    }
  }
  return dir;
};

export const getInvoicesDir = (): string => {
  const dir = path.join(getUploadsDir(), 'invoices');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      console.warn('[Paths] Could not create invoicesDir:', e);
    }
  }
  return dir;
};

export const getBackupsDir = (): string => {
  const dir = path.join(getUserDataDir(), 'backups');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      console.warn('[Paths] Could not create backupsDir:', e);
    }
  }
  return dir;
};

export const getLogsDir = (): string => {
  const dir = path.join(getUserDataDir(), 'logs');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      console.warn('[Paths] Could not create logsDir:', e);
    }
  }
  return dir;
};

export const getTempDir = (): string => {
  const dir = path.join(getUploadsDir(), 'temp');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      console.warn('[Paths] Could not create tempDir:', e);
    }
  }
  return dir;
};

export const getGstExportsDir = (): string => {
  const dir = path.join(getUploadsDir(), 'gst_exports');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      console.warn('[Paths] Could not create gstExportsDir:', e);
    }
  }
  return dir;
};

export const getReportsDir = (): string => {
  const dir = path.join(getUploadsDir(), 'reports');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      console.warn('[Paths] Could not create reportsDir:', e);
    }
  }
  return dir;
};


