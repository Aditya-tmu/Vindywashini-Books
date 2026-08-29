import React from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Send,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Building,
  DollarSign,
  TrendingUp,
  RefreshCw,
  FileCode,
  Archive,
  Layers,
  ArrowUpRight,
  HelpCircle,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import { HelpDrawer } from '../components/HelpDrawer';

export const GstFilingView: React.FC = () => {
  const { activeCompany, showToast } = useAppStore();

  const [activeTab, setActiveTab] = React.useState<'gstr1' | 'gstr3b' | 'gstr2b-recon'>('gstr1');
  const [period, setPeriod] = React.useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );

  // GSTR-1 state
  const [gstr1Data, setGstr1Data] = React.useState<any>(null);
  const [gstr1Section, setGstr1Section] = React.useState<string>('b2b');
  const [isDirectFiling, setIsDirectFiling] = React.useState<boolean>(false);
  const [directFilingResult, setDirectFilingResult] = React.useState<any>(null);

  // GSTR-3B state
  const [gstr3bData, setGstr3bData] = React.useState<any>(null);

  // GSTR-2B Recon state
  const [reconData, setReconData] = React.useState<any>(null);
  const [reconFile, setReconFile] = React.useState<File | null>(null);
  const [isReconciling, setIsReconciling] = React.useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = React.useState<boolean>(false);

  const [loading, setLoading] = React.useState<boolean>(false);

  const loadGSTData = async () => {
    if (!activeCompany) return;
    try {
      setLoading(true);
      if (activeTab === 'gstr1') {
        const data = await api.getGSTR1(activeCompany._id, period);
        setGstr1Data(data);
      } else if (activeTab === 'gstr3b') {
        const data = await api.getGSTR3B(activeCompany._id, period);
        setGstr3bData(data);
      }
    } catch (err: any) {
      console.warn('Error loading GST return data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadGSTData();
  }, [activeCompany, activeTab, period]);

  // Direct E-Filing
  const handleDirectEFile = async () => {
    if (!activeCompany) return;
    try {
      setIsDirectFiling(true);
      const res = await api.directEFileGSTR1(activeCompany._id, period);
      setDirectFilingResult(res);
      if (res.success) {
        showToast(res.data.message || 'GSTR-1 transmitted to portal successfully!', 'success');
      } else {
        showToast(res.data.message || 'Direct e-Filing failed', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    } finally {
      setIsDirectFiling(false);
    }
  };

  // Run GSTR-2B Recon
  const handleRunRecon = async () => {
    if (!activeCompany) return;
    try {
      setIsReconciling(true);
      let records: any[] = [];

      // Sample mock 2B records if no file is uploaded so the user can test reconciliation immediately
      if (!reconFile) {
        records = [
          {
            gstin: '20AABCT5555M1Z9',
            tradeName: 'Tata Steel Tubes & Rods Depot',
            invoiceNumber: 'INV/JH/9081',
            invoiceDate: '05-Aug-25',
            invoiceValue: 47200,
            taxableValue: 40000,
            igst: 7200,
            cgst: 0,
            sgst: 0,
            cess: 0,
          },
          {
            gstin: '10AABCB9999K1Z4',
            tradeName: 'Birla Cement Corporation',
            invoiceNumber: 'BC/2025/112',
            invoiceDate: '12-Aug-25',
            invoiceValue: 25600,
            taxableValue: 20000,
            igst: 0,
            cgst: 2800,
            sgst: 2800,
            cess: 0,
          },
        ];
      }

      const result = await api.reconcileGSTR2B(activeCompany._id, period, records);
      setReconData(result);
      showToast('GSTR-2B Reconciliation completed!', 'success');
    } catch (err: any) {
      showToast('Reconciliation error: ' + err.message, 'error');
    } finally {
      setIsReconciling(false);
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-4rem)]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-100 flex items-center gap-2">
              <span>GST Compliance & Return Filing Center</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                CBIC Offline Ready
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Government offline utility format Excel (31 sheets), individual section CSVs, JSON export & 2B Recon
            </p>
          </div>
        </div>

        {/* Return Type Tabs & Period Picker */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
            <span className="text-slate-400 font-semibold">Period:</span>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-slate-900 text-slate-100 px-2 py-0.5 rounded border border-slate-700 font-mono text-xs"
            />
          </div>

          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 text-xs font-semibold">
            {[
              { id: 'gstr1', label: 'GSTR-1 Outward' },
              { id: 'gstr3b', label: 'GSTR-3B Summary' },
              { id: 'gstr2b-recon', label: '2A/2B Recon' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1 rounded transition ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsHelpOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition"
            title="Open GST Returns & ITC Guide"
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>Help</span>
          </button>
        </div>
      </div>

      {/* 1. GSTR-1 Tab */}
      {activeTab === 'gstr1' && gstr1Data && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-slate-400 text-xs font-semibold">Total Outward Invoices</div>
              <div className="text-2xl font-black text-slate-100 font-mono mt-1">
                {gstr1Data.summary.totalInvoices} Bills
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-slate-400 text-xs font-semibold">Total Taxable Value</div>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                ₹{gstr1Data.summary.totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-slate-400 text-xs font-semibold">Total CGST + SGST</div>
              <div className="text-2xl font-black text-sky-400 font-mono mt-1">
                ₹{(gstr1Data.summary.totalCgst + gstr1Data.summary.totalSgst).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-slate-400 text-xs font-semibold">Total IGST (Inter-State)</div>
              <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                ₹{gstr1Data.summary.totalIgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-slate-400 text-xs font-semibold">Total Invoice Value</div>
              <div className="text-2xl font-black text-slate-100 font-mono mt-1">
                ₹{gstr1Data.summary.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Export Action Center Card */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-400" />
                <span>Portal-Ready File Exports (Offline Utility Compatible)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Guaranteed byte-matching government headers for direct portal import or Excel-to-JSON utility
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* 1. Multi-sheet Excel */}
              <a
                href={api.getGstr1ExcelUrl(activeCompany!._id, period)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950 transition active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download Excel (.xlsx)</span>
              </a>

              {/* 2. CSV Zip */}
              <a
                href={api.getGstr1CsvZipUrl(activeCompany!._id, period)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-xs border border-slate-700 transition"
              >
                <Archive className="w-4 h-4 text-emerald-400" />
                <span>Download CSVs (.zip)</span>
              </a>

              {/* 3. JSON Export */}
              <a
                href={api.getGstr1JsonUrl(activeCompany!._id, period)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-xs border border-slate-700 transition"
              >
                <FileCode className="w-4 h-4 text-sky-400" />
                <span>Portal JSON</span>
              </a>

              {/* 4. Direct GSP e-File Button */}
              <button
                onClick={handleDirectEFile}
                disabled={isDirectFiling}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs border border-slate-700 transition"
                title="Direct e-Filing via GSP integration"
              >
                <Send className="w-4 h-4 text-amber-400" />
                <span>{isDirectFiling ? 'Connecting GSP...' : 'Direct e-File (GSP)'}</span>
              </button>
            </div>
          </div>

          {/* Section Tables View */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3 text-xs font-semibold">
              {[
                { id: 'b2b', label: `B2B Supplies (${gstr1Data.b2b?.length || 0})` },
                { id: 'b2cl', label: `B2C Large (${gstr1Data.b2cl?.length || 0})` },
                { id: 'b2cs', label: `B2C Small (${gstr1Data.b2cs?.length || 0})` },
                { id: 'cdnr', label: `CDNR Registered (${gstr1Data.cdnr?.length || 0})` },
                { id: 'cdnur', label: `CDNUR Unregistered (${gstr1Data.cdnur?.length || 0})` },
                { id: 'hsn', label: `HSN Summary (${(gstr1Data.hsn_b2b?.length || 0) + (gstr1Data.hsn_b2c?.length || 0)})` },
                { id: 'docs', label: `Docs Issued (${gstr1Data.docs?.length || 0})` },
              ].map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => setGstr1Section(sec.id)}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    gstr1Section === sec.id
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {sec.label}
                </button>
              ))}
            </div>

            {/* B2B Table */}
            {gstr1Section === 'b2b' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                      <th className="py-2.5 px-3">GSTIN of Recipient</th>
                      <th className="py-2.5 px-3">Receiver Name</th>
                      <th className="py-2.5 px-3">Invoice Number</th>
                      <th className="py-2.5 px-3">Invoice Date</th>
                      <th className="py-2.5 px-3 text-right">Invoice Value</th>
                      <th className="py-2.5 px-3">Place of Supply</th>
                      <th className="py-2.5 px-3 text-center">Reverse Charge</th>
                      <th className="py-2.5 px-3 text-center">Rate</th>
                      <th className="py-2.5 px-3 text-right">Taxable Value</th>
                      <th className="py-2.5 px-3 text-right">Cess</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium font-mono text-[11px]">
                    {gstr1Data.b2b.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-850/40 transition">
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">{r.gstin}</td>
                        <td className="py-2.5 px-3 text-slate-200 font-sans text-xs">{r.receiverName}</td>
                        <td className="py-2.5 px-3 text-slate-300 font-bold">{r.invoiceNumber}</td>
                        <td className="py-2.5 px-3 text-slate-400">{r.invoiceDate}</td>
                        <td className="py-2.5 px-3 text-right text-slate-100 font-bold">₹{r.invoiceValue.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-slate-400 font-sans">{r.placeOfSupply}</td>
                        <td className="py-2.5 px-3 text-center text-slate-400">{r.reverseCharge}</td>
                        <td className="py-2.5 px-3 text-center text-emerald-400">{r.rate}%</td>
                        <td className="py-2.5 px-3 text-right text-slate-100">₹{r.taxableValue.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-400">₹{(r.cessAmount || 0).toFixed(2)}</td>
                      </tr>
                    ))}

                    {gstr1Data.b2b.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-500 text-xs font-sans">
                          No B2B invoices recorded in this return period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* B2CS Table */}
            {gstr1Section === 'b2cs' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Place Of Supply</th>
                      <th className="py-2.5 px-3 text-center">Rate</th>
                      <th className="py-2.5 px-3 text-right">Taxable Value</th>
                      <th className="py-2.5 px-3 text-right">Cess Amount</th>
                      <th className="py-2.5 px-3">E-Commerce GSTIN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium font-mono text-[11px]">
                    {gstr1Data.b2cs.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-850/40 transition">
                        <td className="py-2.5 px-3 text-slate-300">{r.type}</td>
                        <td className="py-2.5 px-3 text-slate-200 font-sans">{r.placeOfSupply}</td>
                        <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">{r.rate}%</td>
                        <td className="py-2.5 px-3 text-right text-slate-100 font-bold">₹{r.taxableValue.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-400">₹{(r.cessAmount || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-slate-500">{r.eCommerceGstin || '—'}</td>
                      </tr>
                    ))}

                    {gstr1Data.b2cs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 text-xs font-sans">
                          No B2CS transactions in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* HSN Summary Table */}
            {gstr1Section === 'hsn' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                      <th className="py-2.5 px-3">HSN</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center">UQC</th>
                      <th className="py-2.5 px-3 text-right">Total Qty</th>
                      <th className="py-2.5 px-3 text-right">Total Value</th>
                      <th className="py-2.5 px-3 text-right">Taxable Value</th>
                      <th className="py-2.5 px-3 text-center">Rate</th>
                      <th className="py-2.5 px-3 text-right">IGST</th>
                      <th className="py-2.5 px-3 text-right">CGST</th>
                      <th className="py-2.5 px-3 text-right">SGST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium font-mono text-[11px]">
                    {[...gstr1Data.hsn_b2b, ...gstr1Data.hsn_b2c].map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-850/40 transition">
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">{r.hsn}</td>
                        <td className="py-2.5 px-3 text-slate-200 font-sans text-xs">{r.description}</td>
                        <td className="py-2.5 px-3 text-center text-slate-300">{r.uqc}</td>
                        <td className="py-2.5 px-3 text-right text-slate-100">{r.totalQuantity}</td>
                        <td className="py-2.5 px-3 text-right text-slate-100 font-bold">₹{r.totalValue.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-100">₹{r.taxableValue.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-center text-emerald-400">{r.rate}%</td>
                        <td className="py-2.5 px-3 text-right text-amber-400">₹{(r.integratedTaxAmount || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right text-sky-400">₹{(r.centralTaxAmount || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right text-sky-400">₹{(r.stateTaxAmount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Docs Issued Table */}
            {gstr1Section === 'docs' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Nature of Document</th>
                      <th className="py-2.5 px-3">Sr. No. From</th>
                      <th className="py-2.5 px-3">Sr. No. To</th>
                      <th className="py-2.5 px-3 text-right">Total Number</th>
                      <th className="py-2.5 px-3 text-right">Cancelled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {gstr1Data.docs.map((d: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-850/40 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-200">{d.natureOfDocument}</td>
                        <td className="py-2.5 px-3 font-mono text-emerald-400">{d.srNoFrom}</td>
                        <td className="py-2.5 px-3 font-mono text-emerald-400">{d.srNoTo}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">{d.totalNumber}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">{d.cancelled}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. GSTR-3B Tab */}
      {activeTab === 'gstr3b' && gstr3bData && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-100">GSTR-3B Monthly Return Summary</h2>
            <p className="text-xs text-slate-400">
              Tax computation matching official portal Table 3.1, Table 4 (ITC), and Net Payable
            </p>
          </div>

          {/* Table 3.1 Outward Supplies */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-slate-800 pb-2">
              3.1 Details of Outward Supplies and Inward Supplies Liable to Reverse Charge
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                    <th className="py-2 px-2 font-sans">Nature of Supply</th>
                    <th className="py-2 px-2 text-right">Total Taxable Value (₹)</th>
                    <th className="py-2 px-2 text-right">Integrated Tax (₹)</th>
                    <th className="py-2 px-2 text-right">Central Tax (₹)</th>
                    <th className="py-2 px-2 text-right">State/UT Tax (₹)</th>
                    <th className="py-2 px-2 text-right">Cess (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  <tr>
                    <td className="py-2 px-2 font-sans text-slate-200">
                      (a) Outward Taxable supplies (other than zero rated, nil rated and exempted)
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-slate-100">
                      ₹{gstr3bData.table3_1.outwardTaxableSupplies.totalTaxable.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right text-amber-400">
                      ₹{gstr3bData.table3_1.outwardTaxableSupplies.igst.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right text-sky-400">
                      ₹{gstr3bData.table3_1.outwardTaxableSupplies.cgst.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right text-sky-400">
                      ₹{gstr3bData.table3_1.outwardTaxableSupplies.sgst.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-400">
                      ₹{gstr3bData.table3_1.outwardTaxableSupplies.cess.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 4 Eligible ITC */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 border-b border-slate-800 pb-2">
              4. Eligible Input Tax Credit (ITC) from Purchase Register
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                    <th className="py-2 px-2 font-sans">Details</th>
                    <th className="py-2 px-2 text-right">Integrated Tax (₹)</th>
                    <th className="py-2 px-2 text-right">Central Tax (₹)</th>
                    <th className="py-2 px-2 text-right">State/UT Tax (₹)</th>
                    <th className="py-2 px-2 text-right">Cess (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  <tr>
                    <td className="py-2 px-2 font-sans text-slate-200">(A) (5) All other ITC</td>
                    <td className="py-2 px-2 text-right text-amber-400">
                      ₹{gstr3bData.table4.netITCAvailable.igst.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right text-sky-400">
                      ₹{gstr3bData.table4.netITCAvailable.cgst.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right text-sky-400">
                      ₹{gstr3bData.table4.netITCAvailable.sgst.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-400">
                      ₹{gstr3bData.table4.netITCAvailable.cess.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Net Tax Liability Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-200">Net Tax Payable (After ITC Offset)</h4>
              <p className="text-[11px] text-slate-400">
                Cash required to be deposited into electronic cash ledger before filing
              </p>
            </div>

            <div className="text-right">
              <div className="text-2xl font-black font-mono text-emerald-400">
                ₹{gstr3bData.totalNetLiability.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500">
                CGST: ₹{gstr3bData.taxPayable.cgst.toFixed(2)} | SGST: ₹{gstr3bData.taxPayable.sgst.toFixed(2)} | IGST: ₹{gstr3bData.taxPayable.igst.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. GSTR-2A/2B Recon Tab */}
      {activeTab === 'gstr2b-recon' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-100">GSTR-2A / 2B Purchase Register Auto-Matching Tool</h2>
              <p className="text-xs text-slate-400">
                Verify input tax credit claims by auto-matching supplier filings against your internal books
              </p>
            </div>

            <button
              onClick={handleRunRecon}
              disabled={isReconciling}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition"
            >
              <RefreshCw className={`w-4 h-4 ${isReconciling ? 'animate-spin' : ''}`} />
              <span>{isReconciling ? 'Reconciling...' : 'Run 2B Auto-Match'}</span>
            </button>
          </div>

          {reconData && (
            <div className="space-y-4">
              {/* Recon Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80">
                  <div className="text-[11px] text-emerald-300 font-bold uppercase">100% Matched</div>
                  <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                    {reconData.summary.matchedCount} Invoices
                  </div>
                  <div className="text-[10px] text-emerald-500 mt-1">Eligible for Full ITC</div>
                </div>

                <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-800/80">
                  <div className="text-[11px] text-amber-300 font-bold uppercase">Value Mismatch</div>
                  <div className="text-xl font-black text-amber-400 font-mono mt-1">
                    {reconData.summary.mismatchedCount} Invoices
                  </div>
                  <div className="text-[10px] text-amber-500 mt-1">Check supplier tax delta</div>
                </div>

                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80">
                  <div className="text-[11px] text-rose-300 font-bold uppercase">In Books Only</div>
                  <div className="text-xl font-black text-rose-400 font-mono mt-1">
                    {reconData.summary.inBooksOnlyCount} Invoices
                  </div>
                  <div className="text-[10px] text-rose-500 mt-1">Supplier hasn't filed GSTR-1</div>
                </div>

                <div className="p-3 rounded-lg bg-sky-950/60 border border-sky-800/80">
                  <div className="text-[11px] text-sky-300 font-bold uppercase">In 2B Only</div>
                  <div className="text-xl font-black text-sky-400 font-mono mt-1">
                    {reconData.summary.in2bOnlyCount} Invoices
                  </div>
                  <div className="text-[10px] text-sky-500 mt-1">Missing bill in books</div>
                </div>
              </div>

              {/* Recon Breakdown Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Supplier GSTIN</th>
                      <th className="py-2.5 px-3">Party Name</th>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3 text-right">Books Tax (₹)</th>
                      <th className="py-2.5 px-3 text-right">Portal 2B Tax (₹)</th>
                      <th className="py-2.5 px-3 text-right">Difference (₹)</th>
                      <th className="py-2.5 px-3">Action Recommended</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {reconData.records.map((rec: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-850/40 transition">
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              rec.status === 'MATCHED'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : rec.status === 'MISMATCHED'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : rec.status === 'IN_BOOKS_ONLY'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : 'bg-sky-950 text-sky-400 border border-sky-800'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-200">{rec.gstin}</td>
                        <td className="py-2.5 px-3 text-slate-100">{rec.partyName}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{rec.invoiceNumber}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-200">₹{rec.booksTax.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-200">₹{rec.portalTax.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                          ₹{rec.diffTax.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-300">{rec.actionRecommended}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!reconData && (
            <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-8 h-8 text-slate-600" />
              <span>Click "Run 2B Auto-Match" to reconcile your purchase vouchers with supplier filings!</span>
            </div>
          )}
        </div>
      )}

      {/* Contextual Help Drawer */}
      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        initialTopicId="gst"
      />
    </div>
  );
};
