import React from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Calendar,
  Save,
  FileSpreadsheet,
  HelpCircle,
  Ban,
  FileText,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import { Voucher, Ledger, Party, Item, VoucherType } from '../types';
import { HelpDrawer } from '../components/HelpDrawer';

export const VouchersView: React.FC = () => {
  const { activeCompany, showToast } = useAppStore();

  const [vouchers, setVouchers] = React.useState<Voucher[]>([]);
  const [ledgers, setLedgers] = React.useState<Ledger[]>([]);
  const [parties, setParties] = React.useState<Party[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);

  // Form State
  const [voucherType, setVoucherType] = React.useState<VoucherType>('Payment');
  const [voucherNumber, setVoucherNumber] = React.useState<string>('');
  const [date, setDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [partyId, setPartyId] = React.useState<string>('');
  const [narration, setNarration] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = React.useState<boolean>(false);

  // Double entry rows
  const [entries, setEntries] = React.useState<
    Array<{ ledgerId: string; ledgerName: string; type: 'Dr' | 'Cr'; amount: number; description: string }>
  >([
    { ledgerId: '', ledgerName: '', type: 'Dr', amount: 0, description: '' },
    { ledgerId: '', ledgerName: '', type: 'Cr', amount: 0, description: '' },
  ]);

  // Filters
  const [filterType, setFilterType] = React.useState<string>('');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);

  const loadData = async () => {
    if (!activeCompany) return;
    try {
      setLoading(true);
      const [vList, lList, pList, iList] = await Promise.all([
        api.getVouchers(activeCompany._id, filterType || undefined, undefined, undefined, searchQuery || undefined),
        api.getLedgers(activeCompany._id),
        api.getParties(activeCompany._id),
        api.getItems(activeCompany._id),
      ]);
      setVouchers(Array.isArray(vList) ? vList : []);
      setLedgers(Array.isArray(lList) ? lList : []);
      setParties(Array.isArray(pList) ? pList : []);
      setItems(Array.isArray(iList) ? iList : []);

      // Auto assign next default voucher number
      const safeVList = Array.isArray(vList) ? vList : [];
      const count = safeVList.filter((v) => v.voucherType === voucherType).length + 1;
      setVoucherNumber(`${voucherType.slice(0, 3).toUpperCase()}/${String(count).padStart(4, '0')}`);
    } catch (err: any) {
      console.warn('Error loading voucher data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, [activeCompany, filterType, searchQuery, voucherType]);

  // Balance Check
  const totalDebit = entries.filter((e) => e.type === 'Dr').reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalCredit = entries.filter((e) => e.type === 'Cr').reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01 && totalDebit > 0;

  const addEntryRow = (type: 'Dr' | 'Cr' = 'Dr') => {
    setEntries([...entries, { ledgerId: '', ledgerName: '', type, amount: 0, description: '' }]);
  };

  const updateEntry = (idx: number, field: string, value: any) => {
    const updated = [...entries];
    const row = { ...updated[idx], [field]: value };
    if (field === 'ledgerId') {
      const found = ledgers.find((l) => l._id === value);
      if (found) row.ledgerName = found.name;
    }
    updated[idx] = row;
    setEntries(updated);
  };

  const removeEntry = (idx: number) => {
    if (entries.length <= 2) return;
    setEntries(entries.filter((_, i) => i !== idx));
  };

  const handleSaveVoucher = async (status: 'Posted' | 'Draft' = 'Posted') => {
    if (!activeCompany) {
      showToast('Please select an active company first.', 'error');
      return;
    }

    if (!voucherNumber.trim()) {
      showToast('Voucher number is required. Please enter a valid number.', 'error');
      return;
    }

    if (status === 'Posted') {
      // Validate that each entry has a ledger
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (!e.ledgerId) {
          showToast(`Line #${i + 1} has no Ledger Account selected. Please select an account.`, 'error');
          return;
        }
        if (Number(e.amount) <= 0) {
          showToast(`Line #${i + 1} (${e.ledgerName || 'Account'}) amount must be greater than zero.`, 'error');
          return;
        }
      }

      if (!isBalanced) {
        showToast(
          `Voucher is not balanced! Total Debit (₹${totalDebit.toFixed(2)}) does not match Total Credit (₹${totalCredit.toFixed(2)}) — difference ₹${difference.toFixed(2)}`,
          'error'
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const formattedEntries = entries.map((e) => ({
        ledgerId: e.ledgerId,
        ledgerName: e.ledgerName || 'Account',
        debit: e.type === 'Dr' ? Number(e.amount) || 0 : 0,
        credit: e.type === 'Cr' ? Number(e.amount) || 0 : 0,
        description: e.description || '',
      }));

      const selectedParty = parties.find((p) => p._id === partyId);

      await api.createVoucher({
        companyId: activeCompany._id,
        voucherNumber: voucherNumber.trim(),
        voucherType,
        date: new Date(date).toISOString(),
        narration,
        partyId: partyId || undefined,
        partyName: selectedParty?.name || '',
        partyGstin: selectedParty?.gstin || '',
        entries: formattedEntries as any,
        totalAmount: totalDebit || totalCredit || 0,
        financialYear: activeCompany.currentFY || '2025-2026',
        status: status as any,
      });

      showToast(
        status === 'Draft'
          ? `Voucher #${voucherNumber} saved as Draft.`
          : `${voucherType} voucher #${voucherNumber} posted successfully!`,
        'success'
      );

      // Reset form
      setNarration('');
      setEntries([
        { ledgerId: '', ledgerName: '', type: 'Dr', amount: 0, description: '' },
        { ledgerId: '', ledgerName: '', type: 'Cr', amount: 0, description: '' },
      ]);
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message;
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelVoucher = async (id: string, vNo: string) => {
    const reason = prompt(`Enter reason for voiding/cancelling Voucher #${vNo}:`, 'Entered in error');
    if (reason === null) return;
    try {
      await api.cancelVoucher(id, reason);
      showToast(`Voucher #${vNo} cancelled and accounting effects reversed successfully.`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleDeleteVoucher = async (id: string, vNo: string) => {
    if (!confirm(`Are you sure you want to permanently delete voucher #${vNo}? Ledger balances and stock will be reverted.`))
      return;
    try {
      await api.deleteVoucher(id);
      showToast('Voucher deleted and reversed successfully', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-100 flex items-center gap-2">
              <span>Double-Entry Voucher Posting</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                General Ledger
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Standard double-entry journal vouchers with automatic ledger balance updates
            </p>
          </div>
        </div>

        {/* Action Right: Voucher Type Pills & Help Button */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 text-xs font-semibold overflow-x-auto">
            {(['Payment', 'Receipt', 'Contra', 'Journal', 'Purchase', 'CreditNote', 'DebitNote'] as const).map(
              (t) => (
                <button
                  key={t}
                  onClick={() => setVoucherType(t)}
                  className={`px-3 py-1 rounded transition ${
                    voucherType === t ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              )
            )}
          </div>

          <button
            onClick={() => setIsHelpOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 shadow transition"
            title="Open Voucher Help & Guide"
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>Help</span>
          </button>
        </div>
      </div>

      {/* Voucher Entry Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Voucher Type</label>
            <input
              type="text"
              value={voucherType}
              readOnly
              className="w-full bg-slate-800 text-emerald-400 font-bold text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Voucher Number *</label>
            <input
              type="text"
              value={voucherNumber}
              onChange={(e) => setVoucherNumber(e.target.value)}
              className="w-full bg-slate-800 text-slate-100 font-bold text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Voucher Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Party / Contact (Optional)</label>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- No Party Attached --</option>
              {parties.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Double Entry Ledger Rows */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Accounting Entries (Dr / Cr)</h3>
            <button
              onClick={() => addEntryRow('Dr')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Entry Row</span>
            </button>
          </div>

          <div className="space-y-2">
            {entries.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                {/* Dr / Cr Selector */}
                <select
                  value={entry.type}
                  onChange={(e) => updateEntry(idx, 'type', e.target.value)}
                  className={`text-xs font-bold font-mono px-2.5 py-1.5 rounded border ${
                    entry.type === 'Dr'
                      ? 'bg-sky-950 text-sky-400 border-sky-800'
                      : 'bg-amber-950 text-amber-400 border-amber-800'
                  }`}
                >
                  <option value="Dr">Dr (Debit)</option>
                  <option value="Cr">Cr (Credit)</option>
                </select>

                {/* Ledger Dropdown */}
                <select
                  value={entry.ledgerId}
                  onChange={(e) => updateEntry(idx, 'ledgerId', e.target.value)}
                  className="flex-1 bg-slate-800 text-slate-100 text-xs px-3 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Ledger Account * --</option>
                  {ledgers.map((l) => (
                    <option key={l._id} value={l._id}>
                      {l.name} [{l.groupName}] (Bal: ₹{l.currentBalance.toFixed(2)})
                    </option>
                  ))}
                </select>

                {/* Amount */}
                <div className="w-36">
                  <input
                    type="number"
                    value={entry.amount || ''}
                    onChange={(e) => updateEntry(idx, 'amount', Number(e.target.value))}
                    placeholder="Amount (₹)"
                    className="w-full bg-slate-800 text-slate-100 text-right text-xs font-mono font-bold px-3 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Short Narration / Note */}
                <input
                  type="text"
                  value={entry.description}
                  onChange={(e) => updateEntry(idx, 'description', e.target.value)}
                  placeholder="Line note..."
                  className="w-48 bg-slate-800 text-slate-300 text-xs px-2.5 py-1.5 rounded border border-slate-700"
                />

                {/* Delete */}
                <button
                  onClick={() => removeEntry(idx)}
                  disabled={entries.length <= 2}
                  className="text-slate-500 hover:text-rose-400 disabled:opacity-30 transition p-1"
                  title="Remove row"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Validation Warning Alert if Unbalanced */}
        {!isBalanced && (totalDebit > 0 || totalCredit > 0) && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 flex items-center justify-between text-xs text-rose-300 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <b>Unbalanced Voucher:</b> Total Debit (₹{totalDebit.toFixed(2)}) does not match Total Credit (₹
                {totalCredit.toFixed(2)}). Difference: <b>₹{difference.toFixed(2)}</b>
              </span>
            </div>
            <button
              onClick={() => {
                // Auto balance by adding/adjusting the last entry
                if (entries.length >= 2) {
                  const lastIdx = entries.length - 1;
                  const targetType = totalDebit > totalCredit ? 'Cr' : 'Dr';
                  updateEntry(lastIdx, 'type', targetType);
                  updateEntry(lastIdx, 'amount', Math.max(totalDebit, totalCredit));
                }
              }}
              className="text-[11px] font-bold text-rose-400 hover:text-rose-200 underline"
            >
              Auto-balance
            </button>
          </div>
        )}

        {/* Narration & Save Action Bar */}
        <div className="pt-3 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="w-full md:w-1/2">
            <input
              type="text"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="Voucher Narration (e.g. Being payment made to supplier for cement consignment...)"
              className="w-full bg-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Debit Credit Balance Badge */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="text-sky-400 font-bold">Total Dr: ₹{totalDebit.toFixed(2)}</div>
              <div className="text-amber-400 font-bold">Total Cr: ₹{totalCredit.toFixed(2)}</div>
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                  isBalanced
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}
              >
                {isBalanced ? 'Balanced ✓' : `Diff: ₹${difference.toFixed(2)}`}
              </span>
            </div>

            {/* Save as Draft */}
            <button
              onClick={() => handleSaveVoucher('Draft')}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition"
              title="Save as draft without posting ledger balances"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Draft</span>
            </button>

            {/* Post Voucher button - ALWAYS CLICKABLE with helpful validation */}
            <button
              onClick={() => handleSaveVoucher('Posted')}
              disabled={isSubmitting}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition active:scale-95 ${
                isBalanced
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/80'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-600/50'
              }`}
              title={isBalanced ? 'Post voucher to ledger accounts' : 'Review balance errors before posting'}
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Posting...' : 'Post Voucher'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Vouchers Register */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-100">Posted Voucher Register</h2>
            <p className="text-xs text-slate-400">All double-entry ledger vouchers recorded in the company</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700"
            >
              <option value="">All Voucher Types</option>
              <option value="Sales">Sales</option>
              <option value="Purchase">Purchase</option>
              <option value="Payment">Payment</option>
              <option value="Receipt">Receipt</option>
              <option value="Contra">Contra</option>
              <option value="Journal">Journal</option>
              <option value="CreditNote">Credit Note</option>
              <option value="DebitNote">Debit Note</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search voucher #..."
                className="bg-slate-800 text-slate-200 text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-700"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Voucher #</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Particulars / Ledgers</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                <th className="py-2.5 px-3">Narration</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {vouchers.map((v) => (
                <tr key={v._id} className="hover:bg-slate-850/40 transition">
                  <td className="py-2.5 px-3 text-slate-400 font-mono">
                    {new Date(v.date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-200">
                    {v.voucherNumber}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-emerald-400 border border-slate-700">
                      {v.voucherType}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        (v as any).status === 'Cancelled'
                          ? 'bg-rose-950/70 text-rose-400 border-rose-800'
                          : (v as any).status === 'Draft'
                          ? 'bg-amber-950/70 text-amber-400 border-amber-800'
                          : 'bg-emerald-950/70 text-emerald-400 border-emerald-800'
                      }`}
                    >
                      {(v as any).status || 'Posted'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 max-w-[220px] truncate">
                    {v.entries.map((e) => `${e.ledgerName} (${e.debit > 0 ? 'Dr' : 'Cr'})`).join(', ')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                    ₹{v.totalAmount.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 max-w-[200px] truncate">
                    {v.narration || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {(v as any).status !== 'Cancelled' && (
                        <button
                          onClick={() => handleCancelVoucher(v._id, v.voucherNumber)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-amber-600/90 text-slate-300 hover:text-white font-bold text-[10px] border border-slate-700 transition flex items-center gap-1"
                          title="Cancel/Void voucher (reverses ledger balances and preserves audit trail)"
                        >
                          <Ban className="w-3 h-3 text-amber-400" />
                          <span>Cancel</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteVoucher(v._id, v.voucherNumber)}
                        className="p-1 rounded bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-700 transition"
                        title="Delete voucher"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {vouchers.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    No vouchers found for selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contextual Help Drawer */}
      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        initialTopicId="voucher"
      />
    </div>
  );
};
