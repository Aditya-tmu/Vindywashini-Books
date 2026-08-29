import React from 'react';
import {
  FileText,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Printer,
  X,
  RefreshCw,
} from 'lucide-react';
import { Party, PurchaseBill } from '../types';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import { PrintPurchaseModal } from './PrintPurchaseModal';

interface PartyPurchasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party | null;
  onOpenBulkPrint?: (party: Party) => void;
}

type SortField = 'billNumber' | 'supplierInvoiceNumber' | 'date' | 'grandTotal' | 'paymentStatus';
type SortOrder = 'asc' | 'desc';

export const PartyPurchasesModal: React.FC<PartyPurchasesModalProps> = ({
  isOpen,
  onClose,
  party,
  onOpenBulkPrint,
}) => {
  const { activeCompany, showToast } = useAppStore();

  const [purchases, setPurchases] = React.useState<PurchaseBill[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  // Sorting
  const [sortField, setSortField] = React.useState<SortField>('date');
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc');

  // Print Modal
  const [selectedPurchaseForPrint, setSelectedPurchaseForPrint] = React.useState<PurchaseBill | null>(null);

  const fetchPurchases = React.useCallback(async () => {
    if (!activeCompany || !party || !isOpen) return;
    try {
      setIsLoading(true);
      const data = await api.getPartyPurchases(party._id, activeCompany._id);
      setPurchases(data || []);
    } catch (err: any) {
      console.error('Error fetching party purchases:', err);
      showToast('Failed to load supplier purchase bills', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeCompany, party, isOpen, showToast]);

  React.useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

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
  const filteredPurchases = purchases.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.billNumber.toLowerCase().includes(q) ||
      (p.supplierInvoiceNumber && p.supplierInvoiceNumber.toLowerCase().includes(q)) ||
      (p.supplierName && p.supplierName.toLowerCase().includes(q)) ||
      (p.notes && p.notes.toLowerCase().includes(q))
    );
  });

  const sortedPurchases = [...filteredPurchases].sort((a, b) => {
    let result = 0;
    if (sortField === 'billNumber') {
      result = a.billNumber.localeCompare(b.billNumber, undefined, { numeric: true, sensitivity: 'base' });
    } else if (sortField === 'supplierInvoiceNumber') {
      result = (a.supplierInvoiceNumber || '').localeCompare(b.supplierInvoiceNumber || '', undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    } else if (sortField === 'date') {
      result = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortField === 'grandTotal') {
      result = Number(a.grandTotal || 0) - Number(b.grandTotal || 0);
    } else if (sortField === 'paymentStatus') {
      result = (a.paymentStatus || '').localeCompare(b.paymentStatus || '');
    }
    return sortOrder === 'asc' ? result : -result;
  });

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-indigo-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-indigo-400" />
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full h-[85vh] shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-slate-850 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>Purchase Bills for {party.name}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-bold">
                    {purchases.length} Records
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {party.phone && <span>📞 {party.phone} • </span>}
                  {party.gstin ? (
                    <span className="font-mono text-indigo-400">GSTIN: {party.gstin}</span>
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
                  <Printer className="w-3.5 h-3.5 text-indigo-400" />
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
                placeholder="Search by Bill #, Supplier Inv #, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-800 text-slate-100 text-xs rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div className="text-slate-400 text-xs font-mono">
              Showing {sortedPurchases.length} of {purchases.length} records
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="py-20 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                <span>Loading supplier purchase bills...</span>
              </div>
            ) : sortedPurchases.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider z-10">
                  <tr className="border-b border-slate-800">
                    <th className="p-3 text-center w-10">#</th>
                    <th className="p-3">
                      <button
                        onClick={() => handleSort('billNumber')}
                        className="flex items-center gap-1.5 hover:text-slate-200"
                      >
                        <span>Bill No</span>
                        {renderSortIcon('billNumber')}
                      </button>
                    </th>
                    <th className="p-3">
                      <button
                        onClick={() => handleSort('supplierInvoiceNumber')}
                        className="flex items-center gap-1.5 hover:text-slate-200"
                      >
                        <span>Supplier Inv #</span>
                        {renderSortIcon('supplierInvoiceNumber')}
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
                  {sortedPurchases.map((p, idx) => {
                    const isCancelled = p.paymentStatus === 'Cancelled';
                    return (
                      <tr
                        key={p._id || idx}
                        className={`hover:bg-slate-800/50 transition ${
                          isCancelled ? 'bg-rose-950/20 opacity-75' : ''
                        }`}
                      >
                        <td className="p-3 text-center text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                        <td className="p-3 font-bold font-mono text-indigo-400">
                          {p.billNumber}
                        </td>
                        <td className="p-3 font-mono text-slate-200 font-semibold">
                          {p.supplierInvoiceNumber}
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {p.date ? new Date(p.date).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-100">
                          ₹{Number(p.grandTotal || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          {isCancelled ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-950 text-rose-300 border border-rose-800">
                              CANCELLED
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.paymentStatus === 'Paid'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                  : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                              }`}
                            >
                              {p.paymentStatus || 'Unpaid'}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedPurchaseForPrint(p)}
                              title="Print Purchase Record"
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
                No purchase bills recorded for this supplier.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-850 border-t border-slate-800 flex justify-between items-center text-xs">
            <div className="text-slate-400 text-[11px]">
              Showing all recorded inward purchase vouchers and audit records.
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

      {/* Single Purchase Record Print Modal */}
      {selectedPurchaseForPrint && (
        <PrintPurchaseModal
          isOpen={true}
          onClose={() => setSelectedPurchaseForPrint(null)}
          purchase={selectedPurchaseForPrint}
        />
      )}
    </>
  );
};
