import React from 'react';
import {
  BarChart2,
  FileSpreadsheet,
  Download,
  Calendar,
  RefreshCw,
  X,
  Sparkles,
  Building,
  Receipt,
  FileText,
  DollarSign,
  Layers,
  Cloud,
  Link,
  Copy,
  Check,
  CheckCircle2,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { Party } from '../types';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';

interface PartyGstSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party | null;
  partyType: 'Customer' | 'Supplier';
}

type DateRangeOption = 'all' | 'this_month' | 'last_month' | 'custom';

export const PartyGstSummaryModal: React.FC<PartyGstSummaryModalProps> = ({
  isOpen,
  onClose,
  party,
  partyType,
}) => {
  const { activeCompany, settings, showToast } = useAppStore();
  const isStorageConfigured = Boolean(settings?.storage?.enabled);

  const [dateRange, setDateRange] = React.useState<DateRangeOption>('all');
  const [startDate, setStartDate] = React.useState<string>('');
  const [endDate, setEndDate] = React.useState<string>('');
  const [summaryData, setSummaryData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = React.useState<boolean>(false);

  // Opt-in Cloud Storage State
  const [uploadToCloud, setUploadToCloud] = React.useState<boolean>(false);
  const [cloudResult, setCloudResult] = React.useState<{
    signedUrl: string;
    cloudPath: string;
    expiresAt?: string;
    filename?: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = React.useState<boolean>(false);

  // Set default custom dates (current month)
  React.useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
      setDateRange('all');
      setCloudResult(null);
    }
  }, [isOpen, party]);

  const loadSummaryData = React.useCallback(async () => {
    if (!activeCompany || !party || !isOpen) return;
    try {
      setIsLoading(true);
      if (partyType === 'Customer') {
        const data = await api.getPartyGstSummary(
          party._id,
          activeCompany._id,
          dateRange,
          dateRange === 'custom' ? startDate : undefined,
          dateRange === 'custom' ? endDate : undefined
        );
        setSummaryData(data);
      } else {
        const data = await api.getPartyPurchaseSummary(
          party._id,
          activeCompany._id,
          dateRange,
          dateRange === 'custom' ? startDate : undefined,
          dateRange === 'custom' ? endDate : undefined
        );
        setSummaryData(data);
      }
    } catch (err: any) {
      console.warn('Error loading GST summary:', err.message);
      setSummaryData(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeCompany, party, partyType, dateRange, startDate, endDate, isOpen]);

  React.useEffect(() => {
    loadSummaryData();
  }, [loadSummaryData]);

  if (!isOpen || !party) return null;

  const isCustomer = partyType === 'Customer';
  const reportTitle = isCustomer ? 'GST Summary Report (Outward Sales)' : 'Purchase & Input Tax Credit (ITC) Summary';

  const handleDownloadPdf = async () => {
    if (!activeCompany || !party) return;
    try {
      setIsDownloadingPdf(true);
      const safeName = party.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const startStr = dateRange === 'custom' && startDate ? startDate : dateRange;
      const endStr = dateRange === 'custom' && endDate ? endDate : '';
      const filename = isCustomer
        ? `gst_summary_${safeName}_${startStr}${endStr ? '_' + endStr : ''}.pdf`
        : `itc_summary_${safeName}_${startStr}${endStr ? '_' + endStr : ''}.pdf`;

      // 1. Opt-in Cloud Storage Upload
      if (isStorageConfigured && uploadToCloud) {
        try {
          const cloudRes = isCustomer
            ? await api.exportPartyGstReportCloud(
                party._id,
                activeCompany._id,
                dateRange,
                dateRange === 'custom' ? startDate : undefined,
                dateRange === 'custom' ? endDate : undefined
              )
            : await api.exportPartyPurchaseReportCloud(
                party._id,
                activeCompany._id,
                dateRange,
                dateRange === 'custom' ? startDate : undefined,
                dateRange === 'custom' ? endDate : undefined
              );

          if (cloudRes.success && cloudRes.signedUrl) {
            setCloudResult({
              signedUrl: cloudRes.signedUrl,
              cloudPath: cloudRes.cloudPath,
              expiresAt: cloudRes.expiresAt,
              filename: cloudRes.filename || filename,
            });
            showToast('Report uploaded to cloud! Share link ready below.', 'success');
          }
        } catch (cloudErr: any) {
          console.warn('Cloud upload error during GST report export:', cloudErr);
          showToast(
            `Could not upload report to cloud storage — ${cloudErr.response?.data?.error || cloudErr.message}. Local PDF will still be saved.`,
            'info'
          );
        }
      }

      // 2. Download local PDF file
      const downloadUrl = isCustomer
        ? api.getPartyGstReportPdfUrl(
            party._id,
            activeCompany._id,
            dateRange,
            dateRange === 'custom' ? startDate : undefined,
            dateRange === 'custom' ? endDate : undefined
          )
        : api.getPartyPurchaseReportPdfUrl(
            party._id,
            activeCompany._id,
            dateRange,
            dateRange === 'custom' ? startDate : undefined,
            dateRange === 'custom' ? endDate : undefined
          );

      await api.downloadPdfFromUrl(downloadUrl, filename);
      showToast(`Report downloaded: ${filename}`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Error downloading PDF report', 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  };


  const recordsList = isCustomer ? summaryData?.invoices || [] : summaryData?.purchases || [];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-850 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                isCustomer
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
              }`}
            >
              {isCustomer ? <BarChart2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>{reportTitle}</span>
                <span
                  className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                    isCustomer
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                  }`}
                >
                  {isCustomer ? 'GSTR-1' : 'GSTR-3B ITC'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Party: <span className="font-semibold text-slate-200">{party.name}</span>
                {party.gstin && (
                  <span className="font-mono text-emerald-400 ml-2 font-bold">
                    GSTIN: {party.gstin}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf || isLoading || !summaryData || recordsList.length === 0}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-lg transition active:scale-95 disabled:opacity-50 ${
                isCustomer
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950'
              }`}
            >
              {isDownloadingPdf ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Report (PDF)</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => setDateRange('all')}
              className={`px-3 py-1 rounded font-semibold transition ${
                dateRange === 'all'
                  ? isCustomer
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setDateRange('this_month')}
              className={`px-3 py-1 rounded font-semibold transition ${
                dateRange === 'this_month'
                  ? isCustomer
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setDateRange('last_month')}
              className={`px-3 py-1 rounded font-semibold transition ${
                dateRange === 'last_month'
                  ? isCustomer
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => setDateRange('custom')}
              className={`px-3 py-1 rounded font-semibold transition ${
                dateRange === 'custom'
                  ? isCustomer
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Custom Range
            </button>
          </div>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-800 text-slate-100 text-xs px-2.5 py-1 rounded border border-slate-700 font-mono"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-800 text-slate-100 text-xs px-2.5 py-1 rounded border border-slate-700 font-mono"
              />
            </div>
          )}

          {/* Cloud Opt-in Checkbox */}
          {isStorageConfigured ? (
            <label className="flex items-center gap-1.5 cursor-pointer select-none group bg-slate-800/80 hover:bg-slate-750 px-2.5 py-1.5 rounded-lg border border-slate-700 transition">
              <input
                type="checkbox"
                checked={uploadToCloud}
                onChange={(e) => setUploadToCloud(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-emerald-500 bg-slate-950 border-slate-700 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
              />
              <div className="flex items-center gap-1 text-[11px] text-slate-200 group-hover:text-white font-semibold">
                <Cloud className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Upload Report to Cloud & Link</span>
              </div>
            </label>
          ) : null}

          <div className="text-slate-400 text-xs font-mono">
            Period: <b className="text-slate-200">{summaryData?.dateRangeLabel || 'All Time'}</b>
          </div>
        </div>

        {/* Main Content: KPI Cards & Live Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Cloud Link Confirmation Box */}
          {cloudResult && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/80 space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Report Cloud Share Link Ready</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-200 font-mono">
                  30-Day Signed URL
                </span>
              </div>

              <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 font-mono text-xs text-slate-200">
                <Link className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate flex-1 text-[11px]">{cloudResult.signedUrl}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(cloudResult.signedUrl);
                    setCopiedLink(true);
                    showToast('Report cloud link copied to clipboard!', 'success');
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition flex items-center gap-1 text-[11px]"
                  title="Copy link"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Quick WhatsApp / External Share */}
              <div className="flex gap-2 pt-0.5">
                {party.phone && (
                  <button
                    type="button"
                    onClick={() => {
                      const phone = (party.phone || '').replace(/[^0-9]/g, '');
                      const msg = `Dear ${party.name}, please find your official ${reportTitle} (${dateRange}) here:\n\n📄 Download Report: ${cloudResult.signedUrl}`;
                      const waUrl = `https://wa.me/${phone.startsWith('91') ? phone : '91' + phone}?text=${encodeURIComponent(msg)}`;
                      window.open(waUrl, '_blank');
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Share via WhatsApp</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => window.open(cloudResult.signedUrl, '_blank')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Link</span>
                </button>
              </div>
            </div>
          )}

          {isLoading ? (

            <div className="py-20 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
              <span>Computing live tax & voucher aggregation...</span>
            </div>
          ) : summaryData ? (
            <>
              {/* Aggregated KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-850 rounded-xl border border-slate-800 shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    {isCustomer ? 'Total Invoices' : 'Total Purchase Bills'}
                  </div>
                  <div className="text-xl font-black font-mono text-slate-100 mt-1">
                    {isCustomer ? summaryData.invoiceCount : summaryData.billCount}
                  </div>
                </div>

                <div className="p-3 bg-slate-850 rounded-xl border border-slate-800 shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    {isCustomer ? 'Taxable Sales' : 'Taxable Purchases'}
                  </div>
                  <div className={`text-xl font-black font-mono mt-1 ${isCustomer ? 'text-emerald-400' : 'text-indigo-400'}`}>
                    ₹{Number(summaryData.totalTaxable || 0).toFixed(2)}
                  </div>
                </div>

                <div className="p-3 bg-slate-850 rounded-xl border border-slate-800 shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    {isCustomer ? 'Total Output GST' : 'Eligible ITC Claimable'}
                  </div>
                  <div className="text-xl font-black font-mono text-emerald-400 mt-1">
                    ₹{Number(summaryData.totalTax || 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    CGST: ₹{Number(summaryData.totalCgst || 0).toFixed(2)} | SGST: ₹{Number(summaryData.totalSgst || 0).toFixed(2)} | IGST: ₹{Number(summaryData.totalIgst || 0).toFixed(2)}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border shadow-sm ${isCustomer ? 'bg-emerald-950/40 border-emerald-800/60' : 'bg-indigo-950/40 border-indigo-800/60'}`}>
                  <div className="text-[10px] uppercase font-bold text-slate-300">
                    {isCustomer ? 'Grand Total Invoiced' : 'Grand Total Payable'}
                  </div>
                  <div className="text-xl font-black font-mono text-slate-100 mt-1">
                    ₹{Number(summaryData.grandTotal || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="bg-slate-850 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                <div className="p-3 bg-slate-900 border-b border-slate-800 font-bold text-xs text-slate-200 flex justify-between items-center">
                  <span>{isCustomer ? 'Invoice-wise Tax Breakdown' : 'Purchase Bill-wise ITC Breakdown'}</span>
                  <span className="text-[10px] text-slate-400">
                    Showing {recordsList.length} items
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-900 text-slate-400 uppercase text-[10px] font-bold tracking-wider z-10">
                      <tr className="border-b border-slate-800">
                        <th className="p-2.5 text-center w-8">#</th>
                        <th className="p-2.5">{isCustomer ? 'Invoice #' : 'Bill #'}</th>
                        {!isCustomer && <th className="p-2.5">Supplier Inv #</th>}
                        <th className="p-2.5">Date</th>
                        {isCustomer && <th className="p-2.5">Place of Supply</th>}
                        <th className="p-2.5 text-right">Taxable (₹)</th>
                        <th className="p-2.5 text-right">{isCustomer ? 'CGST' : 'In CGST'}</th>
                        <th className="p-2.5 text-right">{isCustomer ? 'SGST' : 'In SGST'}</th>
                        <th className="p-2.5 text-right">{isCustomer ? 'IGST' : 'In IGST'}</th>
                        <th className="p-2.5 text-right">{isCustomer ? 'Total Tax' : 'Total ITC'}</th>
                        <th className="p-2.5 text-right">Grand Total (₹)</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {recordsList.map((rec: any, idx: number) => {
                        const recDate = rec.date ? new Date(rec.date).toLocaleDateString('en-IN') : '—';
                        const taxable = Number(rec.totalTaxable ?? rec.taxableAmount ?? 0);
                        const cgst = Number(rec.cgstTotal ?? 0);
                        const sgst = Number(rec.sgstTotal ?? 0);
                        const igst = Number(rec.igstTotal ?? 0);
                        const totalTax = cgst + sgst + igst + Number(rec.cessTotal || 0);
                        const grandTotal = Number(rec.grandTotal || 0);

                        return (
                          <tr key={rec._id || idx} className="hover:bg-slate-800/50 transition text-[11px]">
                            <td className="p-2.5 text-center text-slate-500">{idx + 1}</td>
                            <td className="p-2.5 font-bold font-mono text-emerald-400">
                              {isCustomer ? rec.invoiceNumber : rec.billNumber}
                            </td>
                            {!isCustomer && (
                              <td className="p-2.5 font-mono text-indigo-300 font-semibold">
                                {rec.supplierInvoiceNumber || '—'}
                              </td>
                            )}
                            <td className="p-2.5 font-mono text-slate-300">{recDate}</td>
                            {isCustomer && (
                              <td className="p-2.5 text-slate-400 text-[10px]">{rec.placeOfSupply || '—'}</td>
                            )}
                            <td className="p-2.5 text-right font-mono font-semibold text-slate-200">
                              ₹{taxable.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-400">
                              ₹{cgst.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-400">
                              ₹{sgst.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-400">
                              ₹{igst.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-emerald-400">
                              ₹{totalTax.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right font-mono font-extrabold text-slate-100">
                              ₹{grandTotal.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  rec.paymentStatus === 'Paid'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                    : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                }`}
                              >
                                {rec.paymentStatus || (isCustomer ? 'Paid' : 'Unpaid')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                      {recordsList.length === 0 && (
                        <tr>
                          <td colSpan={12} className="py-12 text-center text-slate-500 text-xs">
                            No records found for this party in the selected date period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {recordsList.length > 0 && (
                      <tfoot className="sticky bottom-0 bg-slate-900 border-t border-slate-700 font-bold text-slate-200 text-xs">
                        <tr>
                          <td colSpan={isCustomer ? 4 : 4} className="p-2.5 text-right uppercase text-[10px]">
                            Summary Totals:
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-100">
                            ₹{Number(summaryData.totalTaxable || 0).toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-300">
                            ₹{Number(summaryData.totalCgst || 0).toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-300">
                            ₹{Number(summaryData.totalSgst || 0).toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-300">
                            ₹{Number(summaryData.totalIgst || 0).toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-emerald-400 font-extrabold">
                            ₹{Number(summaryData.totalTax || 0).toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-emerald-400 font-black text-sm">
                            ₹{Number(summaryData.grandTotal || 0).toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-slate-500 text-xs">
              No summary data available.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-850 border-t border-slate-800 flex justify-between items-center text-xs">
          <div className="text-slate-400 text-[11px]">
            {isCustomer
              ? 'Export includes official business header, customer GSTIN, tax analysis, and individual invoice registers.'
              : 'Export includes internal audit format for claiming Input Tax Credit in GSTR-3B Table 4.'}
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
  );
};
