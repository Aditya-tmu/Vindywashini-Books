import React from 'react';
import {
  TrendingUp,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  Receipt,
  Users,
  Package,
  FileSpreadsheet,
  CheckCircle2,
  DollarSign,
  ArrowDownRight,
  Printer,
  Share2,
  Truck,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import { Invoice, Item } from '../types';
import { PrintInvoiceModal } from '../components/PrintInvoiceModal';

export const DashboardView: React.FC = () => {
  const { activeCompany, setActiveTab, showToast } = useAppStore();
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [stockSummary, setStockSummary] = React.useState<any>(null);
  const [dayBookSummary, setDayBookSummary] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [showPrintModal, setShowPrintModal] = React.useState<boolean>(false);

  const loadDashboardData = async () => {
    if (!activeCompany) return;
    try {
      setLoading(true);
      const [invList, stockData, dayBook] = await Promise.all([
        api.getInvoices(activeCompany._id),
        api.getStockSummary(activeCompany._id),
        api.getDayBook(activeCompany._id, new Date().toISOString().split('T')[0]),
      ]);

      setInvoices(Array.isArray(invList) ? invList : []);
      setStockSummary(stockData || null);
      setDayBookSummary(dayBook || null);
    } catch (err: any) {
      console.warn('Error loading dashboard data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadDashboardData();
  }, [activeCompany]);

  const totalSalesAllTime = invoices.reduce((acc, i) => acc + (i.grandTotal || 0), 0);
  const todaySales = invoices
    .filter(
      (i) =>
        new Date(i.date).toDateString() === new Date().toDateString()
    )
    .reduce((acc, i) => acc + (i.grandTotal || 0), 0);

  const unpaidInvoices = invoices.filter((i) => i.paymentStatus !== 'Paid');
  const totalReceivables = unpaidInvoices.reduce((acc, i) => acc + (i.balanceAmount || 0), 0);

  const lowStockItems = stockSummary?.rows?.filter((it: any) => it.isLowStock) || [];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-4rem)]">
      {/* Header Banner */}
      {!activeCompany ? (
        <div className="bg-slate-900 border border-emerald-500/40 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span>Welcome to Vindywashini Books</span>
            </h1>
            <p className="text-xs text-slate-400">
              No active company found. Create your business entity or connect to your cloud database to start billing and accounting.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => useAppStore.getState().setCompanyModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/80 active:scale-95 transition"
            >
              <span>+ Create Company Entity</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition"
            >
              <span>Database Settings (F9)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-100 tracking-tight">
                {activeCompany?.tradeName || activeCompany?.legalName || 'My Business'}
              </h1>
              <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 text-xs font-bold font-mono">
                GSTIN: {activeCompany?.gstin || 'UNREGISTERED'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {activeCompany?.address?.line1 || ''}{activeCompany?.address?.city ? `, ${activeCompany.address.city}` : ''}{activeCompany?.address?.state ? `, ${activeCompany.address.state}` : ''} {activeCompany?.address?.stateCode ? `(Code: ${activeCompany.address.stateCode})` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveTab('billing')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/80 active:scale-95 transition"
            >
              <Receipt className="w-4 h-4" />
              <span>Create Invoice (F1)</span>
            </button>

            <button
              onClick={() => setActiveTab('purchase')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/80 active:scale-95 transition"
            >
              <Truck className="w-4 h-4" />
              <span>Record Purchase (Alt+P)</span>
            </button>

            <button
              onClick={() => setActiveTab('gst')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>GST Returns (F7)</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Today's Billing</span>
            <span className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-100 mt-2 font-mono">
            ₹{todaySales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
            <span>Today's active revenue</span>
          </div>
        </div>

        {/* Total Receivables */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Total Receivables</span>
            <span className="p-1.5 rounded-lg bg-amber-950 text-amber-400">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-amber-300 mt-2 font-mono">
            ₹{totalReceivables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {unpaidInvoices.length} pending / credit bills
          </div>
        </div>

        {/* Stock Inventory Value */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Stock Valuation</span>
            <span className="p-1.5 rounded-lg bg-sky-950 text-sky-400">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-100 mt-2 font-mono">
            ₹{(stockSummary?.totalStockValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stockSummary?.totalItems || 0} active master items
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
            <span>Low Stock Alert</span>
            <span className="p-1.5 rounded-lg bg-rose-950 text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-rose-400 mt-2 font-mono">
            {lowStockItems.length} Items
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Below reorder threshold level
          </div>
        </div>
      </div>

      {/* Main Split: Recent Invoices & Low Stock Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Invoices Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-slate-100">Recent Tax Invoices</h2>
              <p className="text-xs text-slate-400">Latest sales bills generated in the store</p>
            </div>

            <button
              onClick={() => setActiveTab('daybook')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>View Full Day Book</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">GSTIN / Type</th>
                  <th className="py-2.5 px-3 text-right">Grand Total</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {invoices.slice(0, 8).map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-850/50 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(inv.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-200 max-w-[150px] truncate">
                      {inv.customerName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                      {inv.customerGstin ? (
                        <span className="text-emerald-400 font-bold">B2B ({inv.customerGstin.slice(0, 4)}...)</span>
                      ) : (
                        <span className="text-slate-500">B2C (Retail)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                      ₹{inv.grandTotal.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          inv.paymentStatus === 'Paid'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : inv.paymentStatus === 'Partial'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                            : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                        }`}
                      >
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setShowPrintModal(true);
                        }}
                        className="px-2.5 py-1 rounded bg-emerald-650/90 hover:bg-emerald-500 text-white text-[11px] font-bold shadow transition inline-flex items-center gap-1"
                        title="Print / Export Invoice PDF"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                      No invoices recorded yet. Click "Create Invoice (F1)" to generate your first bill!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Low Stock Alerts & Quick Stats */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Reorder Items</span>
              </h2>
              <span className="text-xs font-mono text-rose-400 font-bold">
                {lowStockItems.length} Low
              </span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {lowStockItems.map((item: any) => (
                <div
                  key={item._id}
                  className="p-2.5 rounded-lg bg-slate-950 border border-rose-900/40 flex justify-between items-center text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-200">{item.name}</div>
                    <div className="text-[11px] text-slate-400">
                      HSN: {item.hsnCode} | GST: {item.gstRate}%
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-rose-400 font-extrabold">
                      {item.currentStock} {item.uqc}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Min: {item.reorderLevel}
                    </div>
                  </div>
                </div>
              ))}

              {lowStockItems.length === 0 && (
                <div className="py-8 text-center text-emerald-400 text-xs font-semibold flex flex-col items-center gap-1">
                  <CheckCircle2 className="w-6 h-6" />
                  <span>All inventory stock levels are healthy!</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2">
            <button
              onClick={() => setActiveTab('purchase')}
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition flex justify-center items-center gap-1.5"
            >
              <span>+ Record Purchase Bill (Alt+P)</span>
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition flex justify-center items-center gap-1.5"
            >
              <Package className="w-4 h-4 text-emerald-400" />
              <span>Manage Inventory Master (F5)</span>
            </button>
          </div>
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
    </div>
  );
};
