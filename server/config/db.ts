import mongoose from 'mongoose';
import { spawn, execSync, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

const getConfigFilePath = () => {
  const appData = process.env.APPDATA || process.env.USERPROFILE || process.cwd();
  const configDir = path.join(appData, 'VindywashiniBooks');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  return path.join(configDir, 'db-config.json');
};

export const normalizeMongoUri = (uri: string): string => {
  if (!uri || typeof uri !== 'string') return 'mongodb://127.0.0.1:27017/vindywashini_books';
  let clean = uri.trim();
  // Ensure localhost uses IPv4 127.0.0.1 to avoid Node.js ::1 IPv6 connection issues
  if (clean.includes('mongodb://localhost:27017')) {
    clean = clean.replace('mongodb://localhost:27017', 'mongodb://127.0.0.1:27017');
  }
  return clean;
};

export const loadPersistedMongoUri = (): string => {
  try {
    const configPath = getConfigFilePath();
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data && data.mongoUri) return normalizeMongoUri(data.mongoUri);
    }
  } catch (err) {
    console.warn('[DB] Could not load persisted db config:', err);
  }
  return process.env.MONGO_URI ? normalizeMongoUri(process.env.MONGO_URI) : 'mongodb://127.0.0.1:27017/vindywashini_books';
};

export const savePersistedMongoUri = (uri: string) => {
  try {
    const normalized = normalizeMongoUri(uri);
    const configPath = getConfigFilePath();
    fs.writeFileSync(configPath, JSON.stringify({ mongoUri: normalized, updatedAt: new Date().toISOString() }, null, 2));
  } catch (err) {
    console.warn('[DB] Could not save persisted db config:', err);
  }
};

let localMongoProcess: ChildProcess | null = null;
let currentMongoUri = loadPersistedMongoUri();
let connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error' = 'disconnected';
let lastError: string | null = null;
let isConnectingPromise: Promise<boolean> | null = null;

// Attach real-time connection lifecycle listeners
mongoose.connection.on('connected', () => {
  connectionStatus = 'connected';
  lastError = null;
  console.log('[DB Lifecycle] Mongoose connected successfully.');
});

mongoose.connection.on('open', () => {
  connectionStatus = 'connected';
  lastError = null;
  console.log('[DB Lifecycle] Mongoose connection open.');
});

mongoose.connection.on('disconnected', () => {
  if (connectionStatus !== 'connecting') {
    connectionStatus = 'disconnected';
  }
  console.warn('[DB Lifecycle] Mongoose connection disconnected.');
});

mongoose.connection.on('error', (err) => {
  connectionStatus = 'error';
  lastError = err?.message || 'MongoDB connection error';
  console.error('[DB Lifecycle] Mongoose connection error:', err?.message);
});

export const getConnectionStatus = () => {
  const ready = mongoose.connection.readyState;
  let status: 'connected' | 'connecting' | 'disconnected' | 'error' = 'disconnected';
  if (ready === 1) {
    status = 'connected';
  } else if (ready === 2 || connectionStatus === 'connecting') {
    status = 'connecting';
  } else if (lastError) {
    status = 'error';
  } else {
    status = 'disconnected';
  }

  return {
    status,
    uri: currentMongoUri,
    error: lastError,
    readyState: ready,
    host: mongoose.connection.host || (currentMongoUri.includes('@') ? currentMongoUri.split('@')[1]?.split('/')[0] : '127.0.0.1'),
    name: mongoose.connection.name || 'vindywashini_books',
  };
};

