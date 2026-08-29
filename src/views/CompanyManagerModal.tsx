import React from 'react';
import {
  Building2,
  Plus,
  X,
  Upload,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  FileText,
  CreditCard,
  Phone,
  Mail,
  Printer,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import { Company } from '../types';
import { INDIAN_STATES } from '../config/constants';
import { getStateFromGSTIN } from '../utils/gstValidator';

export const CompanyManagerModal: React.FC = () => {
  const {
    isCompanyModalOpen,
    setCompanyModalOpen,
    companies,
    activeCompany,
    setActiveCompany,
    fetchCompanies,
    showToast,
  } = useAppStore();

  const [mode, setMode] = React.useState<'list' | 'create'>('list');
  const [logoFile, setLogoFile] = React.useState<File | null>(null);

  // 2-Step Delete State
  const [deletingCompany, setDeletingCompany] = React.useState<Company | null>(null);
  const [deleteStep, setDeleteStep] = React.useState<1 | 2>(1);
  const [deleteConfirmationText, setDeleteConfirmationText] = React.useState<string>('');
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);

  const [formData, setFormData] = React.useState({
    legalName: '',
    tradeName: '',
    gstin: '',
    pan: '',
    addressLine1: '',
    city: 'Patna',
    state: 'Bihar',
    stateCode: '10',
    pincode: '',
    phone: '',
    email: '',
    bankName: 'State Bank of India',
    accountNo: '',
    ifsc: '',
    branch: 'Main Branch',
    upiId: '',
    financialYearStart: 4,
    currentFY: '2025-2026',
    invoicePrefix: 'VWB/',
    defaultTemplate: 'A4' as 'POS-58' | 'POS-80' | 'A5' | 'A4',
  });

  if (!isCompanyModalOpen) return null;

  const handleGstinChange = (val: string) => {
    const clean = val.toUpperCase().trim();
    let updated = { ...formData, gstin: clean };

    if (clean.length >= 2) {
      const derived = getStateFromGSTIN(clean);
      updated.stateCode = derived.stateCode;
      updated.state = derived.stateName;
    }
    if (clean.length >= 12 && !formData.pan) {
      updated.pan = clean.substring(2, 12);
    }

    setFormData(updated);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.legalName.trim()) {
      showToast('Legal business name is required', 'error');
      return;
    }

    try {
      const payload: any = {
        legalName: formData.legalName.trim(),
        tradeName: formData.tradeName.trim() || formData.legalName.trim(),
        gstin: formData.gstin.trim(),
        pan: formData.pan.trim(),
        address: {
          line1: formData.addressLine1,
          city: formData.city,
          state: formData.state,
          stateCode: formData.stateCode,
          pincode: formData.pincode,
        },
        contact: {
          phone: formData.phone,
          email: formData.email,
        },
        bankDetails: {
          bankName: formData.bankName,
          accountNo: formData.accountNo,
          ifsc: formData.ifsc,
          branch: formData.branch,
          upiId: formData.upiId,
        },
        currentFY: formData.currentFY,
        invoicePrefix: formData.invoicePrefix,
        defaultTemplate: formData.defaultTemplate,
      };

      const created = await api.createCompany(payload);

      if (logoFile) {
        await api.uploadLogo(created._id, logoFile);
      }

      await fetchCompanies();
      setActiveCompany(created);
      showToast(`Company ${created.tradeName} created with Chart of Accounts pre-seeded!`, 'success');
      setCompanyModalOpen(false);
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">Company & Entity Manager</h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 text-xs font-semibold">
              <button
                onClick={() => setMode('list')}
                className={`px-3 py-1 rounded transition ${
                  mode === 'list' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Switch ({companies.length})
              </button>
              <button
                onClick={() => setMode('create')}
                className={`px-3 py-1 rounded transition ${
                  mode === 'create' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                + Create Company
              </button>
            </div>

            <button
              onClick={() => setCompanyModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* List Companies Mode */}
          {mode === 'list' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Select an active company to switch your active ledger, inventory, invoices and GST filings:
              </p>

              <div className="space-y-2">
                {companies.map((comp) => {
                  const isActive = activeCompany?._id === comp._id;
                  return (
                    <div
                      key={comp._id}
                      className={`p-4 rounded-xl border transition flex justify-between items-center group ${
                        isActive
                          ? 'bg-emerald-950/40 border-emerald-600 text-emerald-200'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <div
                        onClick={() => {
                          setActiveCompany(comp);
                          showToast(`Switched active entity to: ${comp.tradeName || comp.legalName}`, 'info');
                          setCompanyModalOpen(false);
                        }}
                        className="space-y-1 flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-100">
                            {comp.tradeName || comp.legalName}
                          </span>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          GSTIN: <span className="font-mono text-emerald-400 font-bold">{comp.gstin || 'UNREGISTERED'}</span> | State: {comp.address.state} (Code: {comp.address.stateCode})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {comp.address.line1}, {comp.address.city}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs font-mono text-slate-400">
                          <div>FY: {comp.currentFY}</div>
                          <div>Prefix: {comp.invoicePrefix}</div>
                        </div>

                        {/* Delete Company Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingCompany(comp);
                            setDeleteStep(1);
                            setDeleteConfirmationText('');
                          }}
                          className="p-2 rounded-lg bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-700 transition"
                          title={`Delete Company: ${comp.tradeName || comp.legalName}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create Company Wizard Mode */}
          {mode === 'create' && (
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Legal Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    placeholder="e.g. MAA VINDYWASHINI HARDWARE & SANITARY"
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Trade / Display Name</label>
                  <input
                    type="text"
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                    placeholder="e.g. MAA VINDYWASHINI HARDWARE"
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">GSTIN (Auto-derives State)</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    placeholder="10ABCDE1234F1Z5"
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">PAN Number</label>
                  <input
                    type="text"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    placeholder="ABCDE1234F"
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">State *</label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">State Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.stateCode}
                    onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Street Address</label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="Main Road, Market Chowk"
                  className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700"
                />
              </div>

              {/* Bank Details */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase">Bank Details (For Invoices & QR)</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="Bank Name"
                    className="bg-slate-800 text-slate-100 text-xs px-3 py-1.5 rounded border border-slate-700"
                  />
                  <input
                    type="text"
                    value={formData.accountNo}
                    onChange={(e) => setFormData({ ...formData, accountNo: e.target.value })}
                    placeholder="Account Number"
                    className="bg-slate-800 text-slate-100 text-xs px-3 py-1.5 rounded border border-slate-700 font-mono"
                  />
                  <input
                    type="text"
                    value={formData.ifsc}
                    onChange={(e) => setFormData({ ...formData, ifsc: e.target.value.toUpperCase() })}
                    placeholder="IFSC Code"
                    className="bg-slate-800 text-slate-100 text-xs px-3 py-1.5 rounded border border-slate-700 font-mono uppercase"
                  />
                  <input
                    type="text"
                    value={formData.upiId}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    placeholder="UPI ID (e.g. mobile@sbi)"
                    className="bg-slate-800 text-slate-100 text-xs px-3 py-1.5 rounded border border-slate-700 font-mono"
                  />
                </div>
              </div>

              {/* Logo Upload & Numbering */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Invoice Prefix</label>
                  <input
                    type="text"
                    value={formData.invoicePrefix}
                    onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                    placeholder="VWB/"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Financial Year</label>
                  <input
                    type="text"
                    value={formData.currentFY}
                    onChange={(e) => setFormData({ ...formData, currentFY: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                    placeholder="2025-2026"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Default Template</label>
                  <select
                    value={formData.defaultTemplate}
                    onChange={(e: any) => setFormData({ ...formData, defaultTemplate: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-bold"
                  >
                    <option value="A4">A4 Full Tax Invoice</option>
                    <option value="A5">A5 Compact Half Page</option>
                    <option value="POS-80">POS 80mm Thermal</option>
                    <option value="POS-58">POS 58mm Thermal</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Upload Business Logo (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  className="text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-slate-800 file:text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Back to List
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950"
                >
                  Create Company & Seed Chart of Accounts
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* 2-STEP DELETE CONFIRMATION MODAL */}
      {deletingCompany && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-600/80 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            {/* Step 1: Initial Warning Prompt */}
            {deleteStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-rose-400">
                  <div className="p-3 bg-rose-950/80 rounded-xl border border-rose-700/60">
                    <AlertTriangle className="w-6 h-6 text-rose-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-100">Delete Company? (Step 1/2)</h3>
                    <p className="text-xs text-rose-400 font-semibold">Destructive Action</p>
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
                  <p>
                    Are you sure you want to delete <b className="text-white">{deletingCompany.tradeName || deletingCompany.legalName}</b>?
                  </p>
                  <p className="text-rose-300/90 text-[11px] leading-relaxed">
                    ⚠️ <b>Warning:</b> This will permanently destroy all accounting ledger accounts, sales & purchase invoices, vouchers, inventory items, and GST records linked to this company.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setDeletingCompany(null);
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

            {/* Step 2: Final Verification Prompt */}
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
                    To confirm permanent deletion of <b className="text-rose-300">{deletingCompany.tradeName || deletingCompany.legalName}</b>, please type <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">DELETE</code> below:
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
                      setDeletingCompany(null);
                      setDeleteStep(1);
                      setDeleteConfirmationText('');
                    }}
                    disabled={isDeleting}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Abort / Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!deletingCompany) return;
                      try {
                        setIsDeleting(true);
                        await api.deleteCompany(deletingCompany._id);
                        showToast(
                          `Company "${deletingCompany.tradeName || deletingCompany.legalName}" and all its records have been permanently deleted.`,
                          'success'
                        );
                        await fetchCompanies();
                        const updatedList = useAppStore.getState().companies;
                        if (activeCompany?._id === deletingCompany._id) {
                          if (updatedList && updatedList.length > 0) {
                            setActiveCompany(updatedList[0]);
                          } else {
                            setActiveCompany(null as any);
                          }
                        }
                        setDeletingCompany(null);
                        setDeleteStep(1);
                        setDeleteConfirmationText('');
                      } catch (err: any) {
                        showToast(err.response?.data?.error || err.message, 'error');
                      } finally {
                        setIsDeleting(false);
                      }
                    }}
                    disabled={
                      isDeleting ||
                      (deleteConfirmationText.trim().toUpperCase() !== 'DELETE' &&
                        deleteConfirmationText.trim() !== deletingCompany.tradeName &&
                        deleteConfirmationText.trim() !== deletingCompany.legalName)
                    }
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-950 transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeleting ? 'Deleting Everything...' : 'Permanently Delete Company'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
