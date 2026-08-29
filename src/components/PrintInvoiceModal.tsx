import React from 'react';
import {
  Printer,
  FileText,
  Receipt,
  Download,
  Share2,
  Mail,
  MessageSquare,
  X,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Check,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Cloud,
  Link,
  UploadCloud,
} from 'lucide-react';
import { Invoice, Company } from '../types';
import { api } from '../services/api';
import { useAppStore } from '../store/useAppStore';

interface PrintInvoiceModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onNewBill?: () => void;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onNewBill,
}) => {
  const { activeCompany, settings, showToast } = useAppStore();
  const isStorageConfigured = Boolean(settings?.storage?.enabled);

  const [currentInvoice, setCurrentInvoice] = React.useState<Invoice>(invoice);

  const [selectedTemplate, setSelectedTemplate] = React.useState<'A4' | 'A5' | 'POS-80' | 'POS-58'>(
    (invoice.templateUsed as any) || activeCompany?.defaultTemplate || 'A4'
  );
  const [copyTitle, setCopyTitle] = React.useState<string>('Original for Recipient');
  const [zoomLevel, setZoomLevel] = React.useState<number>(100);
  const [isExportingPdf, setIsExportingPdf] = React.useState<boolean>(false);
  const [isPrinting, setIsPrinting] = React.useState<boolean>(false);
  const [printers, setPrinters] = React.useState<any[]>([]);
  const [selectedPrinter, setSelectedPrinter] = React.useState<string>('');

  // Delivery states
  const [emailSending, setEmailSending] = React.useState<boolean>(false);
  const [whatsappSending, setWhatsappSending] = React.useState<boolean>(false);
  const [uploadingCloud, setUploadingCloud] = React.useState<boolean>(false);
  const [copiedGreeting, setCopiedGreeting] = React.useState<boolean>(false);
  const [copiedLink, setCopiedLink] = React.useState<boolean>(false);

  React.useEffect(() => {
    setCurrentInvoice(invoice);
  }, [invoice]);

  const previewIframeRef = React.useRef<HTMLIFrameElement>(null);

  React.useEffect(() => {
    if (window.electronAPI?.getPrinters) {
      window.electronAPI.getPrinters().then((list: any[]) => {
        if (Array.isArray(list) && list.length > 0) {
          setPrinters(list);
          const defaultP = list.find((p) => p.isDefault);
          if (defaultP) setSelectedPrinter(defaultP.name);
        }
      }).catch((err: any) => console.warn('Could not list printers:', err));
    }
  }, []);

  if (!isOpen) return null;

  const previewUrl = api.getInvoicePreviewHtmlUrl(invoice._id, selectedTemplate, copyTitle);

  // Fetch rendered HTML content for PDF export or direct print
  const fetchCurrentHtml = async (): Promise<string> => {
    try {
      const html = await api.getPreviewHtmlContent(previewUrl);
      return html;
    } catch (e) {
      console.error('Error fetching preview HTML:', e);
      return '';
    }
  };

  // Direct System Print via Native Electron IPC or same-origin in-memory frame (Eliminates iframe cross-origin errors)
  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const htmlContent = await fetchCurrentHtml();
      if (!htmlContent) {
        showToast('Could not load invoice content for printing.', 'error');
        return;
      }

      if (window.electronAPI?.printHtml) {
        const res = await window.electronAPI.printHtml(htmlContent, selectedPrinter || undefined);
        if (res?.success) {
          showToast('Print command sent successfully to printer!', 'success');
          return;
        } else if (res?.failureReason) {
          showToast(`Printer notice: ${res.failureReason}`, 'info');
        }
      }

      // Universal Same-Origin In-Memory Iframe Print
      const hiddenIframe = document.createElement('iframe');
      hiddenIframe.style.position = 'fixed';
      hiddenIframe.style.right = '0';
      hiddenIframe.style.bottom = '0';
      hiddenIframe.style.width = '0';
      hiddenIframe.style.height = '0';
      hiddenIframe.style.border = '0';
      hiddenIframe.style.opacity = '0';
      document.body.appendChild(hiddenIframe);

      const frameDoc = hiddenIframe.contentWindow?.document || hiddenIframe.contentDocument;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(htmlContent);
        frameDoc.close();

        setTimeout(() => {
          try {
            hiddenIframe.contentWindow?.focus();
            hiddenIframe.contentWindow?.print();
            setTimeout(() => {
              try {
                document.body.removeChild(hiddenIframe);
              } catch {}
            }, 3000);
          } catch (e) {
            console.error('Frame print error:', e);
          }
        }, 400);
      }
    } catch (err: any) {
      showToast('Error during print: ' + err.message, 'error');
    } finally {
      setIsPrinting(false);
    }
  };

  // Export as PDF
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const htmlContent = await fetchCurrentHtml();
      const safeNumber = invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
      const defaultName = `Invoice_${safeNumber}_${selectedTemplate}.pdf`;

      if (window.electronAPI?.exportPdf) {
        const res = await window.electronAPI.exportPdf(htmlContent, defaultName);
        if (res?.success) {
          showToast(`PDF saved successfully to: ${res.filePath}`, 'success');
          if (res.filePath && window.electronAPI?.showItemInFolder) {
            window.electronAPI.showItemInFolder(res.filePath);
          }
        } else if (res?.canceled) {
          // User clicked cancel in save dialog
        } else {
          showToast(`PDF Export notice: ${res?.error || 'Could not complete export'}`, 'error');
        }
      } else {
        // Universal Same-Origin Iframe fallback for browser PDF export
        const hiddenIframe = document.createElement('iframe');
        hiddenIframe.style.position = 'fixed';
        hiddenIframe.style.right = '0';
        hiddenIframe.style.bottom = '0';
        hiddenIframe.style.width = '0';
        hiddenIframe.style.height = '0';
        hiddenIframe.style.border = '0';
        hiddenIframe.style.opacity = '0';
        document.body.appendChild(hiddenIframe);

        const frameDoc = hiddenIframe.contentWindow?.document || hiddenIframe.contentDocument;
        if (frameDoc) {
          frameDoc.open();
          frameDoc.write(htmlContent);
          frameDoc.close();

          setTimeout(() => {
            try {
              hiddenIframe.contentWindow?.focus();
              hiddenIframe.contentWindow?.print();
              setTimeout(() => {
                try {
                  document.body.removeChild(hiddenIframe);
                } catch {}
              }, 3000);
            } catch (e) {
              console.error('Frame PDF export error:', e);
            }
          }, 400);
        }
      }
    } catch (err: any) {
      showToast('Error exporting PDF: ' + err.message, 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Manual / Retry Cloud Storage Upload
  const handleUploadToCloud = async () => {
    setUploadingCloud(true);
    try {
      const res = await api.uploadInvoiceToCloud(currentInvoice._id);
      if (res.success && res.data?.signedUrl) {
        setCurrentInvoice((prev) => ({
          ...prev,
          signedUrl: res.data.signedUrl,
          signedUrlExpiresAt: res.data.expiresAt,
          cloudUploadStatus: 'uploaded',
        }));
        showToast('Invoice uploaded to Supabase Storage! Share link ready.', 'success');
      } else {
        showToast(res.error || 'Could not upload to cloud storage', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Error uploading to cloud storage', 'error');
    } finally {
      setUploadingCloud(false);
    }
  };

  // WhatsApp Dispatch
  const handleWhatsApp = async () => {
    setWhatsappSending(true);
    try {
      const res = await api.sendWhatsApp(currentInvoice._id);
      if (res.success) {
        if (res.signedUrl && !currentInvoice.signedUrl) {
          setCurrentInvoice((prev) => ({ ...prev, signedUrl: res.signedUrl }));
        }
        if (res.mode === 'fallback' && res.waLink) {
          window.open(res.waLink, '_blank');
          showToast('Opened WhatsApp with live invoice download link!', 'success');
        } else {
          showToast('WhatsApp invoice message sent successfully via Cloud API!', 'success');
        }
      } else {
        showToast(res.error || 'WhatsApp delivery notice', 'info');
      }
    } catch (err: any) {
      // Direct wa.me fallback
      const phone = (currentInvoice.customerPhone || '').replace(/[^0-9]/g, '');
      const linkToInclude = currentInvoice.signedUrl || previewUrl;
      const greeting = `Dear ${currentInvoice.customerName}, thank you for shopping with ${
        activeCompany?.tradeName || activeCompany?.legalName
      }! Your invoice #${currentInvoice.invoiceNumber} Total: ₹${currentInvoice.grandTotal.toFixed(
        2
      )} is ready.\n\n📄 Download Invoice PDF: ${linkToInclude}`;
      const waLink = `https://wa.me/${phone ? (phone.startsWith('91') ? phone : '91' + phone) : ''}?text=${encodeURIComponent(greeting)}`;
      window.open(waLink, '_blank');
    } finally {
      setWhatsappSending(false);
    }
  };

  // Email Dispatch
  const handleEmail = async () => {
    if (!currentInvoice.customerEmail) {
      showToast('No customer email associated with this invoice', 'error');
      return;
    }
    setEmailSending(true);
    try {
      const res = await api.sendEmail(currentInvoice._id);
      if (res.success) {
        if (res.signedUrl && !currentInvoice.signedUrl) {
          setCurrentInvoice((prev) => ({ ...prev, signedUrl: res.signedUrl }));
        }
        showToast(`Invoice emailed to ${currentInvoice.customerEmail}`, 'success');
      } else {
        showToast(res.error || 'Could not send email. Check SMTP settings in Settings.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message || 'Error sending email', 'error');
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl h-[92vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Top Navigation Bar */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">
                  Print & Export Hub — #{invoice.invoiceNumber}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
                  ₹{invoice.grandTotal.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Customer: <span className="text-slate-200 font-semibold">{invoice.customerName}</span> | Date: {new Date(invoice.date).toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/60 transition active:scale-95"
            >
              <Printer className={`w-4 h-4 ${isPrinting ? 'animate-spin' : ''}`} />
              <span>{isPrinting ? 'Printing...' : 'Print Bill (Ctrl+P)'}</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-950/60 transition active:scale-95"
            >
              <Download className={`w-4 h-4 ${isExportingPdf ? 'animate-spin' : ''}`} />
              <span>{isExportingPdf ? 'Exporting...' : 'Save as PDF'}</span>
            </button>

            {onNewBill && (
              <button
                onClick={() => {
                  onClose();
                  onNewBill();
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                + New Bill
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content Area: Side-by-Side Split View */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Control Panel (4 Cols) */}
          <div className="lg:col-span-4 bg-slate-900/90 border-r border-slate-800 p-5 overflow-y-auto space-y-5">
            {/* 1. Template Chooser */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Choose Bill Layout Format</span>
                </span>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Real-Time</span>
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'A4',
                    title: 'A4 Tax Invoice',
                    desc: 'Standard Full Page GST Bill',
                    badge: 'Full Page',
                    icon: FileText,
                  },
                  {
                    id: 'A5',
                    title: 'A5 Compact',
                    desc: 'Half-Page Landscape',
                    badge: 'Half Sheet',
                    icon: FileText,
                  },
                  {
                    id: 'POS-80',
                    title: 'POS 80mm (3-Inch)',
                    desc: 'Standard Thermal Roll',
                    badge: 'Thermal Roll',
                    icon: Receipt,
                  },
                  {
                    id: 'POS-58',
                    title: 'POS 58mm (2-Inch)',
                    desc: 'Mini Thermal Receipt',
                    badge: 'Mini Thermal',
                    icon: Receipt,
                  },
                ].map((tmpl) => {
                  const Icon = tmpl.icon;
                  const isSelected = selectedTemplate === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => setSelectedTemplate(tmpl.id as any)}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-md shadow-emerald-950/50'
                          : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                            isSelected
                              ? 'bg-emerald-900/90 text-emerald-300'
                              : 'bg-slate-900 text-slate-500'
                          }`}
                        >
                          {tmpl.badge}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">{tmpl.title}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{tmpl.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Printer Device Selector (Desktop Electron Native) */}
            {printers.length > 0 && (
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Target Printer</span>
                  </span>
                  <span className="text-[9px] text-emerald-400 font-mono">
                    {printers.length} Available
                  </span>
                </label>
                <select
                  value={selectedPrinter}
                  onChange={(e) => setSelectedPrinter(e.target.value)}
                  className="w-full bg-slate-900 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-750 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Default System Printer</option>
                  {printers.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} {p.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 2. Copy Heading Selector (Original, Duplicate, etc.) */}
            {selectedTemplate.startsWith('A') && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Invoice Copy Title</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    'Original for Recipient',
                    'Duplicate for Transporter',
                    'Triplicate for Supplier',
                  ].map((title) => (
                    <button
                      key={title}
                      onClick={() => setCopyTitle(title)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold border transition text-center ${
                        copyTitle === title
                          ? 'bg-emerald-950 border-emerald-600 text-emerald-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {title.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Dispatch & Digital Share */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Instant Digital Dispatch</span>
              </label>

              {/* Cloud Storage Share Link Card */}
              {isStorageConfigured ? (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Cloud Storage Link</span>
                    </span>
                    {currentInvoice.signedUrl ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Ready</span>
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 font-semibold">
                        {currentInvoice.cloudUploadStatus === 'failed' ? 'Upload Failed' : 'Not Uploaded'}
                      </span>
                    )}
                  </div>

                  {currentInvoice.signedUrl ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 font-mono">
                        <Link className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="truncate flex-1">{currentInvoice.signedUrl}</span>
                        <button
                          onClick={() => {
                            if (currentInvoice.signedUrl) {
                              navigator.clipboard.writeText(currentInvoice.signedUrl);
                              setCopiedLink(true);
                              showToast('Signed download link copied to clipboard!', 'success');
                              setTimeout(() => setCopiedLink(false), 2000);
                            }
                          }}
                          className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition"
                          title="Copy signed link"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-between">
                        <span>Secure 30-day signed download URL</span>
                        <button
                          onClick={handleUploadToCloud}
                          disabled={uploadingCloud}
                          className="text-indigo-400 hover:text-indigo-300 underline text-[10px]"
                        >
                          {uploadingCloud ? 'Refreshing...' : 'Regenerate'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleUploadToCloud}
                      disabled={uploadingCloud}
                      className="w-full py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <UploadCloud className={`w-3.5 h-3.5 ${uploadingCloud ? 'animate-spin' : ''}`} />
                      <span>{uploadingCloud ? 'Uploading to Supabase...' : 'Upload PDF & Generate Link'}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-500 flex items-center gap-2">
                  <Cloud className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span>Enable Cloud Storage in Settings & DB to generate shareable links.</span>
                </div>
              )}


              {/* WhatsApp Option */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp Invoice</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {currentInvoice.customerPhone || 'No Phone'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleWhatsApp}
                    disabled={whatsappSending || !currentInvoice.customerPhone}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{whatsappSending ? 'Sending...' : 'Send on WhatsApp'}</span>
                  </button>

                  <button
                    onClick={() => {
                      const linkToInclude = currentInvoice.signedUrl || previewUrl;
                      const greeting = `Dear ${currentInvoice.customerName}, thank you for shopping with ${
                        activeCompany?.tradeName || activeCompany?.legalName
                      }! Invoice #${currentInvoice.invoiceNumber} Total: ₹${currentInvoice.grandTotal.toFixed(
                        2
                      )}.\n\nView/Download Invoice: ${linkToInclude}`;
                      navigator.clipboard.writeText(greeting);
                      setCopiedGreeting(true);
                      showToast('Greeting message & link copied!', 'success');
                      setTimeout(() => setCopiedGreeting(false), 2000);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
                    title="Copy greeting with link"
                  >
                    {copiedGreeting ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Email Option */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-sky-400" />
                    <span>Email Invoice (SMTP)</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
                    {currentInvoice.customerEmail || 'No Email'}
                  </span>
                </div>
                <button
                  onClick={handleEmail}
                  disabled={emailSending || !currentInvoice.customerEmail}
                  className="w-full py-1.5 rounded-lg bg-sky-600/90 hover:bg-sky-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{emailSending ? 'Sending...' : 'Email Invoice PDF'}</span>
                </button>
              </div>
            </div>

            {/* Browser Preview Button */}
            <button
              onClick={() => window.open(previewUrl, '_blank')}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Full Browser Tab</span>
            </button>
          </div>

          {/* Right Live Preview Canvas (8 Cols) */}
          <div className="lg:col-span-8 bg-slate-950 p-4 flex flex-col overflow-hidden relative">
            {/* Preview Toolbar */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200">Interactive Document Canvas:</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 text-emerald-400 border border-slate-800 font-mono">
                  {selectedTemplate === 'A4'
                    ? 'A4 Sheet (210 × 297 mm)'
                    : selectedTemplate === 'A5'
                    ? 'A5 Sheet (210 × 148 mm)'
                    : selectedTemplate === 'POS-80'
                    ? 'Thermal Roll (80mm / 3.15")'
                    : 'Thermal Roll (58mm / 2.28")'}
                </span>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setZoomLevel(Math.max(50, zoomLevel - 15))}
                  className="p-1 rounded text-slate-400 hover:text-white transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono w-10 text-center text-slate-300 font-semibold">
                  {zoomLevel}%
                </span>
                <button
                  onClick={() => setZoomLevel(Math.min(150, zoomLevel + 15))}
                  className="p-1 rounded text-slate-400 hover:text-white transition"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(100)}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white font-semibold transition ml-1"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Preview Document Viewport */}
            <div className="flex-1 overflow-auto flex items-start justify-center p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <div
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out',
                }}
                className={`bg-white rounded-lg shadow-2xl transition-all ${
                  selectedTemplate === 'A4'
                    ? 'w-[794px] min-h-[1050px]'
                    : selectedTemplate === 'A5'
                    ? 'w-[750px] min-h-[520px]'
                    : selectedTemplate === 'POS-80'
                    ? 'w-[360px] min-h-[500px]'
                    : 'w-[280px] min-h-[450px]'
                }`}
              >
                <iframe
                  ref={previewIframeRef}
                  key={previewUrl}
                  src={previewUrl}
                  className="w-full h-full min-h-[900px] border-0 rounded-lg bg-white"
                  title="Live Invoice Bill Preview"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