export const connectDB = async (customUri?: string): Promise<boolean> => {
  if (isConnectingPromise) {
    return isConnectingPromise;
  }

  const uriToUse = normalizeMongoUri(customUri || currentMongoUri);
  connectionStatus = 'connecting';
  lastError = null;

  isConnectingPromise = (async () => {
    try {
      if (mongoose.connection.readyState === 1 && currentMongoUri === uriToUse) {
        connectionStatus = 'connected';
        return true;
      }

      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }

      console.log(`[DB] Connecting to ${uriToUse.replace(/:([^:@]+)@/, ':****@')}...`);
      await mongoose.connect(uriToUse, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });

      currentMongoUri = uriToUse;
      savePersistedMongoUri(uriToUse);
      connectionStatus = 'connected';
      lastError = null;
      console.log(`[DB] Connected successfully to Database at ${uriToUse.replace(/:([^:@]+)@/, ':****@')}`);
      return true;
    } catch (err: any) {
      lastError = err.message;
      console.warn(`[DB] Initial connection failed: ${err.message}`);
    }

    // If local connection failed, try starting the local MongoDB service or mongod executable
    if (uriToUse.includes('127.0.0.1:27017') || uriToUse.includes('localhost:27017')) {
      const started = await tryStartLocalMongo();
      if (started) {
        for (let retry = 1; retry <= 3; retry++) {
          try {
            console.log(`[DB] Retrying connection attempt ${retry} after launching local MongoDB...`);
            await new Promise((r) => setTimeout(r, 1500));
            await mongoose.connect(uriToUse, {
              serverSelectionTimeoutMS: 3000,
            });
            currentMongoUri = uriToUse;
            connectionStatus = 'connected';
            lastError = null;
            console.log('[DB] Connected successfully after auto-starting local MongoDB!');
            return true;
          } catch (retryErr: any) {
            lastError = retryErr.message;
          }
        }
      }
    }

    connectionStatus = 'disconnected';
    return false;
  })().finally(() => {
    isConnectingPromise = null;
  });

  return isConnectingPromise;
};

const tryStartLocalMongo = async (): Promise<boolean> => {
  // 1. If Windows, first try starting the installed Windows service 'MongoDB'
  if (process.platform === 'win32') {
    try {
      console.log('[DB] Checking / starting Windows MongoDB Service...');
      execSync('net start MongoDB', { stdio: 'ignore', timeout: 5000 });
      return true;
    } catch {
      // Service might already be started or not registered under 'MongoDB' name
    }
  }

  if (localMongoProcess) return true;

  // 2. Look for mongod binary in common installation locations
  const standardPaths = [
    'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\6.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\5.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\4.4\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\4.2\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\4.0\\bin\\mongod.exe',
    'C:\\Program Files (x86)\\MongoDB\\Server\\7.0\\bin\\mongod.exe',
    'C:\\Program Files (x86)\\MongoDB\\Server\\6.0\\bin\\mongod.exe',
    'C:\\mongodb\\bin\\mongod.exe',
  ];

  let mongodPath = standardPaths.find((p) => fs.existsSync(p));

  // If not found in standard paths, try PATH environment
  if (!mongodPath && process.platform === 'win32') {
    try {
      const whereResult = execSync('where mongod.exe', { encoding: 'utf8' }).trim();
      const firstLine = whereResult.split('\n')[0]?.trim();
      if (firstLine && fs.existsSync(firstLine)) {
        mongodPath = firstLine;
      }
    } catch {
      // Not in PATH
    }
  }

  if (!mongodPath) {
    console.log('[DB] Local mongod.exe not found in standard paths or PATH.');
    return false;
  }

  const appData = process.env.APPDATA || process.env.USERPROFILE || 'C:\\';
  const dbPath = path.join(appData, 'VindywashiniBooks', 'data', 'db');

  if (!fs.existsSync(dbPath)) {
    try {
      fs.mkdirSync(dbPath, { recursive: true });
    } catch (e) {
      console.warn('[DB] Could not create dbpath folder:', e);
    }
  }

  console.log(`[DB] Launching embedded MongoDB server from ${mongodPath} with dbpath ${dbPath}...`);
  try {
    localMongoProcess = spawn(mongodPath, ['--dbpath', dbPath, '--port', '27017', '--bind_ip', '127.0.0.1'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });

    localMongoProcess.unref();
    return true;
  } catch (err: any) {
    console.error('[DB] Could not launch mongod process:', err.message);
    return false;
  }
};
