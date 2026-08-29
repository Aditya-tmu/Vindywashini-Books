import { create } from 'zustand';
import { Company, DbStatus, SettingsType } from '../types';
import { api } from '../services/api';

export type NavigationTab =
  | 'dashboard'
  | 'billing'
  | 'purchase'
  | 'vouchers'
  | 'daybook'
  | 'financials'
  | 'inventory'
  | 'parties'
  | 'gst'
  | 'settings';

interface AppState {
  activeCompany: Company | null;
  companies: Company[];
  activeTab: NavigationTab;
  dbStatus: DbStatus | null;
  settings: SettingsType | null;
  isLoading: boolean;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  isCompanyModalOpen: boolean;
  editingInvoiceId: string | null;

  setActiveCompany: (company: Company) => void;
  setActiveTab: (tab: NavigationTab) => void;
  setDbStatus: (status: DbStatus) => void;
  setSettings: (settings: SettingsType | null) => void;
  setEditingInvoiceId: (id: string | null) => void;
  jumpToEditInvoice: (invoiceId: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  setCompanyModalOpen: (open: boolean) => void;
  fetchCompanies: () => Promise<void>;
  fetchDbStatus: () => Promise<void>;
  fetchSettings: () => Promise<SettingsType | null>;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeCompany: null,
  companies: [],
  activeTab: 'dashboard',
  dbStatus: null,
  settings: null,
  isLoading: false,
  toast: null,
  isCompanyModalOpen: false,
  editingInvoiceId: null,

  setActiveCompany: (company) => {
    set({ activeCompany: company });
    get().fetchSettings();
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  setDbStatus: (status) => set({ dbStatus: status }),
  setSettings: (settings) => set({ settings }),
  setEditingInvoiceId: (id) => set({ editingInvoiceId: id }),
  jumpToEditInvoice: (invoiceId) => {
    set({ editingInvoiceId: invoiceId, activeTab: 'billing' });
  },
  showToast: (message, type = 'success') => {
    set({ toast: { message, type } });
    setTimeout(() => {
      set({ toast: null });
    }, 4000);
  },
  hideToast: () => set({ toast: null }),
  setCompanyModalOpen: (open) => set({ isCompanyModalOpen: open }),

  fetchCompanies: async () => {
    try {
      set({ isLoading: true });
      const companies = await api.getCompanies();
      const list = Array.isArray(companies) ? companies : [];
      const current = get().activeCompany;
      const updatedCurrent = current ? list.find((c) => c._id === current._id) : null;

      set({
        companies: list,
        activeCompany: updatedCurrent || (list.length > 0 ? list[0] : null),
      });
      get().fetchSettings();
    } catch (err: any) {
      console.error('Error fetching companies:', err);
      set({ companies: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSettings: async () => {
    try {
      const companyId = get().activeCompany?._id;
      const res = await api.getSettings(companyId);
      if (res && res.data) {
        set({ settings: res.data });
        return res.data;
      }
      return null;
    } catch (err) {
      console.warn('Error fetching settings');
      return null;
    }
  },

  fetchDbStatus: async () => {
    try {
      const prevStatus = get().dbStatus?.status;
      const companyId = get().activeCompany?._id;
      const res = await api.getSettings(companyId);
      if (res) {
        if (res.dbStatus) {
          set({ dbStatus: res.dbStatus });
          if (res.dbStatus.status === 'connected' && (prevStatus !== 'connected' || get().companies.length === 0)) {
            get().fetchCompanies();
          }
        }
        if (res.data) {
          set({ settings: res.data });
        }
      }
    } catch (err) {
      console.warn('Error checking db status');
    }
  },

}));


