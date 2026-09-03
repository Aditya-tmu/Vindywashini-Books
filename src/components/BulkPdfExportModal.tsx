import React from 'react';
import {
  Printer,
  AlertTriangle,
  X,
  Download,
  RefreshCw,
  FileText,
  Cloud,
  Link,
  Copy,
  Check,
  CheckCircle2,
  MessageSquare,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { Party } from '../types';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';

interface BulkPdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party | null;
  partyType: 'Customer' | 'Supplier';
}

type DateRangeOption = 'all' | 'this_month' | 'last_month' | 'custom';

export const BulkPdfExportModal: React.FC<BulkPdfExportModalProps> = ({
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
  const [recordCount, setRecordCount] = React.useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = React.useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState<boolean>(false);

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

  // Load record count when range changes
  const checkRecordCount = React.useCallback(async () => {
    if (!activeCompany || !party || !isOpen) return;
    try {
      setIsLoadingCount(true);
      if (partyType === 'Customer') {
        const summary = await api.getPartyGstSummary(
          party._id,
          activeCompany._id,
          dateRange,
          dateRange === 'custom' ? startDate : undefined,
          dateRange === 'custom' ? endDate : undefined
        );
        setRecordCount(summary?.invoiceCount ?? 0);
      } else {
        const summary = await api.getPartyPurchaseSummary(
          party._id,
          activeCompany._id,
          dateRange,
          dateRange === 'custom' ? startDate : undefined,
          dateRange === 'custom' ? endDate : undefined
        );
        setRecordCount(summary?.billCount ?? 0);
      }
    } catch (err: any) {
      console.warn('Error checking record count:', err.message);
      setRecordCount(0);
    } finally {
      setIsLoadingCount(false);
    }
  }, [activeCompany, party, partyType, dateRange, startDate, endDate, isOpen]);

  React.useEffect(() => {
    checkRecordCount();
  }, [checkRecordCount]);

  if (!isOpen || !party) return null;

  const isCustomer = partyType === 'Customer';
  const title = isCustomer ? 'Print All Invoices (Bulk PDF)' : 'Print All Purchase Bills (Bulk PDF)';
  const recordLabel = isCustomer ? 'Sales Invoices' : 'Purchase Bills';

  const handleOpenBulkPreview = () => {
    if (!activeCompany || !party) return;
    const previewUrl = isCustomer
      ? api.getPartyBulkInvoicesPreviewHtmlUrl(
          party._id,
          activeCompany._id,
          dateRange,
          dateRange === 'custom' ? startDate : undefined,
          dateRange === 'custom' ? endDate : undefined
        )
      : api.getPartyBulkPurchasesPreviewHtmlUrl(
          party._id,
          activeCompany._id,
          dateRange,
          dateRange === 'custom' ? startDate : undefined,
          dateRange === 'custom' ? endDate : undefined
        );
    window.open(previewUrl, '_blank');
    showToast('Opened consolidated invoices in new tab! Click "Download PDF" or "Print" in top bar.', 'info');
  };

  const handleDownloadBulkPdf = async () => {
    if (!activeCompany || !party) return;
    try {
      setIsGeneratingPdf(true);
      const safeName = party.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const startStr = dateRange === 'custom' && startDate ? startDate : dateRange;
      const endStr = dateRange === 'custom' && endDate ? endDate : '';
      const filename = isCustomer
        ? `invoices_${safeName}_${startStr}${endStr ? '_' + endStr : ''}.pdf`
        : `purchases_${safeName}_${startStr}${endStr ? '_' + endStr : ''}.pdf`;

      // 1. If opt-in Cloud upload is requested
      if (isStorageConfigured && uploadToCloud) {
        try {
          const cloudRes = isCustomer
            ? await api.exportBulkInvoicesCloud(
                party._id,
                activeCompany._id,
                dateRange,
                dateRange === 'custom' ? startDate : undefined,
                dateRange === 'custom' ? endDate : undefined
              )
            : await api.exportBulkPurchasesCloud(
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
            showToast('Bulk PDF uploaded to cloud! Share link ready below.', 'success');
          }
        } catch (cloudErr: any) {
          console.warn('Cloud upload error during bulk export:', cloudErr);
          showToast(
            `Could not upload to cloud storage — ${cloudErr.response?.data?.error || cloudErr.message}. Local PDF will still be saved.`,
            'info'
          );
        }
      }

      // 2. Download local PDF file with automatic fallback to printable view
      const downloadUrl = isCustomer
        ? api.getPartyBulkInvoicesPdfUrl(
            party._id,
            activeCompany._id,
            dateRange,
            dateRange === 'custom' ? startDate : undefined,
            dateRange === 'custom' ? endDate : undefined
          )
        : api.getPartyBulkPurchasesPdfUrl(
            party._id,
            activeCompany._id,
            dateRange,
            dateRange === 'custom' ? startDate : undefined,
            dateRange === 'custom' ? endDate : undefined
          );

      try {
        await api.downloadPdfFromUrl(downloadUrl, filename);
        showToast(`Consolidated PDF saved locally: ${filename}`, 'success');
      } catch (dlErr: any) {
        console.warn('Direct PDF binary download note, opening printable browser view:', dlErr);
        handleOpenBulkPreview();
      }

      if (!uploadToCloud) {
        onClose();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Error generating bulk PDF', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  const isLargeSet = (recordCount || 0) > 200;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 bg-slate-850 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isCustomer ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'}`}>
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">{title}</h3>
              <p className="text-xs text-slate-400">
                Party: <span className="font-semibold text-slate-200">{party.name}</span>
                {party.gstin && <span className="font-mono text-emerald-400 ml-1.5 font-bold">({party.gstin})</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-2">Select Date Period for Consolidated PDF:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setDateRange('all')}
                className={`py-2 px-3 rounded-lg font-bold text-xs transition border ${
                  dateRange === 'all'
                    ? isCustomer ? 'bg-emerald-600 text-white border-emerald-500 shadow' : 'bg-indigo-600 text-white border-indigo-500 shadow'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => setDateRange('this_month')}
                className={`py-2 px-3 rounded-lg font-bold text-xs transition border ${
                  dateRange === 'this_month'
                    ? isCustomer ? 'bg-emerald-600 text-white border-emerald-500 shadow' : 'bg-indigo-600 text-white border-indigo-500 shadow'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setDateRange('last_month')}
                className={`py-2 px-3 rounded-lg font-bold text-xs transition border ${
                  dateRange === 'last_month'
                    ? isCustomer ? 'bg-emerald-600 text-white border-emerald-500 shadow' : 'bg-indigo-600 text-white border-indigo-500 shadow'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                Last Month
              </button>
              <button
                type="button"
                onClick={() => setDateRange('custom')}
                className={`py-2 px-3 rounded-lg font-bold text-xs transition border ${
                  dateRange === 'custom'
                    ? isCustomer ? 'bg-emerald-600 text-white border-emerald-500 shadow' : 'bg-indigo-600 text-white border-indigo-500 shadow'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {/* Custom Date Inputs */}
          {dateRange === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                />
              </div>
            </div>
          )}

          {/* Count Preview Banner */}
          <div className="p-3.5 bg-slate-850 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className={`w-4 h-4 ${isCustomer ? 'text-emerald-400' : 'text-indigo-400'}`} />
              <span className="text-slate-300">
                Matching {recordLabel}:
              </span>
            </div>
            <div className="font-mono font-black text-sm text-slate-100">
              {isLoadingCount ? (
                <span className="flex items-center gap-1 text-slate-400 text-xs font-normal">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Calculating...
                </span>
              ) : (
                <span className="text-emerald-400 font-bold">{recordCount ?? 0} Vouchers</span>
              )}
            </div>
          </div>

          {/* Opt-in Cloud Upload Section */}
          {isStorageConfigured ? (
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={uploadToCloud}
                  onChange={(e) => setUploadToCloud(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                />
                <div className="flex items-center gap-1.5 text-xs text-slate-200 group-hover:text-white font-semibold">
                  <Cloud className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Upload to Cloud & Generate Shareable Link</span>
                </div>
              </label>
              <p className="text-[11px] text-slate-400 pl-6">
                Uploads the multi-page consolidated PDF to private Supabase Storage and generates a secure signed URL for easy client/vendor sharing.
              </p>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-[11px] text-slate-500 flex items-center gap-2">
              <Cloud className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>Enable Cloud Storage in Settings to generate cloud share links.</span>
            </div>
          )}

          {/* Cloud Link Confirmation Box (shown once generated) */}
          {cloudResult && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/80 space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Cloud Share Link Ready</span>
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
                    showToast('Cloud share link copied to clipboard!', 'success');
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition flex items-center gap-1 text-[11px]"
                  title="Copy link"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Quick WhatsApp / External Share buttons */}
              <div className="flex gap-2 pt-1">
                {party.phone && (
                  <button
                    type="button"
                    onClick={() => {
                      const phone = (party.phone || '').replace(/[^0-9]/g, '');
                      const msg = `Dear ${party.name}, please find your consolidated ${recordLabel} report (${dateRange}) here:\n\n📄 Download PDF: ${cloudResult.signedUrl}`;
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

          {/* Large Range Warning Safeguard */}
          {isLargeSet && (
            <div className="p-3 bg-amber-950/80 border border-amber-500/50 rounded-xl flex items-start gap-2.5 text-amber-200 text-xs shadow-lg">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Large Record Set Warning ({recordCount} items):</span>
                <p className="mt-0.5 text-amber-300/90 text-[11px]">
                  Consolidated PDF rendering for over 200 vouchers in a single document may take ~15-30 seconds. Puppeteer will stitch all invoices page-by-page.
                </p>
              </div>
            </div>
          )}

          {/* Format Note */}
          <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            ℹ️ <b>Format:</b> High-resolution A4 multi-page document rendered with company branding, tax breakdowns, and automated page breaks between each voucher.
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleOpenBulkPreview}
            disabled={isLoadingCount || recordCount === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition disabled:opacity-40"
            title="Open printable consolidated multi-page document in a new tab"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Open Print View (New Tab)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition"
            >
              {cloudResult ? 'Close' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleDownloadBulkPdf}
              disabled={isGeneratingPdf || isLoadingCount || recordCount === 0}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-white text-xs font-bold shadow-lg transition active:scale-95 disabled:opacity-50 ${
              isCustomer
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950'
            }`}
          >
            {isGeneratingPdf ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{uploadToCloud ? 'Rendering & Uploading...' : 'Rendering Consolidated PDF...'}</span>
              </>
            ) : (
              <>
                {uploadToCloud ? <Cloud className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                <span>{uploadToCloud ? 'Generate, Upload & Save Bulk PDF' : 'Generate & Download Bulk PDF'}</span>
              </>
            )}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
};

