import React from 'react';
import {
  CalendarDays,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Printer,
  HelpCircle,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import { Invoice } from '../types';
import { PrintInvoiceModal } from '../components/PrintInvoiceModal';
import { HelpDrawer } from '../components/HelpDrawer';

export const DayBookView: React.FC = () => {
  const { activeCompany, showToast } = useAppStore();

  const [fromDate, setFromDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [dayBookData, setDayBookData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [search, setSearch] = React.useState<string>('');

  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [showPrintModal, setShowPrintModal] = React.useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = React.useState<boolean>(false);

  const loadDayBook = async () => {
    if (!activeCompany) return;
    try {
      setLoading(true);
      const data = await api.getDayBook(activeCompany._id, fromDate, toDate);
      setDayBookData(data || null);
    } catch (err: any) {
      console.warn('Error loading day book:', err.message);
      setDayBookData(null);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadDayBook();
  }, [activeCompany, fromDate, toDate]);

  const handleExportExcel = async () => {
    if (!dayBookData || !dayBookData.vouchers.length) {
      showToast('No vouchers to export for this date range.', 'info');
      return;
    }

    try {
      const headers = ['Date', 'Voucher #', 'Type', 'Party / Account', 'Amount (₹)', 'Narration'];
      const rows = dayBookData.vouchers.map((v: any) => [
        new Date(v.date).toLocaleDateString('en-IN'),
        v.voucherNumber,
        v.voucherType,
        v.partyName,
        v.totalAmount,
        v.narration || '',
      ]);

      const title = `Day Book (${fromDate} to ${toDate}) - ${activeCompany?.tradeName || activeCompany?.legalName}`;
      await api.exportReportExcel(title, headers, rows);
      showToast('Day Book Excel export generated!', 'success');
    } catch (err: any) {
      showToast('Export failed: ' + err.message, 'error');
    }
  };

  const handlePrintVoucher = async (voucher: any) => {
    if (!activeCompany) return;
    try {
      // Find matching invoice for this voucher
      const invoices = await api.getInvoices(activeCompany._id, voucher.voucherNumber);
      const matched = invoices.find(
        (inv) => inv.voucherId === voucher._id || inv.invoiceNumber === voucher.voucherNumber
      ) || invoices[0];

      if (matched) {
        setSelectedInvoice(matched);
        setShowPrintModal(true);
      } else {
        // Construct printable invoice object from voucher
        const fallbackInv: any = {
          _id: voucher._id,
          invoiceNumber: voucher.voucherNumber,
          date: voucher.date,
          customerName: voucher.partyName || 'Cash Customer',
          customerGstin: voucher.partyGstin || '',
          customerPhone: '',
          customerEmail: '',
          billingAddress: {
            line1: '',
            city: activeCompany.address.city,
            state: activeCompany.address.state,
            stateCode: activeCompany.address.stateCode,
          },
          placeOfSupply: `${activeCompany.address.stateCode}-${activeCompany.address.state}`,
          items: voucher.items?.length
            ? voucher.items
            : [
                {
                  name: voucher.narration || `${voucher.voucherType} Entry`,
                  quantity: 1,
                  uqc: 'UNIT',
                  rate: voucher.totalAmount,
                  taxableValue: voucher.totalAmount,
                  gstRate: 0,
                  total: voucher.totalAmount,
                },
              ],
          totalTaxable: voucher.totalAmount,
          grandTotal: voucher.totalAmount,
          companyId: activeCompany._id,
          templateUsed: activeCompany.defaultTemplate || 'A4',
        };
        setSelectedInvoice(fallbackInv);
        setShowPrintModal(true);
      }
    } catch (err: any) {
      showToast('Error opening print preview: ' + err.message, 'error');
    }
  };

  const vouchers = dayBookData?.vouchers || [];
  const filteredVouchers = vouchers.filter(
    (v: any) =>
      !search ||
      v.voucherNumber.toLowerCase().includes(search.toLowerCase()) ||
      v.partyName.toLowerCase().includes(search.toLowerCase()) ||
      v.voucherType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-4rem)]">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-100">Day Book Register</h1>
            <p className="text-xs text-slate-400">
              Chronological daily record of all sales, purchases, receipts, payments & journals
            </p>
          </div>
        </div>

        {/* Date Filter & Export */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-lg border border-slate-700 text-xs">
            <span className="text-slate-400 font-semibold pl-1">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-slate-900 text-slate-100 px-2 py-1 rounded border border-slate-700 font-mono text-xs"
            />
            <span className="text-slate-400 font-semibold">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-slate-900 text-slate-100 px-2 py-1 rounded border border-slate-700 font-mono text-xs"
            />
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel Export</span>
          </button>

          <button
            onClick={() => setIsHelpOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition"
            title="Open Day Book Guide"
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>Help</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Debits / Inflow</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-mono font-bold text-emerald-400">
            ₹{(dayBookData?.totalDebit || 0).toFixed(2)}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Credits / Outflow</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-mono font-bold text-rose-400">
            ₹{(dayBookData?.totalCredit || 0).toFixed(2)}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Voucher Count</span>
            <CalendarDays className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-mono font-bold text-sky-400">
            {filteredVouchers.length} Vouchers
          </div>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Transactions ({filteredVouchers.length})
          </h2>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search in day book..."
              className="bg-slate-800 text-slate-200 text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-700"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Voucher #</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Party / Primary Ledger</th>
                <th className="py-2.5 px-3">Entry Breakup</th>
                <th className="py-2.5 px-3 text-right">Total Amount (₹)</th>
                <th className="py-2.5 px-3">Narration</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredVouchers.map((v: any) => (
                <tr key={v._id} className="hover:bg-slate-850/40 transition">
                  <td className="py-2.5 px-3 text-slate-400 font-mono">
                    {new Date(v.date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                    {v.voucherNumber}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-200 border border-slate-700">
                      {v.voucherType}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-100 font-semibold">
                    {v.partyName || 'Cash / Bank'}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-[250px] truncate">
                    {v.entries?.map((e: any) => `${e.ledgerName} (₹${(e.debit || e.credit).toFixed(2)})`).join(' | ')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                    ₹{v.totalAmount.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 max-w-[180px] truncate">
                    {v.narration || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => handlePrintVoucher(v)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white text-[11px] font-semibold transition flex items-center gap-1 mx-auto"
                      title="Print / Save PDF"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Print</span>
                    </button>
                  </td>
                </tr>
              ))}

              {filteredVouchers.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    No transactions recorded for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print & PDF Export Hub Modal */}
      {showPrintModal && selectedInvoice && (
        <PrintInvoiceModal
          invoice={selectedInvoice}
          isOpen={showPrintModal}
          onClose={() => {
            setShowPrintModal(false);
            setSelectedInvoice(null);
          }}
        />
      )}

      {/* Contextual Help Drawer */}
      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        initialTopicId="voucher"
      />
    </div>
  );
};
