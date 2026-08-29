import React from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Building,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileText,
  Printer,
  BarChart2,
  Sparkles,
  ShoppingBag,
  UserCheck,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import { Party } from '../types';
import { INDIAN_STATES } from '../config/constants';
import { validateGSTIN } from '../utils/gstValidator';
import { HelpDrawer } from '../components/HelpDrawer';
import { BulkPdfExportModal } from '../components/BulkPdfExportModal';
import { PartyGstSummaryModal } from '../components/PartyGstSummaryModal';
import { PartyInvoicesModal } from '../components/PartyInvoicesModal';
import { PartyPurchasesModal } from '../components/PartyPurchasesModal';

export const PartiesView: React.FC = () => {
  const { activeCompany, showToast } = useAppStore();

  // Active Top Tab: 'Customer' or 'Supplier'
  const [activeTab, setActiveTab] = React.useState<'Customer' | 'Supplier'>('Customer');
  const [parties, setParties] = React.useState<Party[]>([]);
  const [search, setSearch] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);

  // Modals State
  const [showPartyFormModal, setShowPartyFormModal] = React.useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = React.useState<boolean>(false);
  const [editingParty, setEditingParty] = React.useState<Party | null>(null);

  // Feature Modals
  const [bulkPrintParty, setBulkPrintParty] = React.useState<Party | null>(null);
  const [gstSummaryParty, setGstSummaryParty] = React.useState<Party | null>(null);
  const [invoicesViewParty, setInvoicesViewParty] = React.useState<Party | null>(null);
  const [purchasesViewParty, setPurchasesViewParty] = React.useState<Party | null>(null);

  const [formData, setFormData] = React.useState({
    name: '',
    type: 'Customer' as 'Customer' | 'Supplier' | 'Both',
    gstin: '',
    pan: '',
    phone: '',
    email: '',
    addressLine1: '',
    city: '',
    state: 'Bihar',
    stateCode: '10',
    pincode: '',
    placeOfSupply: '10-Bihar',
    openingBalance: 0,
    openingType: 'Dr' as 'Dr' | 'Cr',
    creditLimit: 0,
    creditDays: 30,
    notes: '',
  });

  const loadParties = React.useCallback(async () => {
    if (!activeCompany) return;
    try {
      setLoading(true);
      const list = await api.getParties(activeCompany._id, activeTab, search || undefined);
      setParties(list || []);
    } catch (err: any) {
      console.warn('Error loading parties:', err.message);
    } finally {
      setLoading(false);
    }
  }, [activeCompany, activeTab, search]);

  React.useEffect(() => {
    loadParties();
  }, [loadParties]);

  const handleGstinChange = (val: string) => {
    const clean = val.toUpperCase().trim();
    let updated = { ...formData, gstin: clean };

    if (clean.length >= 2) {
      const stateCode = clean.substring(0, 2);
      const st = INDIAN_STATES[stateCode];
      if (st) {
        updated.stateCode = stateCode;
        updated.state = st.name;
        updated.placeOfSupply = `${stateCode}-${st.name}`;
      }
    }
    if (clean.length >= 12 && !formData.pan) {
      updated.pan = clean.substring(2, 12);
    }

    setFormData(updated);
  };

  const openCreateModal = () => {
    setEditingParty(null);
    const defaultType = activeTab;
    setFormData({
      name: '',
      type: defaultType,
      gstin: '',
      pan: '',
      phone: '',
      email: '',
      addressLine1: '',
      city: activeCompany?.address.city || 'Patna',
      state: activeCompany?.address.state || 'Bihar',
      stateCode: activeCompany?.address.stateCode || '10',
      pincode: '',
      placeOfSupply: activeCompany ? `${activeCompany.address.stateCode}-${activeCompany.address.state}` : '10-Bihar',
      openingBalance: 0,
      openingType: defaultType === 'Supplier' ? 'Cr' : 'Dr',
      creditLimit: 0,
      creditDays: 30,
      notes: '',
    });
    setShowPartyFormModal(true);
  };

  const openEditModal = (p: Party) => {
    setEditingParty(p);
    setFormData({
      name: p.name,
      type: p.type,
      gstin: p.gstin || '',
      pan: p.pan || '',
      phone: p.phone || '',
      email: p.email || '',
      addressLine1: p.billingAddress?.line1 || '',
      city: p.billingAddress?.city || '',
      state: p.billingAddress?.state || 'Bihar',
      stateCode: p.billingAddress?.stateCode || '10',
      pincode: p.billingAddress?.pincode || '',
      placeOfSupply: p.placeOfSupply || '10-Bihar',
      openingBalance: p.openingBalance,
      openingType: p.openingType,
      creditLimit: p.creditLimit,
      creditDays: p.creditDays,
      notes: p.notes || '',
    });
    setShowPartyFormModal(true);
  };

  const handleSaveParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    if (!formData.name.trim()) {
      showToast('Party name is required', 'error');
      return;
    }

    try {
      const payload: any = {
        name: formData.name.trim(),
        type: formData.type,
        gstin: formData.gstin.trim(),
        pan: formData.pan.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        billingAddress: {
          line1: formData.addressLine1,
          city: formData.city,
          state: formData.state,
          stateCode: formData.stateCode,
          pincode: formData.pincode,
        },
        placeOfSupply: formData.placeOfSupply,
        openingBalance: Number(formData.openingBalance),
        openingType: formData.openingType,
        creditLimit: Number(formData.creditLimit),
        creditDays: Number(formData.creditDays),
        notes: formData.notes,
        companyId: activeCompany._id,
      };

      if (editingParty) {
        await api.updateParty(editingParty._id, payload);
        showToast(`${formData.type} updated successfully`, 'success');
      } else {
        await api.createParty(payload);
        showToast(`New ${formData.type} & linked ledger registered successfully`, 'success');
      }

      setShowPartyFormModal(false);
      loadParties();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleDeleteParty = async (party: Party) => {
    if (!confirm(`Are you sure you want to delete ${party.type} "${party.name}"? This will not delete past invoices/bills.`)) {
      return;
    }
    try {
      await api.deleteParty(party._id);
      showToast(`${party.type} deleted`, 'success');
      loadParties();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    }
  };

  const gstinValidation = formData.gstin ? validateGSTIN(formData.gstin) : null;

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-4rem)]">
      {/* Top Banner & Tab Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border ${
              activeTab === 'Customer'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
            }`}
          >
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-100">
              {activeTab === 'Customer' ? 'Customer Accounts Directory' : 'Supplier Accounts Directory'}
            </h1>
            <p className="text-xs text-slate-400">
              {activeTab === 'Customer'
                ? 'Manage Sundry Debtors, GST Sales Statements, Invoices, and Balances'
                : 'Manage Sundry Creditors, Purchase Registers, ITC Summaries, and Payables'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Explicit Tab Switching */}
          <div className="flex items-center bg-slate-850 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setActiveTab('Customer');
                setSearch('');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'Customer'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Customers</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('Supplier');
                setSearch('');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'Supplier'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Suppliers</span>
            </button>
          </div>

          {/* Dedicated Explicit Add Button */}
          <button
            onClick={openCreateModal}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs shadow-lg transition active:scale-95 ${
              activeTab === 'Customer'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/80'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/80'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>+ Add {activeTab === 'Customer' ? 'Customer' : 'Supplier'}</span>
          </button>

          <button
            onClick={() => setIsHelpOpen(true)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition"
            title="Open Directory Guide"
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>Help</span>
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        {/* Search Bar & Count */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeTab.toLowerCase()}s by name, GSTIN, phone...`}
              className="w-full bg-slate-800 text-slate-100 text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="text-xs text-slate-400 font-mono">
            Total {activeTab}s: <b className="text-slate-200">{parties.length}</b>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3.5">{activeTab === 'Customer' ? 'Customer Name' : 'Supplier Name'}</th>
                <th className="py-3 px-3.5">Mobile & Email</th>
                <th className="py-3 px-3.5">GSTIN / State</th>
                <th className="py-3 px-3.5">Billing Address</th>
                <th className="py-3 px-3.5 text-right">
                  {activeTab === 'Customer' ? 'Outstanding Receivable' : 'Outstanding Payable'}
                </th>
                <th className="py-3 px-3.5 text-center">Actions & Reports</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {parties.map((p) => {
                const isCustomer = activeTab === 'Customer';
                return (
                  <tr key={p._id} className="hover:bg-slate-850/50 transition group">
                    {/* Clickable Party Name */}
                    <td className="py-3 px-3.5">
                      <button
                        onClick={() => {
                          if (isCustomer) {
                            setInvoicesViewParty(p);
                          } else {
                            setPurchasesViewParty(p);
                          }
                        }}
                        className={`text-left font-bold text-sm hover:underline flex items-center gap-1.5 ${
                          isCustomer ? 'text-emerald-400 hover:text-emerald-300' : 'text-indigo-400 hover:text-indigo-300'
                        }`}
                        title={`View ${isCustomer ? 'invoices' : 'purchases'} for ${p.name}`}
                      >
                        <span>{p.name}</span>
                      </button>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Type: {p.type} {p.creditDays ? `• ${p.creditDays}d credit` : ''}
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="py-3 px-3.5 text-slate-300">
                      <div className="flex flex-col text-[11px]">
                        {p.phone ? (
                          <span className="font-mono text-slate-200">📞 {p.phone}</span>
                        ) : (
                          <span className="text-slate-600">No phone</span>
                        )}
                        {p.email && <span className="text-slate-400 text-[10px]">✉️ {p.email}</span>}
                      </div>
                    </td>

                    {/* GSTIN / State */}
                    <td className="py-3 px-3.5 font-mono">
                      {p.gstin ? (
                        <div className="flex flex-col">
                          <span className="text-emerald-400 font-bold text-[11px]">{p.gstin}</span>
                          <span className="text-slate-500 text-[10px]">{p.placeOfSupply}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Unregistered</span>
                      )}
                    </td>

                    {/* Address */}
                    <td className="py-3 px-3.5 text-slate-400 text-[11px] max-w-[200px] truncate">
                      {p.billingAddress?.line1 || p.billingAddress?.city
                        ? `${p.billingAddress?.line1 ? p.billingAddress.line1 + ', ' : ''}${p.billingAddress?.city || ''}`
                        : '—'}
                    </td>

                    {/* Balance */}
                    <td className="py-3 px-3.5 text-right font-mono font-bold">
                      <span className={p.currentBalance > 0 ? (isCustomer ? 'text-amber-400' : 'text-indigo-400') : 'text-slate-300'}>
                        ₹{Number(p.currentBalance || 0).toFixed(2)} ({p.openingType || (isCustomer ? 'Dr' : 'Cr')})
                      </span>
                    </td>

                    {/* Actions & Report Buttons */}
                    <td className="py-3 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View Vouchers History */}
                        <button
                          onClick={() => {
                            if (isCustomer) {
                              setInvoicesViewParty(p);
                            } else {
                              setPurchasesViewParty(p);
                            }
                          }}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                            isCustomer
                              ? 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border-emerald-800/80'
                              : 'bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 border-indigo-800/80'
                          }`}
                          title={`View all ${isCustomer ? 'invoices' : 'purchases'}`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{isCustomer ? 'Invoices' : 'Bills'}</span>
                        </button>

                        {/* Print All Invoices / Bills */}
                        <button
                          onClick={() => setBulkPrintParty(p)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition"
                          title={`Print all ${isCustomer ? 'invoices' : 'purchase bills'} in bulk PDF`}
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Print All</span>
                        </button>

                        {/* GST / ITC Summary Report */}
                        <button
                          onClick={() => setGstSummaryParty(p)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                            isCustomer
                              ? 'bg-slate-800 hover:bg-emerald-950 text-emerald-400 border-slate-700 hover:border-emerald-700'
                              : 'bg-slate-800 hover:bg-indigo-950 text-indigo-400 border-slate-700 hover:border-indigo-700'
                          }`}
                          title={isCustomer ? 'Generate GST Summary Report' : 'Generate Purchase & ITC Summary Report'}
                        >
                          {isCustomer ? <BarChart2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                          <span>{isCustomer ? 'GST Report' : 'ITC Summary'}</span>
                        </button>

                        {/* Edit Party */}
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                          title="Edit Party Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Party */}
                        <button
                          onClick={() => handleDeleteParty(p)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition"
                          title="Delete Party"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {parties.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500 text-xs">
                    No {activeTab.toLowerCase()}s found.{' '}
                    <button
                      onClick={openCreateModal}
                      className="text-emerald-400 underline font-bold ml-1 hover:text-emerald-300"
                    >
                      + Add New {activeTab}
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Party Modal */}
      {showPartyFormModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>{editingParty ? `Edit ${editingParty.type} Details` : `Register New ${formData.type}`}</span>
            </h3>

            <form onSubmit={handleSaveParty} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Party Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700"
                    placeholder="e.g. Maa Sita Enterprises"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Party Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e: any) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-bold"
                  >
                    <option value="Customer">Customer (Sundry Debtor)</option>
                    <option value="Supplier">Supplier (Sundry Creditor)</option>
                    <option value="Both">Both (Debtor & Creditor)</option>
                  </select>
                </div>
              </div>

              {/* GSTIN with live check */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-400">GSTIN (15 Digits)</label>
                  {gstinValidation && (
                    <span
                      className={`text-[10px] font-mono font-bold flex items-center gap-1 ${
                        gstinValidation.isValid ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {gstinValidation.isValid ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      <span>{gstinValidation.isValid ? 'Checksum Valid' : gstinValidation.error}</span>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  placeholder="10ABCDE1234F1Z5"
                  className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Mobile Phone (WhatsApp)</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="party@domain.com"
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Billing Address</label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="Street / Market / Area"
                  className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Place of Supply</label>
                  <select
                    value={formData.placeOfSupply}
                    onChange={(e) => setFormData({ ...formData, placeOfSupply: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono text-[11px]"
                  >
                    {Object.entries(INDIAN_STATES).map(([code, st]) => (
                      <option key={code} value={`${code}-${st.name}`}>
                        {code} - {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Opening Balance (₹)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={formData.openingBalance}
                      onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value) })}
                      className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                    />
                    <select
                      value={formData.openingType}
                      onChange={(e: any) => setFormData({ ...formData, openingType: e.target.value })}
                      className="bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-bold"
                    >
                      <option value="Dr">Dr (Receivable)</option>
                      <option value="Cr">Cr (Payable)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Credit Days</label>
                  <input
                    type="number"
                    value={formData.creditDays}
                    onChange={(e) => setFormData({ ...formData, creditDays: Number(e.target.value) })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPartyFormModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950"
                >
                  Save {formData.type}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feature 2: Bulk PDF Export Modal */}
      {bulkPrintParty && (
        <BulkPdfExportModal
          isOpen={true}
          onClose={() => setBulkPrintParty(null)}
          party={bulkPrintParty}
          partyType={activeTab}
        />
      )}

      {/* Feature 3: GST / ITC Summary Modal */}
      {gstSummaryParty && (
        <PartyGstSummaryModal
          isOpen={true}
          onClose={() => setGstSummaryParty(null)}
          party={gstSummaryParty}
          partyType={activeTab}
        />
      )}

      {/* Feature 4: Party Invoices History Modal */}
      {invoicesViewParty && (
        <PartyInvoicesModal
          isOpen={true}
          onClose={() => setInvoicesViewParty(null)}
          party={invoicesViewParty}
          onOpenBulkPrint={(party) => setBulkPrintParty(party)}
        />
      )}

      {/* Feature 4: Party Purchases History Modal */}
      {purchasesViewParty && (
        <PartyPurchasesModal
          isOpen={true}
          onClose={() => setPurchasesViewParty(null)}
          party={purchasesViewParty}
          onOpenBulkPrint={(party) => setBulkPrintParty(party)}
        />
      )}

      {/* Contextual Help Drawer */}
      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        initialTopicId="billing"
      />
    </div>
  );
};

