import React from 'react';
import {
  Printer,
  FileText,
  Download,
  X,
  CheckCircle2,
} from 'lucide-react';
import { PurchaseBill, Company } from '../types';
import { useAppStore } from '../store/useAppStore';

interface PrintPurchaseModalProps {
  purchase: PurchaseBill;
  isOpen: boolean;
  onClose: () => void;
  onNewBill?: () => void;
}

export const PrintPurchaseModal: React.FC<PrintPurchaseModalProps> = ({
  purchase,
  isOpen,
  onClose,
  onNewBill,
}) => {
  const { activeCompany, showToast } = useAppStore();

  const [isExportingPdf, setIsExportingPdf] = React.useState<boolean>(false);
  const [isPrinting, setIsPrinting] = React.useState<boolean>(false);
  const [printers, setPrinters] = React.useState<any[]>([]);
  const [selectedPrinter, setSelectedPrinter] = React.useState<string>('');

  React.useEffect(() => {
    if (window.electronAPI?.getPrinters) {
      window.electronAPI
        .getPrinters()
        .then((list: any[]) => {
          if (Array.isArray(list) && list.length > 0) {
            setPrinters(list);
            const defaultP = list.find((p) => p.isDefault);
            if (defaultP) setSelectedPrinter(defaultP.name);
          }
        })
        .catch((err: any) => console.warn('Could not list printers:', err));
    }
  }, []);

  if (!isOpen) return null;

  const previewUrl = `http://127.0.0.1:4545/api/purchases/${purchase._id}/preview-html?t=${Date.now()}`;

  // Fetch rendered HTML content for PDF export or direct print
  const fetchCurrentHtml = async (): Promise<string> => {
    try {
      const response = await fetch(previewUrl);
      return await response.text();
    } catch (e) {
      console.error('Error fetching purchase preview HTML:', e);
      return '';
    }
  };

  // Direct System Print via Native Electron IPC or same-origin in-memory frame (Eliminates iframe cross-origin errors)
  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const htmlContent = await fetchCurrentHtml();
      if (!htmlContent) {
        showToast('Could not load purchase bill content for printing.', 'error');
        return;
      }

      if (window.electronAPI?.printHtml) {
        const res = await window.electronAPI.printHtml(htmlContent, selectedPrinter || undefined);
        if (res?.success) {
          showToast('Purchase bill sent to printer successfully!', 'success');
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
      const safeNumber = purchase.billNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
      const defaultName = `PurchaseBill_${safeNumber}.pdf`;

      if (window.electronAPI?.exportPdf) {
        const res = await window.electronAPI.exportPdf(htmlContent, defaultName);
        if (res?.success) {
          showToast(`PDF saved successfully to: ${res.filePath}`, 'success');
          if (res.filePath && window.electronAPI?.showItemInFolder) {
            window.electronAPI.showItemInFolder(res.filePath);
          }
        } else if (res?.canceled) {
          // User clicked cancel
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

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[92vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Top Navigation Bar */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">
                  Purchase Record & Inward Tax Invoice — #{purchase.billNumber}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700 font-mono font-bold">
                  ₹{purchase.grandTotal.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Supplier: <span className="text-slate-200 font-semibold">{purchase.supplierName}</span> | Supplier Inv: <span className="font-mono text-slate-300">{purchase.supplierInvoiceNumber}</span>
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            {printers.length > 0 && (
              <select
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                className="bg-slate-800 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Default Printer</option>
                {printers.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg transition active:scale-95"
            >
              <Printer className={`w-4 h-4 ${isPrinting ? 'animate-spin' : ''}`} />
              <span>{isPrinting ? 'Printing...' : 'Print Record'}</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition active:scale-95"
            >
              <Download className={`w-4 h-4 ${isExportingPdf ? 'animate-spin' : ''}`} />
              <span>{isExportingPdf ? 'Exporting...' : 'Save PDF'}</span>
            </button>

            {onNewBill && (
              <button
                onClick={() => {
                  onClose();
                  onNewBill();
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                + New Purchase
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

        {/* Live Preview Iframe */}
        <div className="flex-1 bg-slate-950 p-4 flex justify-center items-center overflow-hidden">
          <div className="w-full h-full bg-white rounded-lg shadow-2xl overflow-hidden">
            <iframe
              src={previewUrl}
              title="Purchase Bill Preview"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
