import React from 'react';
import {
  Building2,
  Database,
  Calendar,
  Plus,
  Receipt,
  Truck,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const Navbar: React.FC = () => {
  const {
    activeCompany,
    companies,
    setActiveCompany,
    setCompanyModalOpen,
    setActiveTab,
    dbStatus,
  } = useAppStore();

  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isDbConnected = dbStatus?.status === 'connected';

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between select-none z-30">
      {/* Left: Brand & Company Switcher */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-wide text-slate-100">
                Vindywashini Books
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                Desktop
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">Tally & POS Equivalent</p>
          </div>
        </div>

        <div className="h-7 w-px bg-slate-800 mx-1" />

        {/* Company Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Building2 className="w-4 h-4 absolute left-2.5 text-emerald-400 pointer-events-none" />
            <select
              value={activeCompany?._id || ''}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  setCompanyModalOpen(true);
                  return;
                }
                const found = companies.find((c) => c._id === e.target.value);
                if (found) setActiveCompany(found);
              }}
              className="bg-slate-800/90 text-slate-100 text-xs font-semibold pl-8 pr-8 py-1.5 rounded-lg border border-slate-700 hover:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[240px] truncate transition"
            >
              {companies.length === 0 ? (
                <option value="">No Company (Click + Company)</option>
              ) : (
                companies.map((comp) => (
                  <option key={comp._id} value={comp._id}>
                    {comp.tradeName || comp.legalName} ({comp.address?.state || 'Bihar'})
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            onClick={() => setCompanyModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:text-white hover:bg-emerald-600 text-xs font-bold border border-emerald-500/40 transition"
            title="Create or Manage Companies"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Company</span>
          </button>
        </div>
      </div>

      {/* Center: Quick Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('billing')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/60 transition active:scale-95"
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>New Bill (F1)</span>
        </button>

        <button
          onClick={() => setActiveTab('purchase')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-950/60 transition active:scale-95"
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Purchase (Alt+P)</span>
        </button>

        <button
          onClick={() => setActiveTab('vouchers')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Voucher (F2)</span>
        </button>

        <button
          onClick={() => setActiveTab('gst')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>GSTR-1 Excel/CSV (F7)</span>
        </button>
      </div>

      {/* Right: DB Status, FY Badge, Live Clock */}
      <div className="flex items-center gap-3 text-xs">
        {/* Financial Year */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono text-[11px] font-semibold">
            FY: {activeCompany?.currentFY || '2025-2026'}
          </span>
        </div>

        {/* MongoDB Status */}
        <div
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border cursor-pointer transition ${
            isDbConnected
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/40'
              : 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/40'
          }`}
          title="Click to view MongoDB Settings"
        >
          <Database className="w-3.5 h-3.5" />
          <div className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full ${
                isDbConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-[11px] font-medium font-mono">
              {isDbConnected ? 'MongoDB (Local)' : 'DB Offline'}
            </span>
          </div>
        </div>

        {/* Live Clock */}
        <div className="hidden lg:flex items-center gap-1 text-slate-400 font-mono text-[11px] pl-2 border-l border-slate-800">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
      </div>
    </header>
  );
};
