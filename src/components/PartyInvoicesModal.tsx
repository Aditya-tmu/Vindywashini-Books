import React from 'react';
import {
  FileText,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2,
  Printer,
  X,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Party, Invoice } from '../types';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import { PrintInvoiceModal } from './PrintInvoiceModal';

interface PartyInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party | null;
  onOpenBulkPrint?: (party: Party) => void;
}

type SortField = 'invoiceNumber' | 'date' | 'grandTotal' | 'paymentStatus';
type SortOrder = 'asc' | 'desc';

export const PartyInvoicesModal: React.FC<PartyInvoicesModalProps> = ({
  isOpen,
  onClose,
  party,
  onOpenBulkPrint,
}) => {
  const { activeCompany, jumpToEditInvoice, showToast } = useAppStore();

  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  // Sorting
  const [sortField, setSortField] = React.useState<SortField>('date');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc');

  // Print Modal
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = React.useState<Invoice | null>(null);

  const fetchInvoices = React.useCallback(async () => {
    if (!activeCompany || !party || !isOpen) return;
    try {
      setIsLoading(true);
      const data = await api.getPartyInvoices(party._id, activeCompany._id);
      setInvoices(data || []);
    } catch (err: any) {
      console.error('Error fetching party invoices:', err);
      showToast('Failed to load party invoices', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeCompany, party, isOpen, showToast]);

  React.useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  if (!isOpen || !party) return null;

  // Toggle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter & Sort
  const filteredInvoices = invoices.filter((inv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
      (inv.customerPhone && inv.customerPhone.toLowerCase().includes(q)) ||
      (inv.notes && inv.notes.toLowerCase().includes(q))
    );
  });

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    let result = 0;
    if (sortField === 'invoiceNumber') {
      result = a.invoiceNumber.localeCompare(b.invoiceNumber, undefined, { numeric: true, sensitivity: 'base' });
    } else if (sortField === 'date') {
      result = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortField === 'grandTotal') {
      result = Number(a.grandTotal || 0) - Number(b.grandTotal || 0);
    } else if (sortField === 'paymentStatus') {
      result = (a.paymentStatus || '').localeCompare(b.paymentStatus || '');
    }
    return sortOrder === 'asc' ? result : -result;
  });

  const handleEditClick = (inv: Invoice) => {
    onClose();
    jumpToEditInvoice(inv._id);
    showToast(`Loaded Invoice #${inv.invoiceNumber} for editing.`, 'info');
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-emerald-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-emerald-400" />
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full h-[85vh] shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-slate-850 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>Invoices for {party.name}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-bold">
                    {invoices.length} Invoices
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {party.phone && <span>📞 {party.phone} • </span>}
                  {party.gstin ? (
                    <span className="font-mono text-emerald-400">GSTIN: {party.gstin}</span>
                  ) : (
                    'Unregistered'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenBulkPrint && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenBulkPrint(party);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Print All</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search by invoice number, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-800 text-slate-100 text-xs rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div className="text-slate-400 text-xs font-mono">
              Showing {sortedInvoices.length} of {invoices.length} records
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="py-20 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                <span>Loading party invoices...</span>
              </div>
            ) : sortedInvoices.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider z-10">
                  <tr className="border-b border-slate-800">
                    <th className="p-3 text-center w-10">#</th>
                    <th className="p-3">
                      <button
                        onClick={() => handleSort('invoiceNumber')}
                        className="flex items-center gap-1.5 hover:text-slate-200"
                      >
                        <span>Invoice No</span>
                        {renderSortIcon('invoiceNumber')}
                      </button>
                    </th>
                    <th className="p-3">
                      <button
                        onClick={() => handleSort('date')}
                        className="flex items-center gap-1.5 hover:text-slate-200"
                      >
                        <span>Date</span>
                        {renderSortIcon('date')}
                      </button>
                    </th>
                    <th className="p-3 text-right">
                      <button
                        onClick={() => handleSort('grandTotal')}
                        className="flex items-center gap-1.5 justify-end w-full hover:text-slate-200"
                      >
                        <span>Grand Total (₹)</span>
                        {renderSortIcon('grandTotal')}
                      </button>
                    </th>
                    <th className="p-3 text-center">
                      <button
                        onClick={() => handleSort('paymentStatus')}
                        className="flex items-center gap-1.5 justify-center w-full hover:text-slate-200"
                      >
                        <span>Status</span>
                        {renderSortIcon('paymentStatus')}
                      </button>
                    </th>
                    <th className="p-3 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {sortedInvoices.map((inv, idx) => {
                    const isCancelled = inv.paymentStatus === 'Cancelled';
                    return (
                      <tr
                        key={inv._id || idx}
                        className={`hover:bg-slate-800/50 transition ${
                          isCancelled ? 'bg-rose-950/20 opacity-75' : ''
                        }`}
                      >
                        <td className="p-3 text-center text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                        <td className="p-3 font-bold font-mono text-emerald-400">
                          {inv.invoiceNumber}
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {inv.date ? new Date(inv.date).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-100">
                          ₹{Number(inv.grandTotal || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          {isCancelled ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-950 text-rose-300 border border-rose-800">
                              CANCELLED
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                inv.paymentStatus === 'Paid'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                  : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                              }`}
                            >
                              {inv.paymentStatus || 'Paid'}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditClick(inv)}
                              title="Edit in Billing View"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setSelectedInvoiceForPrint(inv)}
                              title="Print Invoice"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-indigo-400 transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-20 text-center text-slate-500 text-xs">
                No invoices found for this customer.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-850 border-t border-slate-800 flex justify-between items-center text-xs">
            <div className="text-slate-400 text-[11px]">
              Note: Click <b>Edit</b> to jump directly into the billing terminal with this invoice loaded.
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Single Invoice Print Modal */}
      {selectedInvoiceForPrint && (
        <PrintInvoiceModal
          isOpen={true}
          onClose={() => setSelectedInvoiceForPrint(null)}
          invoice={selectedInvoiceForPrint}
        />
      )}
    </>

  );
};
