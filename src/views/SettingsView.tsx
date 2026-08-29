import React from 'react';
import {
  Settings as SettingsIcon,
  Database,
  Mail,
  MessageSquare,
  Printer,
  Shield,
  Download,
  Upload,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Zap,
  ArrowUpCircle,
  Sparkles,
  ExternalLink,
  Cloud,
  Eye,
  EyeOff,
  Key,
  Globe,
  HelpCircle,
  Check,
  Radio,
  Building2,
  Phone,
  CreditCard,
  FileText,
  Trash2,
  AlertTriangle,
  ArrowLeftRight,
  Info,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import { SettingsType, UpdateStatusData } from '../types';
import { INDIAN_STATES } from '../config/constants';
import { getStateFromGSTIN } from '../utils/gstValidator';
import { HelpDrawer } from '../components/HelpDrawer';

export const SettingsView: React.FC = () => {
  const { activeCompany, setActiveCompany, dbStatus, fetchDbStatus, fetchCompanies, showToast } = useAppStore();

  const [settingsTab, setSettingsTab] = React.useState<
    'business' | 'database' | 'email' | 'whatsapp' | 'storage' | 'gsp' | 'fy-lock' | 'backup' | 'updates'
  >('business');
  const [isHelpOpen, setIsHelpOpen] = React.useState<boolean>(false);

  // Business Profile Edit State
  const [businessProfile, setBusinessProfile] = React.useState({
    legalName: '',
    tradeName: '',
    gstin: '',
    pan: '',
    phone: '',
    email: '',
    website: '',
    line1: '',
    line2: '',
    city: '',
    state: 'Bihar',
    stateCode: '10',
    pincode: '',
    bankName: '',
    accountNo: '',
    ifsc: '',
    branch: '',
    upiId: '',
    termsAndConditions: '',
    notes: '',
    defaultTemplate: 'A4' as 'POS-58' | 'POS-80' | 'A5' | 'A4',
    invoicePrefix: 'INV/',
  });
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string>('');
  const [savingBusiness, setSavingBusiness] = React.useState<boolean>(false);

  // 2-Step Company Delete in Settings
  const [showDeleteModal, setShowDeleteModal] = React.useState<boolean>(false);
  const [deleteStep, setDeleteStep] = React.useState<1 | 2>(1);
  const [deleteConfirmationText, setDeleteConfirmationText] = React.useState<string>('');
  const [isDeletingCompany, setIsDeletingCompany] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (activeCompany) {
      setBusinessProfile({
        legalName: activeCompany.legalName || '',
        tradeName: activeCompany.tradeName || '',
        gstin: activeCompany.gstin || '',
        pan: activeCompany.pan || '',
        phone: activeCompany.contact?.phone || '',
        email: activeCompany.contact?.email || '',
        website: activeCompany.contact?.website || '',
        line1: activeCompany.address?.line1 || '',
        line2: activeCompany.address?.line2 || '',
        city: activeCompany.address?.city || '',
        state: activeCompany.address?.state || 'Bihar',
        stateCode: activeCompany.address?.stateCode || '10',
        pincode: activeCompany.address?.pincode || '',
        bankName: activeCompany.bankDetails?.bankName || '',
        accountNo: activeCompany.bankDetails?.accountNo || '',
        ifsc: activeCompany.bankDetails?.ifsc || '',
        branch: activeCompany.bankDetails?.branch || '',
        upiId: activeCompany.bankDetails?.upiId || '',
        termsAndConditions: activeCompany.termsAndConditions || '',
        notes: activeCompany.notes || '',
        defaultTemplate: activeCompany.defaultTemplate || 'A4',
        invoicePrefix: activeCompany.invoicePrefix || 'INV/',
      });
      if (activeCompany.logoPath) {
        const name = activeCompany.logoPath.split(/[/\\]/).pop();
        setLogoPreview(`http://127.0.0.1:4545/uploads/logos/${name}`);
      }
    }
  }, [activeCompany]);

  // App Update State
  const [appVersion, setAppVersion] = React.useState<string>('1.0.0');
  const [updateStatus, setUpdateStatus] = React.useState<UpdateStatusData | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = React.useState<boolean>(false);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = React.useState<boolean>(false);

  // Database Connection Wizard State
  const [dbProvider, setDbProvider] = React.useState<'supabase' | 'atlas' | 'local' | 'aws' | 'custom'>('local');
  const [connectionMode, setConnectionMode] = React.useState<'credentials' | 'uri'>('credentials');
  const [showDbPassword, setShowDbPassword] = React.useState<boolean>(false);

  // Supabase / PostgreSQL Credentials
  const [supabaseHost, setSupabaseHost] = React.useState<string>('');
  const [supabasePort, setSupabasePort] = React.useState<string>('5432');
  const [supabaseUsername, setSupabaseUsername] = React.useState<string>('postgres');
  const [supabasePassword, setSupabasePassword] = React.useState<string>('');
  const [supabaseDbName, setSupabaseDbName] = React.useState<string>('postgres');
  const [supabaseSsl, setSupabaseSsl] = React.useState<boolean>(true);
  const [postgresUriInput, setPostgresUriInput] = React.useState<string>('');

  // Atlas Credentials
  const [atlasCluster, setAtlasCluster] = React.useState<string>('');
  const [atlasUsername, setAtlasUsername] = React.useState<string>('');
  const [atlasPassword, setAtlasPassword] = React.useState<string>('');
  const [atlasDbName, setAtlasDbName] = React.useState<string>('vindywashini_books');
  const [atlasAppName, setAtlasAppName] = React.useState<string>('VindywashiniBooks');

  // AWS DocumentDB Credentials
  const [awsHost, setAwsHost] = React.useState<string>('');
  const [awsPort, setAwsPort] = React.useState<string>('27017');
  const [awsUsername, setAwsUsername] = React.useState<string>('');
  const [awsPassword, setAwsPassword] = React.useState<string>('');
  const [awsDbName, setAwsDbName] = React.useState<string>('vindywashini_books');
  const [awsTls, setAwsTls] = React.useState<boolean>(true);

  // Local Credentials
  const [localHost, setLocalHost] = React.useState<string>('127.0.0.1');
  const [localPort, setLocalPort] = React.useState<string>('27017');
  const [localDbName, setLocalDbName] = React.useState<string>('vindywashini_books');

  const [mongoUriInput, setMongoUriInput] = React.useState<string>(
    'mongodb://127.0.0.1:27017/vindywashini_books'
  );
  const [testingDb, setTestingDb] = React.useState<boolean>(false);
  const [isMigratingDb, setIsMigratingDb] = React.useState<boolean>(false);
  const [rawPasswordToEncode, setRawPasswordToEncode] = React.useState<string>('');
  const [isLoadingSampleData, setIsLoadingSampleData] = React.useState<boolean>(false);
  const [isCleaningSampleData, setIsCleaningSampleData] = React.useState<boolean>(false);

  // SMTP state
  const [smtpConfig, setSmtpConfig] = React.useState({
    enabled: true,
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromEmail: '',
    fromName: 'Vindywashini Books',
  });
  const [testingSmtp, setTestingSmtp] = React.useState<boolean>(false);

  // WhatsApp state
  const [whatsappConfig, setWhatsappConfig] = React.useState({
    mode: 'fallback' as 'fallback' | 'cloud_api',
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    defaultGreetingTemplate:
      'Dear {CustomerName}, thank you for shopping with {CompanyName}! Please find your invoice #{InvoiceNo} dated {Date} attached. Total: ₹{Amount}. We appreciate your business!',
  });

  // GSP state
  const [gspConfig, setGspConfig] = React.useState({
    provider: 'ClearTax / Cygnet GSP Sandbox',
    clientId: '',
    clientSecret: '',
    username: '',
    environment: 'sandbox' as 'sandbox' | 'production',
    enabled: false,
  });

  // Cloud Storage (Supabase Storage) state
  const [storageConfig, setStorageConfig] = React.useState({
    enabled: false,
    supabaseUrl: '',
    serviceRoleKey: '',
    bucketName: 'Vindywashini Book',
    signedUrlExpiryDays: 30,
    autoCleanupDays: 0,
    useShortLinks: false,
  });
  const [showStorageKey, setShowStorageKey] = React.useState<boolean>(false);
  const [testingStorage, setTestingStorage] = React.useState<boolean>(false);
  const [storageUsage, setStorageUsage] = React.useState<{
    configured: boolean;
    bucketName: string;
    totalBytes: number;
    totalFiles: number;
    planLimitBytes: number;
    percentUsed: number;
    warning: boolean;
    error?: string;
  } | null>(null);
  const [loadingUsage, setLoadingUsage] = React.useState<boolean>(false);
  const [cleaningStorage, setCleaningStorage] = React.useState<boolean>(false);
  const [cleaningLegacy, setCleaningLegacy] = React.useState<boolean>(false);

  // FY Lock
  const [selectedFyToLock, setSelectedFyToLock] = React.useState<string>('2024-2025');

  // Backup restore file
  const [restoreFile, setRestoreFile] = React.useState<File | null>(null);
  const [isRestoring, setIsRestoring] = React.useState<boolean>(false);

  const handleFetchStorageUsage = async () => {
    try {
      setLoadingUsage(true);
      const usage = await api.getStorageUsage(activeCompany?._id);
      setStorageUsage(usage);
    } catch (err: any) {
      console.warn('Could not load storage usage:', err.message);
    } finally {
      setLoadingUsage(false);
    }
  };

  const handleTestStorage = async () => {
    try {
      setTestingStorage(true);
      const res = await api.testStorage(storageConfig, activeCompany?._id);
      if (res.success) {
        showToast(res.message, 'success');
        await handleFetchStorageUsage();
      } else {
        showToast(res.error || 'Storage connection test failed', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Storage test error', 'error');
    } finally {
      setTestingStorage(false);
    }
  };

  const handleRunStorageCleanup = async () => {
    const days = storageConfig.autoCleanupDays || 90;
    if (
      !confirm(
        `Run storage cleanup now to remove invoice files older than ${days} days from Supabase bucket "${storageConfig.bucketName}"? Local database and PDF copies will remain intact.`
      )
    ) {
      return;
    }
    try {
      setCleaningStorage(true);
      const res = await api.runStorageCleanup(activeCompany?._id, days);
      if (res.success) {
        showToast(res.message, 'success');
        await handleFetchStorageUsage();
      } else {
        showToast(res.error || 'Cleanup failed', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Error running storage cleanup', 'error');
    } finally {
      setCleaningStorage(false);
    }
  };

  const handleCleanupLegacyStorage = async () => {
    if (
      !confirm(
        `Clean up legacy .html test files from bucket "${storageConfig.bucketName}"? Only genuine PDF invoices will be retained.`
      )
    ) {
      return;
    }
    try {
      setCleaningLegacy(true);
      const res = await api.cleanupLegacyStorage(activeCompany?._id);
      if (res.success) {
        showToast(res.message, 'success');
        await handleFetchStorageUsage();
      } else {
        showToast(res.error || 'Legacy cleanup notice', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Error cleaning legacy files', 'error');
    } finally {
      setCleaningLegacy(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await api.getSettings(activeCompany?._id);
      if (res && res.data) {
        if (res.data.mongoUri) setMongoUriInput(res.data.mongoUri);
        if (res.data.postgresUri) setPostgresUriInput(res.data.postgresUri);
        if (res.data.databaseProvider === 'postgres') {
          setDbProvider('supabase');
        }
        if (res.data.smtp) setSmtpConfig(res.data.smtp as any);
        if (res.data.whatsapp) setWhatsappConfig(res.data.whatsapp as any);
        if (res.data.gsp) setGspConfig(res.data.gsp as any);
        if (res.data.storage) {
          setStorageConfig({
            enabled: Boolean(res.data.storage.enabled),
            supabaseUrl: res.data.storage.supabaseUrl || '',
            serviceRoleKey: res.data.storage.serviceRoleKey || '',
            bucketName: res.data.storage.bucketName || 'Vindywashini Book',
            signedUrlExpiryDays: Number(res.data.storage.signedUrlExpiryDays) || 30,
            autoCleanupDays: Number(res.data.storage.autoCleanupDays) || 0,
            useShortLinks: Boolean(res.data.storage.useShortLinks),
          });
          handleFetchStorageUsage();
        }
      }
      fetchDbStatus();
    } catch (err) {
      console.warn('Error loading settings');
    }
  };

  React.useEffect(() => {
    loadSettings();

    // Fetch App Version from Electron
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then((v) => {
        if (v) setAppVersion(v);
      });
    }

    // Subscribe to auto-updater status updates
    if (window.electronAPI?.onUpdateStatus) {
      const cleanup = window.electronAPI.onUpdateStatus((data: UpdateStatusData) => {
        setUpdateStatus(data);
        if (data.status === 'downloading') {
          setIsDownloadingUpdate(true);
        } else if (data.status === 'downloaded') {
          setIsDownloadingUpdate(false);
          showToast('Update downloaded! Click "Restart & Install" to apply.', 'success');
        } else if (data.status === 'available') {
          showToast(`New update v${data.version || ''} is available!`, 'info');
        } else if (data.status === 'not-available') {
          showToast('You are running the latest version!', 'success');
        } else if (data.status === 'error' && data.error) {
          showToast(`Update error: ${data.error}`, 'error');
        }
      });
      return () => {
        if (cleanup) cleanup();
      };
    }
  }, [activeCompany]);

  const handleCheckUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      const res = await window.electronAPI?.checkForUpdates();
      if (res?.dev) {
        showToast('Running in Development mode. Update checks run on packaged builds.', 'info');
      } else if (res?.success === false && res?.error) {
        showToast(`Could not check updates: ${res.error}`, 'error');
      }
    } catch (err: any) {
      showToast('Error checking for updates', 'error');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleDownloadUpdate = async () => {
    setIsDownloadingUpdate(true);
    try {
      const res = await window.electronAPI?.downloadUpdate();
      if (res?.success === false && res?.error) {
        showToast(`Download failed: ${res.error}`, 'error');
        setIsDownloadingUpdate(false);
      }
    } catch (err: any) {
      showToast('Error downloading update', 'error');
      setIsDownloadingUpdate(false);
    }
  };

  const handleQuitAndInstall = () => {
    window.electronAPI?.quitAndInstall();
  };

  // Business Profile Handlers
  const handleBusinessGstinChange = (val: string) => {
    const clean = val.toUpperCase().trim();
    let updated = { ...businessProfile, gstin: clean };

    if (clean.length >= 2) {
      const derived = getStateFromGSTIN(clean);
      updated.stateCode = derived.stateCode;
      updated.state = derived.stateName;
    }
    if (clean.length >= 12 && !businessProfile.pan) {
      updated.pan = clean.substring(2, 12);
    }
    setBusinessProfile(updated);
  };

  const handleSaveBusinessProfile = async () => {
    if (!activeCompany) {
      showToast('No active company selected', 'error');
      return;
    }
    if (!businessProfile.legalName.trim()) {
      showToast('Legal business name is required', 'error');
      return;
    }

    try {
      setSavingBusiness(true);
      const payload: any = {
        legalName: businessProfile.legalName.trim(),
        tradeName: businessProfile.tradeName.trim() || businessProfile.legalName.trim(),
        gstin: businessProfile.gstin.trim().toUpperCase(),
        pan: businessProfile.pan.trim().toUpperCase(),
        address: {
          line1: businessProfile.line1,
          line2: businessProfile.line2,
          city: businessProfile.city,
          state: businessProfile.state,
          stateCode: businessProfile.stateCode,
          pincode: businessProfile.pincode,
        },
        contact: {
          phone: businessProfile.phone,
          email: businessProfile.email,
          website: businessProfile.website,
        },
        bankDetails: {
          bankName: businessProfile.bankName,
          accountNo: businessProfile.accountNo,
          ifsc: businessProfile.ifsc,
          branch: businessProfile.branch,
          upiId: businessProfile.upiId,
        },
        termsAndConditions: businessProfile.termsAndConditions,
        notes: businessProfile.notes,
        defaultTemplate: businessProfile.defaultTemplate,
        invoicePrefix: businessProfile.invoicePrefix,
      };

      const updated = await api.updateCompany(activeCompany._id, payload);
      if (logoFile) {
        await api.uploadLogo(activeCompany._id, logoFile);
      }
      await fetchCompanies();
      showToast('Business details, bank accounts & contact information updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Error updating business profile', 'error');
    } finally {
      setSavingBusiness(false);
    }
  };

  // Construct connection URI dynamically based on provider credentials
  const getConstructedUri = (providerOverride?: 'supabase' | 'atlas' | 'aws' | 'local'): string => {
    try {
      const target = providerOverride || dbProvider;
      if (target === 'supabase') {
        if (connectionMode === 'uri' && !providerOverride) {
          return postgresUriInput || mongoUriInput || '';
        }
        const host = (supabaseHost || '').trim() || 'aws-0-ap-northeast-1.pooler.supabase.com';
        const port = (supabasePort || '').trim() || '5432';
        const user = encodeURIComponent((supabaseUsername || '').trim() || 'postgres');
        const pass = encodeURIComponent(supabasePassword || '');
        const db = encodeURIComponent((supabaseDbName || '').trim() || 'postgres');
        const ssl = supabaseSsl ? '?sslmode=require' : '';
        return `postgresql://${user}:${pass}@${host}:${port}/${db}${ssl}`;
      }
      if (connectionMode === 'uri' && !providerOverride) {
        return mongoUriInput || '';
      }
      if (target === 'atlas') {
        const cleanCluster = (atlasCluster || '')
          .replace(/^mongodb\+srv:\/\//, '')
          .replace(/^mongodb:\/\//, '')
          .replace(/\/.*$/, '')
          .trim();
        const user = encodeURIComponent((atlasUsername || '').trim());
        const pass = encodeURIComponent(atlasPassword || '');
        const db = encodeURIComponent((atlasDbName || '').trim() || 'vindywashini_books');
        if (!cleanCluster) return mongoUriInput || '';
        const appNameParam = (atlasAppName || '').trim() ? `&appName=${encodeURIComponent(atlasAppName.trim())}` : '';
        return `mongodb+srv://${user}:${pass}@${cleanCluster}/${db}?retryWrites=true&w=majority${appNameParam}`;
      }
      if (target === 'aws') {
        const host = (awsHost || '').trim();
        const port = (awsPort || '').trim() || '27017';
        const user = encodeURIComponent((awsUsername || '').trim());
        const pass = encodeURIComponent(awsPassword || '');
        const db = encodeURIComponent((awsDbName || '').trim() || 'vindywashini_books');
        if (!host) return mongoUriInput || '';
        const tlsParam = awsTls
          ? '?tls=true&tlsAllowInvalidCertificates=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false'
          : '';
        return `mongodb://${user}:${pass}@${host}:${port}/${db}${tlsParam}`;
      }
      if (target === 'local') {
        const host = (localHost || '').trim() || '127.0.0.1';
        const port = (localPort || '').trim() || '27017';
        const db = encodeURIComponent((localDbName || '').trim() || 'vindywashini_books');
        return `mongodb://${host}:${port}/${db}`;
      }
      return mongoUriInput || postgresUriInput || '';
    } catch {
      return '';
    }
  };

  const maskUri = (uri: string | undefined): string => {
    if (!uri || typeof uri !== 'string') return '';
    try {
      return uri.replace(/:([^:@]+)@/, ':••••••••@');
    } catch {
      return uri;
    }
  };

  // Encode and insert raw password into URI field
  const handleEncodeAndInsertPassword = (rawPassword: string) => {
    if (!rawPassword) return;
    const encoded = encodeURIComponent(rawPassword);
    const isPg = dbProvider === 'supabase' || (postgresUriInput && postgresUriInput.startsWith('postgres'));

    if (isPg) {
      let current =
        postgresUriInput ||
        'postgresql://postgres.<project-ref>:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require';
      if (current.includes('[PASSWORD]') || current.includes('[YOUR-PASSWORD]')) {
        current = current.replace(/\[(YOUR-)?PASSWORD\]/i, encoded);
      } else if (current.match(/:\/\/[^:]+:[^@]+@/)) {
        current = current.replace(/(:\/\/[^:]+:)([^@]+)(@)/, `$1${encoded}$3`);
      } else if (current.includes(':') && current.includes('@')) {
        current = current.replace(/(:\/\/[^:]+:)([^@]*)(@)/, `$1${encoded}$3`);
      }
      setPostgresUriInput(current);
    } else {
      let current = mongoUriInput || 'mongodb+srv://admin:[PASSWORD]@cluster0.abcde.mongodb.net/vindywashini_books';
      if (current.includes('[PASSWORD]') || current.includes('[YOUR-PASSWORD]')) {
        current = current.replace(/\[(YOUR-)?PASSWORD\]/i, encoded);
      } else if (current.match(/:\/\/[^:]+:[^@]+@/)) {
        current = current.replace(/(:\/\/[^:]+:)([^@]+)(@)/, `$1${encoded}$3`);
      } else if (current.includes(':') && current.includes('@')) {
        current = current.replace(/(:\/\/[^:]+:)([^@]*)(@)/, `$1${encoded}$3`);
      }
      setMongoUriInput(current);
    }

    setRawPasswordToEncode('');
    showToast('Password encoded (%40, %23, etc.) and inserted into connection URI!', 'success');
  };

  const handleLoadSampleData = async () => {
    if (!confirm('Load sample demo hardware store catalog, companies, ledgers, items and parties? This will add example data for exploration.')) {
      return;
    }
    try {
      setIsLoadingSampleData(true);
      const res = await api.loadSampleData();
      if (res.success) {
        showToast(res.message || 'Sample demo data loaded successfully!', 'success');
        await fetchCompanies();
      } else {
        showToast(res.message || 'Could not load sample data', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Error loading sample data', 'error');
    } finally {
      setIsLoadingSampleData(false);
    }
  };

  const handleCleanSampleData = async () => {
    if (!confirm('Are you sure you want to remove the sample demo company (MAA VINDYWASHINI HARDWARE) and all its linked records? Your real companies will not be affected.')) {
      return;
    }
    try {
      setIsCleaningSampleData(true);
      const res = await api.cleanSampleData();
      if (res.success) {
        showToast(res.message || 'Demo data cleaned successfully!', 'success');
        await fetchCompanies();
      } else {
        showToast(res.message || 'Could not clean demo data', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Error cleaning demo data', 'error');
    } finally {
      setIsCleaningSampleData(false);
    }
  };

  // Test and switch database with pre-flight check
  const handleTestDb = async (overrideUri?: string, overrideProvider?: 'mongodb' | 'postgres') => {
    try {
      setTestingDb(true);
      const uriToUse = (overrideUri || getConstructedUri()).trim();
      const isPg = overrideProvider
        ? overrideProvider === 'postgres'
        : (dbProvider === 'supabase' || uriToUse.startsWith('postgres'));
      const provider: 'mongodb' | 'postgres' = isPg ? 'postgres' : 'mongodb';

      if (isPg) {
        setPostgresUriInput(uriToUse);
        setDbProvider('supabase');
      } else {
        setMongoUriInput(uriToUse);
      }

      // Pre-flight check: detect unencoded reserved characters in password segment
      const atMatches = uriToUse.match(/@/g);
      if (atMatches && atMatches.length > 1) {
        showToast(
          "Your connection string contains multiple '@' characters. Your password likely has an unencoded '@'. Use the Credential Wizard tab (which encodes automatically) or use the 'Encode Password' tool below.",
          'error'
        );
        setTestingDb(false);
        return;
      }

      if (uriToUse.includes(' ')) {
        showToast(
          "Your connection string contains spaces in credentials. Please encode special characters or use the Credential Wizard tab.",
          'error'
        );
        setTestingDb(false);
        return;
      }

      if (uriToUse.includes('#') && !uriToUse.includes('?')) {
        showToast(
          "Your connection string contains an unencoded '#' in the password. Please replace '#' with '%23' or use the Credential Wizard tab.",
          'error'
        );
        setTestingDb(false);
        return;
      }

      const res = await api.testDB({ provider, uri: uriToUse });
      if (res.success) {
        showToast(res.message || `Connected successfully to ${isPg ? 'PostgreSQL / Supabase' : 'MongoDB'}!`, 'success');
      } else {
        let msg = res.message || 'Could not connect to Database';
        if (isPg && uriToUse.includes('db.') && uriToUse.includes('.supabase.co')) {
          msg = 'This looks like a Supabase Direct Connection host (db.<ref>.supabase.co), which requires IPv6 and fails on most networks. Please use the Session Pooler host instead (format: aws-0-<region>.pooler.supabase.com with user: postgres.<ref>) from Supabase Dashboard → Connect → Session Pooler.';
        }
        showToast(msg, 'error');
      }
      await fetchDbStatus();
      await fetchCompanies();
    } catch (err: any) {
      let errMsg = err.response?.data?.message || err.message || 'Database connection error';
      if (dbProvider === 'supabase' && ((overrideUri || getConstructedUri()).includes('db.') && (overrideUri || getConstructedUri()).includes('.supabase.co'))) {
        errMsg = 'This looks like a Supabase Direct Connection host (db.<ref>.supabase.co), which requires IPv6 and fails on most networks. Please use the Session Pooler host instead (format: aws-0-<region>.pooler.supabase.com with user: postgres.<ref>) from Supabase Dashboard → Connect → Session Pooler.';
      }
      showToast(errMsg, 'error');
    } finally {
      setTestingDb(false);
    }
  };

  const handleMigrateDatabase = async () => {
    const uriToUse = getConstructedUri();
    const isPg = dbProvider === 'supabase' || uriToUse.startsWith('postgres');
    const targetProvider: 'mongodb' | 'postgres' = isPg ? 'postgres' : 'mongodb';

    if (!confirm(`Are you sure you want to export all data from the currently active database and import it into ${targetProvider.toUpperCase()} (${uriToUse.replace(/:([^:@]+)@/, ':****@')})?`)) {
      return;
    }

    try {
      setIsMigratingDb(true);
      const res = await api.migrateDB(targetProvider, uriToUse);
      if (res.success) {
        showToast(res.message || 'Migration completed successfully!', 'success');
        await fetchDbStatus();
        await fetchCompanies();
      } else {
        showToast(res.message || 'Database migration failed', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Migration error', 'error');
    } finally {
      setIsMigratingDb(false);
    }
  };

  const handleResetLocalDb = async () => {
    const localUri = 'mongodb://127.0.0.1:27017/vindywashini_books';
    setDbProvider('local');
    setLocalHost('127.0.0.1');
    setLocalPort('27017');
    setLocalDbName('vindywashini_books');
    setMongoUriInput(localUri);
    await handleTestDb(localUri, 'mongodb');
  };

  // Test SMTP
  const handleTestSMTP = async () => {
    try {
      setTestingSmtp(true);
      const res = await api.testSMTP(smtpConfig);
      if (res.success) {
        showToast('SMTP Server handshake verified successfully!', 'success');
      } else {
        showToast('SMTP Connection Failed: ' + res.message, 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setTestingSmtp(false);
    }
  };

  // Save Settings
  const handleSaveAllSettings = async () => {
    try {
      const isPg = dbProvider === 'supabase' || (postgresUriInput && postgresUriInput.startsWith('postgres'));
      await api.updateSettings({
        companyId: activeCompany?._id,
        databaseProvider: isPg ? 'postgres' : 'mongodb',
        mongoUri: mongoUriInput,
        postgresUri: postgresUriInput,
        smtp: smtpConfig,
        whatsapp: whatsappConfig,
        gsp: gspConfig,
        storage: storageConfig,
      });
      showToast('Settings saved successfully!', 'success');
    } catch (err: any) {
      showToast('Error saving settings: ' + err.message, 'error');
    }
  };

  // Lock / Unlock FY
  const handleToggleLockFY = async (lock: boolean) => {
    if (!activeCompany) return;
    try {
      await api.lockFY(activeCompany._id, selectedFyToLock, lock);
      showToast(`Financial Year ${selectedFyToLock} ${lock ? 'Locked' : 'Unlocked'} successfully!`, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const isConnected = dbStatus?.status === 'connected';

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-100">Application Settings & Integrations</h1>
            <p className="text-xs text-slate-400">
              MongoDB Compass Connection, SMTP Email, WhatsApp Cloud API, Backup & Financial Year Security
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveAllSettings}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/80 active:scale-95 transition"
          >
            Save Configuration
          </button>

          <button
            onClick={() => setIsHelpOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition"
            title="Open Application Guide & Troubleshooting"
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>Help</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Nav Menu */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg space-y-1">
          {[
            { id: 'business', label: 'Business Profile & Bank', icon: Building2 },
            { id: 'database', label: 'MongoDB Connection', icon: Database, badge: isConnected ? 'Online' : 'Offline' },
            { id: 'email', label: 'SMTP Email Service', icon: Mail },
            { id: 'whatsapp', label: 'WhatsApp Delivery', icon: MessageSquare },
            { id: 'storage', label: 'Cloud Storage (Supabase)', icon: Cloud, badge: storageConfig.enabled ? 'Active' : undefined },
            { id: 'gsp', label: 'GSP e-Filing Interface', icon: Zap },
            { id: 'fy-lock', label: 'Financial Year Lock', icon: Lock },
            { id: 'backup', label: 'Database Backup & Restore', icon: Download },
            { id: 'updates', label: 'App Updates & Releases', icon: ArrowUpCircle, badge: updateStatus?.status === 'available' ? 'New' : undefined },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = settingsTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSettingsTab(tab.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
                {tab.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                      isConnected ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-6">
          {/* 0. Business Profile & Bank Details Tab */}
          {settingsTab === 'business' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span>Business Profile, GST & Bank Details</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Update company trade name, contact email/phone, GSTIN, registered address, and bank accounts for invoices.
                  </p>
                </div>

                <button
                  onClick={handleSaveBusinessProfile}
                  disabled={savingBusiness}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                >
                  {savingBusiness ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Business Details</span>
                </button>
              </div>

              {/* 1. Basic Company Info */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Company Identity & GST Information</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Legal Business Name *</label>
                    <input
                      type="text"
                      value={businessProfile.legalName}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, legalName: e.target.value })}
                      placeholder="e.g. Vindywashini Enterprises Pvt Ltd"
                      className="w-full bg-slate-900 text-slate-100 px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Trade / Display Name (Printed on Bills)</label>
                    <input
                      type="text"
                      value={businessProfile.tradeName}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, tradeName: e.target.value })}
                      placeholder="e.g. Vindywashini Books"
                      className="w-full bg-slate-900 text-slate-100 px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">GSTIN (15 Digits)</label>
                    <input
                      type="text"
                      value={businessProfile.gstin}
                      onChange={(e) => handleBusinessGstinChange(e.target.value)}
                      placeholder="10AAAAA0000A1Z5"
                      maxLength={15}
                      className="w-full bg-slate-900 text-slate-100 font-mono px-3 py-2 rounded-lg border border-slate-700 uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">PAN Number (10 Digits)</label>
                    <input
                      type="text"
                      value={businessProfile.pan}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, pan: e.target.value.toUpperCase().trim() })}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      className="w-full bg-slate-900 text-slate-100 font-mono px-3 py-2 rounded-lg border border-slate-700 uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Invoice Number Prefix</label>
                    <input
                      type="text"
                      value={businessProfile.invoicePrefix}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, invoicePrefix: e.target.value })}
                      placeholder="e.g. VWB/ or INV/"
                      className="w-full bg-slate-900 text-slate-100 font-mono px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Default Bill Layout</label>
                    <select
                      value={businessProfile.defaultTemplate}
                      onChange={(e: any) => setBusinessProfile({ ...businessProfile, defaultTemplate: e.target.value })}
                      className="w-full bg-slate-900 text-slate-100 px-3 py-2 rounded-lg border border-slate-700 font-semibold"
                    >
                      <option value="A4">A4 Full Page Tax Invoice</option>
                      <option value="A5">A5 Compact (Half Page)</option>
                      <option value="POS-80">POS 80mm Thermal (3-inch roll)</option>
                      <option value="POS-58">POS 58mm Mini Thermal (2-inch roll)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Contact Information */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Contact Information (Printed on Invoice Header)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Business Phone / Mobile</label>
                    <input
                      type="text"
                      value={businessProfile.phone}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, phone: e.target.value })}
                      placeholder="+91 9876543210"
                      className="w-full bg-slate-900 text-slate-100 px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Business Email Address</label>
                    <input
                      type="email"
                      value={businessProfile.email}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, email: e.target.value })}
                      placeholder="contact@mycompany.com"
                      className="w-full bg-slate-900 text-slate-100 px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Website / Domain</label>
                    <input
                      type="text"
                      value={businessProfile.website}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, website: e.target.value })}
                      placeholder="www.mycompany.com"
                      className="w-full bg-slate-900 text-slate-100 px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Registered Address */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Registered Address</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-300">Address Line 1</label>
                    <input
                      type="text"
                      value={businessProfile.line1}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, line1: e.target.value })}
                      placeholder="Shop / Unit No., Building Name, Street"
                      className="w-full bg-slate-900 text-slate-100 px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">City / Town</label>
                    <input
                      type="text"
                      value={businessProfile.city}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, city: e.target.value })}
                      placeholder="e.g. Patna"
                      className="w-full bg-slate-900 text-slate-100 px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Pincode</label>
                    <input
                      type="text"
                      value={businessProfile.pincode}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, pincode: e.target.value })}
                      placeholder="800001"
                      className="w-full bg-slate-900 text-slate-100 px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">State</label>
                    <select
                      value={businessProfile.state}
                      onChange={(e) => {
                        const st = Object.values(INDIAN_STATES).find((s) => s.name === e.target.value);
                        setBusinessProfile({
                          ...businessProfile,
                          state: e.target.value,
                          stateCode: st?.code || '10',
                        });
                      }}
                      className="w-full bg-slate-900 text-slate-100 px-3 py-2 rounded-lg border border-slate-700"
                    >
                      {Object.values(INDIAN_STATES).map((s) => (
                        <option key={s.code} value={s.name}>
                          {s.code} - {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">State Code</label>
                    <input
                      type="text"
                      readOnly
                      value={businessProfile.stateCode}
                      className="w-full bg-slate-800 text-slate-400 font-mono px-3 py-2 rounded-lg border border-slate-700 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Bank & UPI Details */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Bank & UPI Settlement Details (Printed on Invoices with QR)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Bank Name</label>
                    <input
                      type="text"
                      value={businessProfile.bankName}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, bankName: e.target.value })}
                      placeholder="State Bank of India"
                      className="w-full bg-slate-900 text-slate-100 px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Account Number</label>
                    <input
                      type="text"
                      value={businessProfile.accountNo}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, accountNo: e.target.value })}
                      placeholder="38992019283"
                      className="w-full bg-slate-900 text-slate-100 font-mono px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">IFSC Code</label>
                    <input
                      type="text"
                      value={businessProfile.ifsc}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, ifsc: e.target.value.toUpperCase().trim() })}
                      placeholder="SBIN0001234"
                      className="w-full bg-slate-900 text-slate-100 font-mono uppercase px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Branch Name</label>
                    <input
                      type="text"
                      value={businessProfile.branch}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, branch: e.target.value })}
                      placeholder="Main Branch"
                      className="w-full bg-slate-900 text-slate-100 px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-300">UPI ID / VPA (Generates Dynamic Payment QR)</label>
                    <input
                      type="text"
                      value={businessProfile.upiId}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, upiId: e.target.value.trim() })}
                      placeholder="yourbusiness@upi"
                      className="w-full bg-slate-900 text-emerald-400 font-mono px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Company Logo & Terms */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Company Logo, Terms & Conditions</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Logo */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-slate-300">Company Logo (Embedded on Bills)</label>
                    <div className="flex items-center gap-4 bg-slate-900 p-3 rounded-lg border border-slate-700">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo Preview"
                          className="w-16 h-16 object-contain bg-white rounded p-1 border border-slate-600"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 text-[10px]">
                          No Logo
                        </div>
                      )}
                      <div className="space-y-1 flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              setLogoFile(file);
                              setLogoPreview(URL.createObjectURL(file));
                            }
                          }}
                          className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                        />
                        <p className="text-[10px] text-slate-500">Supports PNG, JPG, WEBP. Auto-converted to Base64 on bills.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">Default Terms & Conditions</label>
                    <textarea
                      rows={3}
                      value={businessProfile.termsAndConditions}
                      onChange={(e) => setBusinessProfile({ ...businessProfile, termsAndConditions: e.target.value })}
                      placeholder="1. Goods once sold will not be taken back..."
                      className="w-full bg-slate-900 text-slate-100 px-3 py-2 rounded-lg border border-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* 6. Danger Zone: Delete Company */}
                {activeCompany && (
                  <div className="bg-rose-950/30 border border-rose-900/60 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-rose-400">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                          Danger Zone: Delete Active Company
                        </h4>
                      </div>

                      <button
                        onClick={() => {
                          setShowDeleteModal(true);
                          setDeleteStep(1);
                          setDeleteConfirmationText('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/80 transition flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Company Entity</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-rose-300/80">
                      Permanently remove <b>{activeCompany.tradeName || activeCompany.legalName}</b> and completely wipe all its invoices, accounting ledgers, vouchers, items, and GST data.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 1. Database Tab */}
          {settingsTab === 'database' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>Database Engine & Cloud Connection</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Connect your accounting records to Supabase (PostgreSQL), MongoDB Atlas, AWS DocumentDB, or Local Compass.
                  </p>
                </div>

                <button
                  onClick={handleResetLocalDb}
                  disabled={testingDb}
                  className="text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-1.5 self-start sm:self-auto"
                  title="Reset to local offline database"
                >
                  <RefreshCw className="w-3 h-3 text-slate-400" />
                  <span>Reset to Local DB</span>
                </button>
              </div>

              {/* Status Banner */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isConnected
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      isConnected ? 'bg-emerald-400 animate-pulse shadow-md shadow-emerald-400/50' : 'bg-rose-500'
                    }`}
                  />
                  <div>
                    <div className="font-bold text-xs flex items-center gap-2">
                      <span>{isConnected ? 'Database Connected & Live' : 'Database Offline / Disconnected'}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900/80 border border-current font-mono uppercase">
                        {dbStatus?.provider === 'postgres'
                          ? 'PostgreSQL / Supabase'
                          : (mongoUriInput || '').includes('+srv')
                          ? 'Cloud Atlas (MongoDB)'
                          : (mongoUriInput || '').includes('docdb')
                          ? 'AWS DocumentDB'
                          : (mongoUriInput || '').includes('127.0.0.1')
                          ? 'Local MongoDB'
                          : 'MongoDB'}
                      </span>
                    </div>
                    <div className="text-[11px] opacity-80 font-mono mt-0.5 break-all">
                      Engine: {dbStatus?.provider === 'postgres' ? 'PostgreSQL' : 'MongoDB'} | Host: {dbStatus?.host || '127.0.0.1'} | DB: {dbStatus?.name || 'vindywashini_books'}
                    </div>
                    {dbStatus?.error && (
                      <div className="text-[10px] text-rose-400 mt-1 flex items-center gap-1 font-sans">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{dbStatus.error}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleTestDb()}
                  disabled={testingDb}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/60 transition flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingDb ? 'animate-spin' : ''}`} />
                  <span>{testingDb ? 'Connecting...' : 'Test & Connect'}</span>
                </button>
              </div>

              {/* Database Provider Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Choose Database Cloud Provider</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      id: 'supabase',
                      label: 'Supabase / Postgres',
                      sub: 'Session Pooler (IPv4)',
                      icon: Zap,
                      color: 'emerald',
                    },
                    {
                      id: 'atlas',
                      label: 'MongoDB Atlas',
                      sub: 'Cloud Cluster',
                      icon: Cloud,
                      color: 'emerald',
                    },
                    {
                      id: 'local',
                      label: 'Local MongoDB',
                      sub: 'Compass / Offline',
                      icon: Server,
                      color: 'sky',
                    },
                    {
                      id: 'aws',
                      label: 'AWS / Custom',
                      sub: 'Amazon / Direct URI',
                      icon: Globe,
                      color: 'amber',
                    },
                  ].map((p) => {
                    const Icon = p.icon;
                    const isSelected = dbProvider === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setDbProvider(p.id as any);
                          if (p.id === 'custom') setConnectionMode('uri');
                          else setConnectionMode('credentials');
                        }}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-950/50 border-emerald-500 shadow-md shadow-emerald-950/40 text-slate-100'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <Icon
                            className={`w-5 h-5 ${
                              isSelected ? 'text-emerald-400' : 'text-slate-500'
                            }`}
                          />
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-200">{p.label}</div>
                          <div className="text-[10px] text-slate-400">{p.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mode Toggle (Form Wizard vs Direct URI String) */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setConnectionMode('credentials')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition ${
                      connectionMode === 'credentials'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Credential Wizard
                  </button>
                  <button
                    onClick={() => setConnectionMode('uri')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition ${
                      connectionMode === 'uri'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Direct Connection String (URI)
                  </button>
                </div>

                <button
                  onClick={() => setShowDbPassword(!showDbPassword)}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
                >
                  {showDbPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showDbPassword ? 'Hide Passwords' : 'Show Passwords'}</span>
                </button>
              </div>

              {/* 1. Supabase / PostgreSQL Credential Form */}
              {connectionMode === 'credentials' && dbProvider === 'supabase' && (
                <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span>Supabase / PostgreSQL Cloud Database Credentials</span>
                    </h4>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 font-mono">
                      postgresql:// (Session Pooler)
                    </span>
                  </div>

                  {/* Inline Explainer / Notice Box */}
                  <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-800/80 text-sky-200 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-sky-300">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>Supabase Connection: Use Session Pooler (IPv4 Recommended)</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-sky-200/90">
                      Supabase offers two ways to connect: <strong>Direct Connection</strong> (requires IPv6, often blocked on home/office networks) and <strong>Session Pooler</strong> (works on standard IPv4 networks — recommended). This app uses the Session Pooler by default. Copy these values from your <strong>Supabase Dashboard → Connect button → Session Pooler tab</strong>.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Supabase Pooler Host (IPv4) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={supabaseHost}
                        onChange={(e) => setSupabaseHost(e.target.value)}
                        placeholder="aws-0-ap-northeast-1.pooler.supabase.com"
                        className="w-full bg-slate-900 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <p className="text-[10px] text-slate-500">
                        Found in Supabase Dashboard → <strong>Connect (top of project page) → Session Pooler tab</strong>. Use the Session Pooler host, not the direct connection host — direct connections require IPv6 and fail on most networks.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Port</label>
                      <input
                        type="text"
                        value={supabasePort}
                        onChange={(e) => setSupabasePort(e.target.value)}
                        placeholder="5432"
                        className="w-full bg-slate-900 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <p className="text-[10px] text-slate-500">
                        Default: <strong>5432</strong> (Session Pooler mode).
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Database User <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={supabaseUsername}
                        onChange={(e) => setSupabaseUsername(e.target.value)}
                        placeholder="postgres.<your-project-ref>"
                        className="w-full bg-slate-900 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <p className="text-[10px] text-slate-500">
                        For the Session Pooler, this is <code>postgres.&lt;your-project-ref&gt;</code>, not just <code>postgres</code>.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Database Password <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showDbPassword ? 'text' : 'password'}
                          value={supabasePassword}
                          onChange={(e) => setSupabasePassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full bg-slate-900 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Database Name</label>
                      <input
                        type="text"
                        value={supabaseDbName}
                        onChange={(e) => setSupabaseDbName(e.target.value)}
                        placeholder="postgres"
                        className="w-full bg-slate-900 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="sm:col-span-3 flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={supabaseSsl}
                          onChange={(e) => setSupabaseSsl(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Enable SSL Mode (Required for Supabase / Cloud Postgres)</span>
                      </label>
                    </div>
                  </div>

                  {/* Auto-constructed URI Preview */}
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400">Auto-constructed Connection URI (Read-Only):</span>
                    <div className="text-[11px] font-mono text-emerald-400 break-all select-all">
                      {showDbPassword ? getConstructedUri('supabase') : maskUri(getConstructedUri('supabase'))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleTestDb(getConstructedUri('supabase'), 'postgres')}
                    disabled={testingDb || !supabaseHost}
                    className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingDb ? 'animate-spin' : ''}`} />
                    <span>Save & Connect to Supabase / PostgreSQL</span>
                  </button>
                </div>
              )}

              {/* 2. MongoDB Atlas Credential Form */}
              {connectionMode === 'credentials' && dbProvider === 'atlas' && (
                <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Cloud className="w-4 h-4 text-emerald-400" />
                      <span>MongoDB Atlas Cloud Cluster Credentials</span>
                    </h4>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                      mongodb+srv://
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Cluster Host / SRV Domain <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={atlasCluster}
                        onChange={(e) => setAtlasCluster(e.target.value)}
                        placeholder="cluster0.abcde.mongodb.net"
                        className="w-full bg-slate-900 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <p className="text-[10px] text-slate-500">
                        SRV cluster host from MongoDB Atlas Dashboard (e.g. <code>cluster0.xxxxx.mongodb.net</code>). No port required.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Database Username <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={atlasUsername}
                        onChange={(e) => setAtlasUsername(e.target.value)}
                        placeholder="e.g. admin"
                        className="w-full bg-slate-900 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Database Password <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showDbPassword ? 'text' : 'password'}
                          value={atlasPassword}
                          onChange={(e) => setAtlasPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full bg-slate-900 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Database Name</label>
                      <input
                        type="text"
                        value={atlasDbName}
                        onChange={(e) => setAtlasDbName(e.target.value)}
                        placeholder="vindywashini_books"
                        className="w-full bg-slate-900 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">App Name (Optional)</label>
                      <input
                        type="text"
                        value={atlasAppName}
                        onChange={(e) => setAtlasAppName(e.target.value)}
                        placeholder="VindywashiniBooks"
                        className="w-full bg-slate-900 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Auto-constructed URI Preview */}
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400">Auto-constructed Connection URI (Read-Only):</span>
                    <div className="text-[11px] font-mono text-emerald-400 break-all select-all">
                      {showDbPassword ? getConstructedUri('atlas') : maskUri(getConstructedUri('atlas'))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleTestDb(getConstructedUri('atlas'), 'mongodb')}
                    disabled={testingDb || !atlasCluster || !atlasUsername}
                    className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingDb ? 'animate-spin' : ''}`} />
                    <span>Save & Connect to Atlas</span>
                  </button>
                </div>
              )}

              {/* 3. AWS DocumentDB Form */}
              {connectionMode === 'credentials' && dbProvider === 'aws' && (
                <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-amber-400" />
                      <span>AWS DocumentDB Cluster Credentials</span>
                    </h4>
                    <span className="text-[10px] text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                      Amazon AWS DocumentDB
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        AWS Cluster Endpoint / Host <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={awsHost}
                        onChange={(e) => setAwsHost(e.target.value)}
                        placeholder="docdb-cluster.cluster-xyz.us-east-1.docdb.amazonaws.com"
                        className="w-full bg-slate-900 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Port</label>
                      <input
                        type="text"
                        value={awsPort}
                        onChange={(e) => setAwsPort(e.target.value)}
                        placeholder="27017"
                        className="w-full bg-slate-900 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Username</label>
                      <input
                        type="text"
                        value={awsUsername}
                        onChange={(e) => setAwsUsername(e.target.value)}
                        placeholder="masterUser"
                        className="w-full bg-slate-900 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Password</label>
                      <input
                        type={showDbPassword ? 'text' : 'password'}
                        value={awsPassword}
                        onChange={(e) => setAwsPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-900 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Database Name</label>
                      <input
                        type="text"
                        value={awsDbName}
                        onChange={(e) => setAwsDbName(e.target.value)}
                        placeholder="vindywashini_books"
                        className="w-full bg-slate-900 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="sm:col-span-3 flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={awsTls}
                          onChange={(e) => setAwsTls(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Enable TLS / SSL Connection (Recommended for AWS DocumentDB)</span>
                      </label>
                    </div>
                  </div>

                  {/* Auto-constructed URI Preview */}
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400">Auto-constructed Connection URI (Read-Only):</span>
                    <div className="text-[11px] font-mono text-emerald-400 break-all select-all">
                      {showDbPassword ? getConstructedUri('aws') : maskUri(getConstructedUri('aws'))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleTestDb(getConstructedUri('aws'), 'mongodb')}
                    disabled={testingDb || !awsHost}
                    className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingDb ? 'animate-spin' : ''}`} />
                    <span>Save & Connect to AWS DocumentDB</span>
                  </button>
                </div>
              )}

              {/* 4. Local MongoDB Form */}
              {connectionMode === 'credentials' && dbProvider === 'local' && (
                <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Server className="w-4 h-4 text-sky-400" />
                      <span>Local MongoDB Compass Instance</span>
                    </h4>
                    <span className="text-[10px] text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
                      Offline / Desktop Storage
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Host / IP</label>
                      <input
                        type="text"
                        value={localHost}
                        onChange={(e) => setLocalHost(e.target.value)}
                        placeholder="127.0.0.1"
                        className="w-full bg-slate-900 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Port</label>
                      <input
                        type="text"
                        value={localPort}
                        onChange={(e) => setLocalPort(e.target.value)}
                        placeholder="27017"
                        className="w-full bg-slate-900 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Database Name</label>
                      <input
                        type="text"
                        value={localDbName}
                        onChange={(e) => setLocalDbName(e.target.value)}
                        placeholder="vindywashini_books"
                        className="w-full bg-slate-900 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Auto-constructed URI Preview */}
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400">Auto-constructed Connection URI (Read-Only):</span>
                    <div className="text-[11px] font-mono text-emerald-400 break-all select-all">
                      {getConstructedUri('local')}
                    </div>
                  </div>

                  <button
                    onClick={() => handleTestDb(getConstructedUri('local'), 'mongodb')}
                    disabled={testingDb}
                    className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950 transition flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testingDb ? 'animate-spin' : ''}`} />
                    <span>Connect to Local MongoDB Engine</span>
                  </button>
                </div>
              )}

              {/* Direct URI / Custom String Mode */}
              {connectionMode === 'uri' && (
                <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      {dbProvider === 'supabase' ? (
                        <Zap className="w-4 h-4 text-emerald-400" />
                      ) : dbProvider === 'atlas' ? (
                        <Cloud className="w-4 h-4 text-emerald-400" />
                      ) : dbProvider === 'aws' ? (
                        <Globe className="w-4 h-4 text-amber-400" />
                      ) : dbProvider === 'local' ? (
                        <Server className="w-4 h-4 text-sky-400" />
                      ) : (
                        <Zap className="w-4 h-4 text-purple-400" />
                      )}
                      <span>
                        {dbProvider === 'supabase'
                          ? 'Direct Connection String — Supabase / PostgreSQL'
                          : dbProvider === 'atlas'
                          ? 'Direct Connection String — MongoDB Atlas Cluster'
                          : dbProvider === 'aws'
                          ? 'Direct Connection String — AWS DocumentDB'
                          : dbProvider === 'local'
                          ? 'Direct Connection String — Local MongoDB Instance'
                          : 'Direct Custom Database Connection URI'}
                      </span>
                    </h4>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border font-mono font-semibold ${
                        dbProvider === 'supabase'
                          ? 'text-emerald-400 bg-emerald-950/80 border-emerald-800'
                          : dbProvider === 'local'
                          ? 'text-sky-400 bg-sky-950/80 border-sky-800'
                          : dbProvider === 'aws'
                          ? 'text-amber-400 bg-amber-950/80 border-amber-800'
                          : 'text-purple-400 bg-purple-950/80 border-purple-800'
                      }`}
                    >
                      {dbProvider === 'supabase'
                        ? 'postgresql:// (Session Pooler)'
                        : dbProvider === 'atlas'
                        ? 'mongodb+srv://'
                        : dbProvider === 'aws'
                        ? 'mongodb:// (TLS)'
                        : dbProvider === 'local'
                        ? 'mongodb:// (Offline)'
                        : 'Auto-Detects Engine'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">
                      {dbProvider === 'supabase'
                        ? 'Supabase PostgreSQL Connection URI'
                        : dbProvider === 'atlas'
                        ? 'MongoDB Atlas Connection URI'
                        : dbProvider === 'aws'
                        ? 'AWS DocumentDB Connection URI'
                        : dbProvider === 'local'
                        ? 'Local MongoDB Connection URI'
                        : 'Full Database Connection URI'}{' '}
                      <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={dbProvider === 'supabase' ? postgresUriInput : (postgresUriInput || mongoUriInput)}
                      onChange={(e) => {
                        const val = e.target.value;
                        const trimmed = val.trim();
                        if (trimmed.startsWith('postgresql://') || trimmed.startsWith('postgres://')) {
                          setPostgresUriInput(val);
                          setDbProvider('supabase');
                        } else if (trimmed.startsWith('mongodb://') || trimmed.startsWith('mongodb+srv://')) {
                          setMongoUriInput(val);
                          if (dbProvider === 'supabase') setDbProvider('atlas');
                        } else {
                          if (dbProvider === 'supabase') {
                            setPostgresUriInput(val);
                          } else {
                            setMongoUriInput(val);
                          }
                        }
                      }}
                      className="w-full bg-slate-900 text-slate-100 text-xs px-3 py-2.5 rounded-lg border border-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder={
                        dbProvider === 'supabase'
                          ? 'postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require'
                          : dbProvider === 'atlas'
                          ? 'mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/vindywashini_books?retryWrites=true&w=majority'
                          : dbProvider === 'aws'
                          ? 'mongodb://<username>:<password>@docdb-cluster.cluster-xyz.us-east-1.docdb.amazonaws.com:27017/vindywashini_books?tls=true&replicaSet=rs0'
                          : dbProvider === 'local'
                          ? 'mongodb://127.0.0.1:27017/vindywashini_books'
                          : 'postgresql://... or mongodb+srv://...'
                      }
                    />
                    <p className="text-[11px] text-slate-400">
                      {dbProvider === 'supabase'
                        ? 'Paste your Supabase connection URI — use the Session Pooler string from Dashboard → Connect → Session Pooler, not the Direct Connection string (which requires IPv6).'
                        : dbProvider === 'atlas'
                        ? 'Paste your complete MongoDB Atlas connection URI string (mongodb+srv://...) from Atlas Dashboard → Connect → Connect your application.'
                        : dbProvider === 'aws'
                        ? 'Paste your AWS DocumentDB connection URI string with tls=true and replica set parameters.'
                        : dbProvider === 'local'
                        ? 'Paste your local MongoDB instance URI string (e.g. mongodb://127.0.0.1:27017/vindywashini_books).'
                        : 'Paste your complete database connection URI. Both PostgreSQL (postgresql://...) and MongoDB (mongodb:// or mongodb+srv://...) are supported.'}
                    </p>

                    {dbProvider === 'supabase' &&
                      postgresUriInput.includes('.supabase.co') &&
                      postgresUriInput.includes('db.') && (
                        <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-lg text-amber-200 text-xs flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-bold text-amber-300">IPv6 Direct Connection Notice</p>
                            <p className="text-[11px] text-amber-200/90 leading-relaxed">
                              This URI uses Supabase's Direct Connection host (<code>db.&lt;ref&gt;.supabase.co</code>), which requires IPv6 routing and fails on most home/office networks. If connection fails, switch to the <strong>Session Pooler URI</strong> (<code>postgresql://postgres.&lt;ref&gt;:password@aws-0-&lt;region&gt;.pooler.supabase.com:5432/postgres?sslmode=require</code>) or use the <strong>Credential Wizard</strong> tab.
                            </p>
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Password Encoding Helper for Special Characters */}
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Encode Password Helper (For passwords containing @, #, %, spaces, etc.)</span>
                      </span>
                      <span className="text-[10px] text-slate-500">Auto-replaces password in URI</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={rawPasswordToEncode}
                        onChange={(e) => setRawPasswordToEncode(e.target.value)}
                        placeholder={
                          dbProvider === 'supabase'
                            ? 'Type raw password (e.g. MyPass@123#) — will insert into postgresql:// string'
                            : 'Type raw password (e.g. MyPass@123#) — will insert into mongodb:// string'
                        }
                        className="flex-1 bg-slate-950 text-slate-100 text-xs px-3 py-1.5 rounded-lg border border-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleEncodeAndInsertPassword(rawPasswordToEncode)}
                        disabled={!rawPasswordToEncode}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-1 shrink-0"
                      >
                        <span>Encode & Insert into URI</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        const targetUri = (dbProvider === 'supabase' ? postgresUriInput : (postgresUriInput || mongoUriInput)).trim();
                        const isPg = targetUri.startsWith('postgresql://') || targetUri.startsWith('postgres://') || dbProvider === 'supabase';
                        handleTestDb(targetUri, isPg ? 'postgres' : 'mongodb');
                      }}
                      disabled={testingDb}
                      className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950 transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testingDb ? 'animate-spin' : ''}`} />
                      <span>
                        {dbProvider === 'supabase'
                          ? 'Save & Connect to Supabase / PostgreSQL'
                          : dbProvider === 'atlas'
                          ? 'Save & Connect to MongoDB Atlas'
                          : dbProvider === 'aws'
                          ? 'Save & Connect to AWS DocumentDB'
                          : dbProvider === 'local'
                          ? 'Connect to Local MongoDB Engine'
                          : 'Connect Database String'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Sample Demo Data Manager */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold text-slate-200">Sample Demo Data (Manual Trigger Only)</h4>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                    Non-Destructive & Non-Additive on Updates
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  Sample store demo records (Maa Vindywashini Hardware, sample ledgers, items, and parties) are never inserted automatically during app updates or database connections. You can load or clean them anytime below:
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    onClick={handleLoadSampleData}
                    disabled={isLoadingSampleData}
                    className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isLoadingSampleData ? 'animate-spin' : ''}`} />
                    <span>{isLoadingSampleData ? 'Loading Sample Data...' : 'Load Sample Demo Data'}</span>
                  </button>

                  <button
                    onClick={handleCleanSampleData}
                    disabled={isCleaningSampleData}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-200 hover:text-rose-200 text-xs font-semibold border border-slate-700 hover:border-rose-700 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>{isCleaningSampleData ? 'Cleaning...' : 'Remove Sample Demo Data'}</span>
                  </button>
                </div>
              </div>

              {/* Cross-Database Data Migration & Snapshot Box */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-slate-200">Cross-Database Data Migration & Snapshots</h4>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                    Active: {dbStatus?.provider === 'postgres' ? 'PostgreSQL' : 'MongoDB'}
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  Transfer all your companies, ledgers, vouchers, items, and invoices between MongoDB and Supabase PostgreSQL in 1-Click with full balance recalculation.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    onClick={handleMigrateDatabase}
                    disabled={isMigratingDb}
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isMigratingDb ? 'animate-spin' : ''}`} />
                    <span>{isMigratingDb ? 'Migrating Data...' : '1-Click Migrate Data to Selected DB'}</span>
                  </button>

                  <a
                    href={api.getExportSnapshotUrl(activeCompany?._id)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download JSON Snapshot</span>
                  </a>
                </div>
              </div>

              {/* Dynamic Live Connection String Preview */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                    <Key className="w-3 h-3 text-emerald-400" />
                    <span>Constructed Database Target URI:</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Auto-saved upon connection</span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400 break-all select-all">
                  {showDbPassword
                    ? getConstructedUri()
                    : getConstructedUri().replace(/:([^:@]+)@/, ':••••••••@')}
                </div>
              </div>
            </div>
          )}

          {/* 2. Email SMTP Tab */}
          {settingsTab === 'email' && (
            <div className="space-y-5">
              <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-sky-400" />
                    <span>Nodemailer SMTP Email Settings</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Send invoice PDFs and receipts directly to customers via Gmail or Business SMTP
                  </p>
                </div>

                <button
                  onClick={handleTestSMTP}
                  disabled={testingSmtp}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-sky-400 text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{testingSmtp ? 'Sending Test...' : 'Test SMTP'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">SMTP Host</label>
                  <input
                    type="text"
                    value={smtpConfig.host}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700"
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">SMTP Port</label>
                  <input
                    type="number"
                    value={smtpConfig.port}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, port: Number(e.target.value) })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                    placeholder="587"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">SMTP Username / Email</label>
                  <input
                    type="email"
                    value={smtpConfig.user}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700"
                    placeholder="billing@yourbusiness.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Password / Gmail App Password</label>
                  <input
                    type="password"
                    value={smtpConfig.pass}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                    placeholder="••••••••••••"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Sender Display Name</label>
                  <input
                    type="text"
                    value={smtpConfig.fromName}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700"
                    placeholder="MAA VINDYWASHINI HARDWARE"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">From Email Address</label>
                  <input
                    type="email"
                    value={smtpConfig.fromEmail}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700"
                    placeholder="billing@vindywashinibooks.local"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. WhatsApp Tab */}
          {settingsTab === 'whatsapp' && (
            <div className="space-y-5">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp Invoice Delivery Configuration</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Supports zero-setup instant `wa.me` browser deep links and Meta WhatsApp Business Cloud API
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setWhatsappConfig({ ...whatsappConfig, mode: 'fallback' })}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    whatsappConfig.mode === 'fallback'
                      ? 'bg-emerald-950/40 border-emerald-600 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-100 flex items-center justify-between">
                    <span>Zero-Setup wa.me Deep Links (Default)</span>
                    {whatsappConfig.mode === 'fallback' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Opens WhatsApp Desktop / Web with pre-filled greeting message. Works instantly with zero credentials.
                  </p>
                </div>

                <div
                  onClick={() => setWhatsappConfig({ ...whatsappConfig, mode: 'cloud_api' })}
                  className={`p-4 rounded-xl border cursor-pointer transition ${
                    whatsappConfig.mode === 'cloud_api'
                      ? 'bg-emerald-950/40 border-emerald-600 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-100 flex items-center justify-between">
                    <span>Meta Cloud API (Automated)</span>
                    {whatsappConfig.mode === 'cloud_api' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Sends automated WhatsApp messages with document attachment via your registered Meta Business Account.
                  </p>
                </div>
              </div>

              {/* Cloud API Fields */}
              {whatsappConfig.mode === 'cloud_api' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Meta Access Token</label>
                    <input
                      type="password"
                      value={whatsappConfig.accessToken}
                      onChange={(e) => setWhatsappConfig({ ...whatsappConfig, accessToken: e.target.value })}
                      className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                      placeholder="EAA..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Phone Number ID</label>
                    <input
                      type="text"
                      value={whatsappConfig.phoneNumberId}
                      onChange={(e) => setWhatsappConfig({ ...whatsappConfig, phoneNumberId: e.target.value })}
                      className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                      placeholder="1092837465"
                    />
                  </div>
                </div>
              )}

              {/* Default Greeting Template */}
              <div className="space-y-1 pt-2">
                <label className="text-xs font-semibold text-slate-300">Default Greeting Message Template</label>
                <textarea
                  rows={3}
                  value={whatsappConfig.defaultGreetingTemplate}
                  onChange={(e) =>
                    setWhatsappConfig({ ...whatsappConfig, defaultGreetingTemplate: e.target.value })
                  }
                  className="w-full bg-slate-800 text-slate-100 text-xs p-3 rounded-lg border border-slate-700"
                />
                <div className="text-[10px] text-slate-400 flex flex-wrap gap-2">
                  <span>Variables:</span>
                  <span className="font-mono text-emerald-400">{`{CustomerName}`}</span>
                  <span className="font-mono text-emerald-400">{`{CompanyName}`}</span>
                  <span className="font-mono text-emerald-400">{`{InvoiceNo}`}</span>
                  <span className="font-mono text-emerald-400">{`{Date}`}</span>
                  <span className="font-mono text-emerald-400">{`{Amount}`}</span>
                  <span className="font-mono text-indigo-400">{`{SignedURL}`}</span>
                  <span className="font-mono text-indigo-400">{`{InvoiceLink}`}</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Cloud Storage Tab (Supabase Storage) */}
          {settingsTab === 'storage' && (
            <div className="space-y-5">
              <div className="border-b border-slate-800 pb-3 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-indigo-400" />
                    <span>Cloud Storage & Invoice Link Delivery (Supabase Storage)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Upload generated invoice PDFs to private Supabase Storage buckets and attach secure signed download links in WhatsApp & Email delivery
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFetchStorageUsage}
                    disabled={loadingUsage}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs border border-slate-700 transition"
                    title="Refresh Storage Usage"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingUsage ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Security Banner */}
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/60 flex items-start gap-3">
                <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-200/90 leading-relaxed">
                  <span className="font-bold text-indigo-100">Private Bucket Architecture: </span>
                  Storage uploads and signed URL generations execute strictly inside your local backend server. Service role credentials are encrypted server-side and never exposed to the frontend bundle.
                </div>
              </div>

              {/* Enable Storage Toggle */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <span>Enable Cloud Storage Uploads (Master Gate)</span>
                    {storageConfig.enabled && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Master gate for cloud uploads. When enabled, opt-in checkboxes appear during invoice creation, Bulk PDF export, and GST summary reports to upload and generate secure shareable links.
                  </p>
                </div>


                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storageConfig.enabled}
                    onChange={(e) => setStorageConfig({ ...storageConfig, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Credentials & Bucket Config */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Supabase Project URL</label>
                  <input
                    type="text"
                    value={storageConfig.supabaseUrl}
                    onChange={(e) => setStorageConfig({ ...storageConfig, supabaseUrl: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                    placeholder="https://xyzcompany.supabase.co"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Storage Bucket Name</label>
                  <input
                    type="text"
                    value={storageConfig.bucketName}
                    onChange={(e) => setStorageConfig({ ...storageConfig, bucketName: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                    placeholder="Vindywashini Book"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-400">Supabase Service Role Key (Secret)</label>
                    <button
                      type="button"
                      onClick={() => setShowStorageKey(!showStorageKey)}
                      className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                    >
                      {showStorageKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showStorageKey ? 'Hide Secret' : 'Reveal Secret'}</span>
                    </button>
                  </div>
                  <input
                    type={showStorageKey ? 'text' : 'password'}
                    value={storageConfig.serviceRoleKey}
                    onChange={(e) => setStorageConfig({ ...storageConfig, serviceRoleKey: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Signed Download Link Validity</label>
                  <select
                    value={storageConfig.signedUrlExpiryDays}
                    onChange={(e) =>
                      setStorageConfig({ ...storageConfig, signedUrlExpiryDays: Number(e.target.value) })
                    }
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-bold"
                  >
                    <option value={7}>7 Days</option>
                    <option value={30}>30 Days (Recommended)</option>
                    <option value={90}>90 Days</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Automatic Storage Cleanup Policy</label>
                  <select
                    value={storageConfig.autoCleanupDays}
                    onChange={(e) =>
                      setStorageConfig({ ...storageConfig, autoCleanupDays: Number(e.target.value) })
                    }
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-bold"
                  >
                    <option value={0}>Disabled (Keep All Copies)</option>
                    <option value={90}>Delete Cloud Copies Older than 90 Days</option>
                    <option value={180}>Delete Cloud Copies Older than 180 Days</option>
                    <option value={365}>Delete Cloud Copies Older than 1 Year</option>
                  </select>
                </div>
              </div>

              {/* Optional Link Shortener Toggle (TinyURL) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5 max-w-xl">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <span>Use Short Links for WhatsApp & Email (TinyURL)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-semibold">
                      Opt-In / 3rd-Party
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Wrap Supabase signed URLs with TinyURL for a shorter message text.
                    <span className="text-amber-400 font-medium ml-1">
                      Note: This routes link clicks through a free external third-party service (TinyURL). Default OFF is recommended for direct Supabase reliability.
                    </span>
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={storageConfig.useShortLinks}
                    onChange={(e) => setStorageConfig({ ...storageConfig, useShortLinks: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Storage Usage Indicator (50MB Plan Limit Guard) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-200">Supabase Storage Usage Budget</span>
                  </div>
                  {storageUsage?.configured ? (
                    <span className="text-xs font-mono font-bold text-slate-300">
                      {(storageUsage.totalBytes / 1024 / 1024).toFixed(2)} MB / 50 MB ({storageUsage.percentUsed}%)
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">Not connected yet</span>
                  )}
                </div>

                {storageUsage?.configured && (
                  <div className="space-y-2">
                    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          storageUsage.percentUsed >= 80 ? 'bg-rose-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.max(2, storageUsage.percentUsed)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Total Invoices Stored: <b className="text-slate-200 font-mono">{storageUsage.totalFiles}</b></span>
                      <span>Plan: <b className="text-slate-200">Supabase Free Tier (50 MB)</b></span>
                    </div>

                    {storageUsage.warning && (
                      <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 flex items-start gap-2 text-xs text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <b>High Usage Notice:</b> Your bucket is over 80% full ({storageUsage.percentUsed}%). Run storage cleanup below or upgrade your Supabase plan to avoid upload failures.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-1 flex flex-wrap gap-2">
                  <button
                    onClick={handleRunStorageCleanup}
                    disabled={cleaningStorage || !storageConfig.enabled}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Trash2 className={`w-3.5 h-3.5 ${cleaningStorage ? 'animate-spin' : ''}`} />
                    <span>{cleaningStorage ? 'Cleaning...' : 'Run Storage Cleanup Now'}</span>
                  </button>

                  <button
                    onClick={handleCleanupLegacyStorage}
                    disabled={cleaningLegacy || !storageConfig.enabled}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
                    title="Remove older test .html and healthcheck files from bucket"
                  >
                    <Trash2 className={`w-3.5 h-3.5 ${cleaningLegacy ? 'animate-spin' : ''}`} />
                    <span>{cleaningLegacy ? 'Purging Legacy...' : 'Purge Old .HTML Test Files'}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={handleTestStorage}
                  disabled={testingStorage}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-950/80 active:scale-95 transition disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${testingStorage ? 'animate-spin' : ''}`} />
                  <span>{testingStorage ? 'Testing Storage Bucket...' : 'Test Storage Connection & Bucket Access'}</span>
                </button>
              </div>
            </div>
          )}

          {/* 5. GSP e-Filing Interface Tab */}
          {settingsTab === 'gsp' && (
            <div className="space-y-5">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Pluggable GSP (GST Suvidha Provider) Connector</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Connect third-party ASP/GSP credentials (Cygnet, ClearTax, Taxbase) for direct one-click e-filing to the GST Portal
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">GSP Provider</label>
                  <input
                    type="text"
                    value={gspConfig.provider}
                    onChange={(e) => setGspConfig({ ...gspConfig, provider: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Environment</label>
                  <select
                    value={gspConfig.environment}
                    onChange={(e: any) => setGspConfig({ ...gspConfig, environment: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-bold"
                  >
                    <option value="sandbox">Sandbox (Testing / Simulation)</option>
                    <option value="production">Production (Live Portal)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">GSP Client ID</label>
                  <input
                    type="text"
                    value={gspConfig.clientId}
                    onChange={(e) => setGspConfig({ ...gspConfig, clientId: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                    placeholder="client_12345"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">GSP Client Secret</label>
                  <input
                    type="password"
                    value={gspConfig.clientSecret}
                    onChange={(e) => setGspConfig({ ...gspConfig, clientSecret: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="gsp-enable"
                  checked={gspConfig.enabled}
                  onChange={(e) => setGspConfig({ ...gspConfig, enabled: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="gsp-enable" className="text-xs font-bold text-slate-300">
                  Enable direct GSP transmission in GST Returns View
                </label>
              </div>
            </div>
          )}

          {/* 5. FY Lock Tab */}
          {settingsTab === 'fy-lock' && (
            <div className="space-y-5">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Financial Year Locking Security</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Prevent accidental edits or retroactive voucher modifications in audited financial years
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="space-y-1 flex-1">
                    <label className="text-xs font-semibold text-slate-400">Select Financial Year</label>
                    <select
                      value={selectedFyToLock}
                      onChange={(e) => setSelectedFyToLock(e.target.value)}
                      className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                    >
                      <option value="2023-2024">FY 2023-2024</option>
                      <option value="2024-2025">FY 2024-2025</option>
                      <option value="2025-2026">FY 2025-2026 (Current)</option>
                    </select>
                  </div>

                  <div className="flex items-end gap-2 pt-5">
                    <button
                      onClick={() => handleToggleLockFY(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lock FY</span>
                    </button>

                    <button
                      onClick={() => handleToggleLockFY(false)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs border border-slate-700 transition"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Unlock FY</span>
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400">
                  Currently Locked FYs:{' '}
                  <span className="font-mono text-amber-400 font-bold">
                    {activeCompany?.lockedFYs?.join(', ') || 'None (All unlocked)'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 6. Backup & Restore Tab */}
          {settingsTab === 'backup' && (
            <div className="space-y-5">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Database Backup & Restore</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Export complete company ledgers, vouchers, items, and settings as a standalone JSON backup archive
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Export Card */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>Create One-Click Backup</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Download full offline database archive onto your disk.
                    </p>
                  </div>

                  <a
                    href={api.getBackupDownloadUrl(activeCompany?._id)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Database Backup</span>
                  </a>
                </div>

                {/* Restore Card */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-sky-400" />
                      <span>Restore from JSON File</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Select a previously exported `.json` backup file to restore records.
                    </p>
                  </div>

                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                    className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-slate-800 file:text-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 7. App Updates Tab */}
          {settingsTab === 'updates' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
                  <span>Software Updates & GitHub Releases</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Automatic background updates powered by electron-updater and GitHub Releases.
                </p>
              </div>

              {/* Version & Status Card */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-200">
                        Vindywashini Books Desktop
                      </h4>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80 font-mono text-xs font-bold">
                        v{appVersion}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <span>Source Repository:</span>
                      <a
                        href="https://github.com/Aditya-tmu/invoice-generator"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                      >
                        <span>Aditya-tmu/invoice-generator</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>

                  <button
                    onClick={handleCheckUpdates}
                    disabled={isCheckingUpdate || isDownloadingUpdate}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/80 active:scale-95 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                    <span>{isCheckingUpdate ? 'Checking...' : 'Check for Updates'}</span>
                  </button>
                </div>

                {/* Status Feedback Display */}
                {updateStatus && (
                  <div className="mt-4 pt-4 border-t border-slate-800/80">
                    {updateStatus.status === 'checking' && (
                      <div className="flex items-center gap-2.5 text-xs text-slate-300">
                        <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                        <span>Contacting GitHub Releases to check for newer versions...</span>
                      </div>
                    )}

                    {updateStatus.status === 'not-available' && (
                      <div className="flex items-center gap-2.5 text-xs text-emerald-400 bg-emerald-950/40 p-3 rounded-lg border border-emerald-800/60">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>You are on the latest version (v{appVersion}). No new updates available.</span>
                      </div>
                    )}

                    {updateStatus.status === 'available' && (
                      <div className="space-y-3 bg-slate-900 p-4 rounded-lg border border-emerald-500/40">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold text-slate-200">
                              New Version Available: v{updateStatus.version}
                            </span>
                          </div>
                          {updateStatus.releaseDate && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(updateStatus.releaseDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {updateStatus.releaseNotes && (
                          <div className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800 whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {typeof updateStatus.releaseNotes === 'string'
                              ? updateStatus.releaseNotes
                              : JSON.stringify(updateStatus.releaseNotes)}
                          </div>
                        )}

                        <button
                          onClick={handleDownloadUpdate}
                          disabled={isDownloadingUpdate}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow transition disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{isDownloadingUpdate ? 'Downloading in Background...' : 'Download Update Now'}</span>
                        </button>
                      </div>
                    )}

                    {updateStatus.status === 'downloading' && (
                      <div className="space-y-2 bg-slate-900 p-4 rounded-lg border border-slate-800">
                        <div className="flex justify-between text-xs text-slate-300 font-semibold">
                          <span className="flex items-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                            <span>Downloading update v{updateStatus.version || ''}...</span>
                          </span>
                          <span className="font-mono text-emerald-400">{updateStatus.percent || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${updateStatus.percent || 0}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>
                            {updateStatus.transferred
                              ? `${(updateStatus.transferred / 1024 / 1024).toFixed(1)} MB / ${(
                                  (updateStatus.total || 0) /
                                  1024 /
                                  1024
                                ).toFixed(1)} MB`
                              : ''}
                          </span>
                          <span>
                            {updateStatus.bytesPerSecond
                              ? `${(updateStatus.bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`
                              : ''}
                          </span>
                        </div>
                      </div>
                    )}

                    {updateStatus.status === 'downloaded' && (
                      <div className="space-y-3 bg-emerald-950/40 p-4 rounded-lg border border-emerald-800/80">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Update v{updateStatus.version} downloaded successfully!</span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Restart the application now to apply the update and start using the new version.
                        </p>
                        <button
                          onClick={handleQuitAndInstall}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow transition active:scale-95"
                        >
                          <ArrowUpCircle className="w-3.5 h-3.5" />
                          <span>Restart & Install Update Now</span>
                        </button>
                      </div>
                    )}

                    {updateStatus.status === 'error' && (
                      <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-950/40 p-3 rounded-lg border border-rose-800/60">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{updateStatus.error || 'Failed to check or download update'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Publisher Guide Card */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>How to Publish New Releases (for Developers)</span>
                </h4>
                <div className="text-[11px] text-slate-400 space-y-2 leading-relaxed font-mono bg-slate-900 p-3.5 rounded-lg border border-slate-800">
                  <p className="text-slate-300 font-sans font-semibold">1. Bump version in package.json (e.g. 1.0.1)</p>
                  <p className="text-slate-300 font-sans font-semibold">2. Run publish with your GitHub Token:</p>
                  <div className="bg-slate-950 px-3 py-2 rounded text-emerald-400">
                    $env:GH_TOKEN="your_github_personal_access_token"<br />
                    npm run dist:publish
                  </div>
                  <p className="text-slate-300 font-sans font-semibold">3. All installed desktop users will automatically receive and download the update!</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2-STEP DELETE MODAL IN SETTINGS */}
      {showDeleteModal && activeCompany && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-600/80 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-5">
            {/* Step 1 */}
            {deleteStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-rose-400">
                  <div className="p-3 bg-rose-950/80 rounded-xl border border-rose-700/60">
                    <AlertTriangle className="w-6 h-6 text-rose-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-100">Delete Current Company? (Step 1/2)</h3>
                    <p className="text-xs text-rose-400 font-semibold">Destructive Action</p>
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
                  <p>
                    Are you sure you want to delete <b className="text-white">{activeCompany.tradeName || activeCompany.legalName}</b>?
                  </p>
                  <p className="text-rose-300/90 text-[11px] leading-relaxed">
                    ⚠️ <b>Warning:</b> All invoices, ledgers, vouchers, items, and settings for this company will be permanently destroyed.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteStep(1);
                      setDeleteConfirmationText('');
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setDeleteStep(2)}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950 transition flex items-center gap-1.5"
                  >
                    <span>Proceed to Verification (Step 2)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {deleteStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-rose-500">
                  <div className="p-3 bg-rose-950/90 rounded-xl border border-rose-600 animate-pulse">
                    <Trash2 className="w-6 h-6 text-rose-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-rose-400">Final Verification (Step 2/2)</h3>
                    <p className="text-xs text-slate-400">This action CANNOT be undone!</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <p className="text-slate-300">
                    To confirm permanent deletion of <b className="text-rose-300">{activeCompany.tradeName || activeCompany.legalName}</b>, please type <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">DELETE</code> below:
                  </p>
                  <input
                    type="text"
                    autoFocus
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    placeholder="Type DELETE to permanently erase"
                    className="w-full bg-slate-950 text-slate-100 font-mono text-xs px-3 py-2.5 rounded-lg border-2 border-rose-500/60 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteStep(1);
                      setDeleteConfirmationText('');
                    }}
                    disabled={isDeletingCompany}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Abort / Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!activeCompany) return;
                      try {
                        setIsDeletingCompany(true);
                        await api.deleteCompany(activeCompany._id);
                        showToast(
                          `Company "${activeCompany.tradeName || activeCompany.legalName}" deleted successfully.`,
                          'success'
                        );
                        await fetchCompanies();
                        const updatedList = useAppStore.getState().companies;
                        if (updatedList && updatedList.length > 0) {
                          setActiveCompany(updatedList[0]);
                        } else {
                          setActiveCompany(null as any);
                        }
                        setShowDeleteModal(false);
                        setDeleteStep(1);
                        setDeleteConfirmationText('');
                      } catch (err: any) {
                        showToast(err.response?.data?.error || err.message, 'error');
                      } finally {
                        setIsDeletingCompany(false);
                      }
                    }}
                    disabled={
                      isDeletingCompany ||
                      (deleteConfirmationText.trim().toUpperCase() !== 'DELETE' &&
                        deleteConfirmationText.trim() !== activeCompany.tradeName &&
                        deleteConfirmationText.trim() !== activeCompany.legalName)
                    }
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-950 transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeletingCompany ? 'Deleting Company...' : 'Permanently Delete Company'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Contextual Help Drawer */}
      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        initialTopicId="settings"
      />
    </div>
  );
};
