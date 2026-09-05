import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import puppeteer from 'puppeteer-core';
import { IInvoice } from '../models/Invoice';
import { IPurchaseBill } from '../models/PurchaseBill';
import { ICompany } from '../models/Company';
import { numberToWordsIndian } from '../utils/numberToWords';
import { getLogosDir } from '../config/paths';

export class PDFGenerator {
  /**
   * Convert Company Logo to Base64 Data URL for universal offline and cross-origin rendering
   */
  public static getLogoDataUrl(company?: ICompany | null): string {
    try {
      const candidates: string[] = [];

      if (company?.logoPath) {
        candidates.push(company.logoPath);
        const basename = path.basename(company.logoPath);
        candidates.push(path.join(getLogosDir(), basename));
        candidates.push(path.join(process.cwd(), 'uploads', 'logos', basename));
      }

      // Check if any logo file exists in the uploads directory
      try {
        const logosDir = getLogosDir();
        if (fs.existsSync(logosDir)) {
          const files = fs.readdirSync(logosDir).filter((f) => !f.startsWith('.'));
          if (files.length > 0) {
            candidates.push(path.join(logosDir, files[files.length - 1]));
          }
        }
      } catch {}

      // Fallback to workspace/app logo files if present
      candidates.push(path.join(process.cwd(), 'logo.png'));
      candidates.push(path.join(process.cwd(), 'logo.ico'));
      if ((process as any).resourcesPath) {
        candidates.push(path.join((process as any).resourcesPath, 'logo.png'));
        candidates.push(path.join((process as any).resourcesPath, 'logo.ico'));
      }
      candidates.push(path.join(__dirname, '../..', 'logo.png'));
      candidates.push(path.join(__dirname, '../..', 'logo.ico'));

      for (const p of candidates) {
        if (p && fs.existsSync(p)) {
          const stat = fs.statSync(p);
          if (stat.isFile() && stat.size > 0) {
            const ext = path.extname(p).toLowerCase().replace('.', '') || 'png';
            let mime = 'image/png';
            if (ext === 'svg') mime = 'image/svg+xml';
            else if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
            else if (ext === 'webp') mime = 'image/webp';
            else if (ext === 'ico') mime = 'image/x-icon';

            const b64 = fs.readFileSync(p).toString('base64');
            if (b64) {
              return `data:${mime};base64,${b64}`;
            }
          }
        }
      }
    } catch (err) {
      console.warn('[PDFGenerator] Error reading logo file for base64 embed:', err);
    }
    return '';
  }

  /**
   * Generate UPI Payment QR Code Data URL
   */
  public static async generateUPIQR(
    upiId: string,
    payeeName: string,
    amount: number,
    invoiceNo: string
  ): Promise<string> {
    if (!upiId) return '';
    try {
      const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
        payeeName
      )}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Inv ' + invoiceNo)}`;
      return await QRCode.toDataURL(upiUrl, { width: 130, margin: 1 });
    } catch {
      return '';
    }
  }

  /**
   * Render HTML for A4 Tax Invoice (Full Page Detailed GST Layout with Pinned Full Height & Large Header)
   */
  public static async renderA4Html(
    invoice: IInvoice,
    company: ICompany,
    copyTitle: string = 'Original for Recipient'
  ): Promise<string> {
    const qrDataUrl = await this.generateUPIQR(
      company.bankDetails?.upiId || '',
      company.tradeName || company.legalName,
      invoice.grandTotal,
      invoice.invoiceNumber
    );

    const logoDataUrl = this.getLogoDataUrl(company);
    const logoHtml = logoDataUrl
      ? `<div class="shrink-0 flex items-center justify-center p-1.5 bg-white rounded-xl border border-emerald-200 shadow-sm max-w-[150px]">
           <img src="${logoDataUrl}" alt="Logo" class="max-h-32 max-w-[140px] h-28 object-contain rounded-lg" />
         </div>`
      : '';

    const isInterState = invoice.isInterState;

    const itemsRows = (invoice.items || [])
      .map(
        (it: any, idx) => {
          const itemName = it.name || (it.item && typeof it.item === 'object' ? it.item.name : '') || 'Item';
          const itemHsn = it.hsnCode || (it.item && typeof it.item === 'object' ? it.item.hsnCode : '') || '—';
          const itemRate = Number(it.rate ?? it.unitPrice ?? 0);
          const itemTaxable = Number(it.taxableValue ?? it.taxableAmount ?? (itemRate * (it.quantity || 1)));
          const itemTotal = Number(it.total ?? (itemTaxable + (it.cgstAmount || 0) + (it.sgstAmount || 0) + (it.igstAmount || 0)));
          const itemUqc = it.uqc || (it.item && typeof it.item === 'object' ? it.item.uqc : '') || 'PCS';
          return `
        <tr class="border-b border-gray-300 ${idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'} text-[11px] leading-tight avoid-break">
          <td class="p-2.5 text-center text-gray-700 font-semibold border-r border-gray-200">${idx + 1}</td>
          <td class="p-2.5 font-bold text-gray-900 border-r border-gray-200">
            <div>${itemName}</div>
          </td>
          <td class="p-2.5 text-center text-gray-700 font-mono border-r border-gray-200">${itemHsn}</td>
          <td class="p-2.5 text-right text-gray-800 font-semibold border-r border-gray-200">${it.quantity || 1} ${itemUqc}</td>
          <td class="p-2.5 text-right text-gray-800 font-mono border-r border-gray-200">₹${itemRate.toFixed(2)}</td>
          <td class="p-2.5 text-right text-gray-600 font-mono border-r border-gray-200">${it.discountPercent ? it.discountPercent + '%' : '0%'}</td>
          <td class="p-2.5 text-right font-bold text-gray-900 font-mono border-r border-gray-200">₹${itemTaxable.toFixed(2)}</td>
          ${
            isInterState
              ? `<td class="p-2.5 text-right text-gray-800 font-mono border-r border-gray-200">${it.gstRate || 0}% (₹${Number(it.igstAmount || 0).toFixed(2)})</td>`
              : `<td class="p-2.5 text-right text-gray-800 font-mono border-r border-gray-200">${Number(it.gstRate || 0) / 2}% (₹${Number(it.cgstAmount || 0).toFixed(2)})</td>
                 <td class="p-2.5 text-right text-gray-800 font-mono border-r border-gray-200">${Number(it.gstRate || 0) / 2}% (₹${Number(it.sgstAmount || 0).toFixed(2)})</td>`
          }
          <td class="p-2.5 text-right font-extrabold text-gray-900 font-mono">₹${itemTotal.toFixed(2)}</td>
        </tr>
      `;
        }
      )
      .join('');

    const taxSummaryRows = (invoice.taxSummary || [])
      .map(
        (ts) => `
        <tr class="border-b border-gray-200 text-[10px] font-mono">
          <td class="p-1.5 font-bold text-gray-800">${ts.gstRate}%</td>
          <td class="p-1.5 text-right">₹${ts.taxableValue.toFixed(2)}</td>
          ${
            isInterState
              ? `<td class="p-1.5 text-right text-emerald-800">₹${ts.igst.toFixed(2)}</td>`
              : `<td class="p-1.5 text-right">₹${ts.cgst.toFixed(2)}</td><td class="p-1.5 text-right">₹${ts.sgst.toFixed(2)}</td>`
          }
          <td class="p-1.5 text-right font-bold text-gray-900">₹${ts.totalTax.toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    const formattedInvoiceDate = new Date(invoice.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tax Invoice - ${invoice.invoiceNumber}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { 
      size: A4 portrait; 
      margin: 8mm; 
    }
    * {
      box-sizing: border-box;
    }
    html, body { 
      margin: 0;
      padding: 0;
      width: 100%;
      background: #fff;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif; 
      color: #111827; 
      font-size: 11px;
      line-height: 1.35;
    }
    .invoice-card {
      width: 100%;
      min-height: calc(297mm - 16mm);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      background: #fff;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    @media screen {
      body {
        background: #f1f5f9;
      }
      .invoice-card {
        max-width: 210mm;
        margin: 20px auto 40px auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        border: 2px solid #064e3b;
        border-radius: 8px;
        overflow: hidden;
      }
    }

    @media print {
      body { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
        background: #fff !important; 
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print, #preview-action-toolbar { 
        display: none !important; 
      }
      .invoice-card {
        width: 100% !important;
        min-height: calc(297mm - 16mm) !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        box-shadow: none !important;
        border: 2px solid #064e3b !important;
        border-radius: 0 !important;
        margin: 0 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .avoid-break {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body class="p-0 bg-white text-gray-900 w-full">
  <div class="invoice-card w-full border-2 border-emerald-900 rounded-xl overflow-hidden bg-white shadow-none">


    
    <!-- Top & Middle Content Container -->
    <div class="flex-1 flex flex-col">
      <!-- 1. Enlarged Business Header Section -->
      <div class="p-4 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40 border-b-2 border-emerald-900 flex justify-between items-center gap-4">
        <div class="flex items-center gap-4 flex-1 min-w-0">
          ${logoHtml}
          <div class="min-w-0 flex-1">
            <h1 class="text-xl md:text-[22px] font-black text-emerald-950 uppercase tracking-tight leading-tight break-words">
              ${company.tradeName || company.legalName}
            </h1>
            ${
              company.tradeName && company.legalName !== company.tradeName
                ? `<div class="text-xs text-gray-700 font-bold tracking-tight">(${company.legalName})</div>`
                : ''
            }
            <p class="text-xs text-gray-800 mt-1 font-medium leading-snug">
              ${company.address?.line1 || ''}${company.address?.line2 ? ', ' + company.address.line2 : ''}, ${company.address?.city || ''}, ${company.address?.state || ''} ${company.address?.pincode ? '- <b>' + company.address.pincode + '</b>' : ''}
            </p>
            <div class="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-900">
              <span><b>GSTIN:</b> <span class="font-mono text-emerald-950 font-black text-sm">${company.gstin || 'UNREGISTERED'}</span></span>
              <span><b>PAN:</b> <span class="font-mono font-bold text-gray-800">${company.pan || 'N/A'}</span></span>
              <span><b>State Code:</b> <span class="font-mono font-bold text-gray-800">${company.address?.stateCode || ''}</span></span>
            </div>
            <div class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-700">
              ${company.contact?.phone ? `<span>📞 <b>Phone:</b> ${company.contact.phone}</span>` : ''}
              ${company.contact?.email ? `<span>✉️ <b>Email:</b> ${company.contact.email}</span>` : ''}
              ${company.contact?.website ? `<span>🌐 <b>Web:</b> ${company.contact.website}</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Right Side: Invoice Meta Box -->
        <div class="text-right shrink-0 w-[210px]">
          <div class="inline-block bg-emerald-950 text-white font-black px-4 py-1.5 text-xs rounded uppercase tracking-wider shadow-sm">
            TAX INVOICE
          </div>
          <div class="text-[10px] font-bold text-emerald-800 uppercase tracking-wide mt-1">
            ${copyTitle || 'Original for Recipient'}
          </div>
          
          <div class="mt-2 bg-white p-2.5 rounded-lg border border-emerald-300 text-xs text-left shadow-sm space-y-1">
            <div><span class="text-gray-500 font-semibold">Invoice No:</span> <b class="text-emerald-950 font-mono text-sm font-black">${invoice.invoiceNumber}</b></div>
            <div><span class="text-gray-500 font-semibold">Invoice Date:</span> <b class="text-gray-900">${formattedInvoiceDate}</b></div>
            <div><span class="text-gray-500 font-semibold">Place of Supply:</span> <b class="text-gray-900">${invoice.placeOfSupply || 'Uttar Pradesh'}</b></div>
            <div><span class="text-gray-500 font-semibold">Reverse Charge:</span> <b class="text-gray-900">${invoice.reverseCharge ? 'Yes' : 'No'}</b></div>
          </div>
        </div>
      </div>

      <!-- 2. Buyer & Consignee Details (2 Columns) -->
      <div class="grid grid-cols-2 border-b border-emerald-900 text-xs">
        <div class="p-3.5 border-r border-emerald-900 bg-emerald-50/20">
          <div class="font-extrabold text-[11px] uppercase tracking-wider text-emerald-900 border-b border-emerald-200 pb-1 mb-1.5 flex items-center justify-between">
            <span>Details of Receiver / Billed To:</span>
          </div>
          <div class="font-bold text-sm text-gray-900">${invoice.customerName || 'Customer'}</div>
          <div class="text-gray-700 mt-0.5">${invoice.billingAddress?.line1 || ''}, ${invoice.billingAddress?.city || ''}, ${invoice.billingAddress?.state || ''} ${invoice.billingAddress?.pincode ? '- ' + invoice.billingAddress.pincode : ''}</div>
          <div class="mt-1.5 space-y-0.5">
            <div><span class="font-semibold text-gray-600">GSTIN / UIN:</span> <b class="font-mono text-emerald-900 font-bold">${invoice.customerGstin || 'URP (Unregistered)'}</b></div>
            <div><span class="font-semibold text-gray-600">State:</span> ${invoice.billingAddress?.state || 'Uttar Pradesh'} (Code: <b>${invoice.billingAddress?.stateCode || '09'}</b>)</div>
            ${invoice.customerPhone ? `<div><span class="font-semibold text-gray-600">Mobile:</span> ${invoice.customerPhone}</div>` : ''}
            ${invoice.customerEmail ? `<div><span class="font-semibold text-gray-600">Email:</span> ${invoice.customerEmail}</div>` : ''}
          </div>
        </div>

        <div class="p-3.5 bg-white">
          <div class="font-extrabold text-[11px] uppercase tracking-wider text-emerald-900 border-b border-emerald-200 pb-1 mb-1.5 flex items-center justify-between">
            <span>Details of Consignee / Shipped To:</span>
          </div>
          <div class="font-bold text-sm text-gray-900">${invoice.customerName || 'Customer'}</div>
          <div class="text-gray-700 mt-0.5">${invoice.shippingAddress?.line1 || invoice.billingAddress?.line1 || ''}, ${invoice.shippingAddress?.city || invoice.billingAddress?.city || ''}, ${invoice.shippingAddress?.state || invoice.billingAddress?.state || ''}</div>
          <div class="mt-1.5 space-y-0.5">
            <div><span class="font-semibold text-gray-600">State of Supply:</span> ${invoice.placeOfSupply || 'Uttar Pradesh'}</div>
            <div><span class="font-semibold text-gray-600">Payment Mode:</span> <b class="text-emerald-900 uppercase">${invoice.paymentMode || 'Cash'}</b></div>
            <div><span class="font-semibold text-gray-600">Payment Status:</span> <b class="${invoice.paymentStatus === 'Paid' ? 'text-emerald-700' : 'text-amber-700'}">${invoice.paymentStatus || 'Paid'}</b></div>
          </div>
        </div>
      </div>

      <!-- 3. Items Table -->
      <div class="flex-1 overflow-x-auto">
        <table class="w-full text-left border-collapse border-b border-emerald-900">
          <thead>
            <tr class="bg-emerald-900 text-white text-[10px] uppercase font-bold tracking-wider">
              <th class="p-2.5 text-center w-8 border-r border-emerald-800">#</th>
              <th class="p-2.5 border-r border-emerald-800">Item Description</th>
              <th class="p-2.5 text-center border-r border-emerald-800">HSN/SAC</th>
              <th class="p-2.5 text-right border-r border-emerald-800">Qty</th>
              <th class="p-2.5 text-right border-r border-emerald-800">Rate</th>
              <th class="p-2.5 text-right border-r border-emerald-800">Disc</th>
              <th class="p-2.5 text-right border-r border-emerald-800">Taxable</th>
              ${
                isInterState
                  ? `<th class="p-2.5 text-right border-r border-emerald-800">IGST</th>`
                  : `<th class="p-2.5 text-right border-r border-emerald-800">CGST</th><th class="p-2.5 text-right border-r border-emerald-800">SGST</th>`
              }
              <th class="p-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pinned Bottom Section (Summary, Bank, Terms & Signature) -->
    <div class="avoid-break bg-white">
      <!-- 4. Lower Summary Grid -->
      <div class="grid grid-cols-2 text-xs border-t border-emerald-900">
        <!-- Left: Tax Breakdown & Bank Details -->
        <div class="p-3.5 border-r border-emerald-900 space-y-3 bg-gray-50/40">
          <!-- GST Tax Breakdown -->
          <div>
            <div class="font-bold text-[10px] text-emerald-900 uppercase tracking-wider mb-1">GST Tax Breakdown Analysis</div>
            <table class="w-full text-left border border-gray-300 rounded overflow-hidden">
              <thead class="bg-emerald-800 text-white text-[9px] uppercase font-bold">
                <tr>
                  <th class="p-1.5">Rate</th>
                  <th class="p-1.5 text-right">Taxable Val</th>
                  ${isInterState ? `<th class="p-1.5 text-right">IGST</th>` : `<th class="p-1.5 text-right">CGST</th><th class="p-1.5 text-right">SGST</th>`}
                  <th class="p-1.5 text-right">Total Tax</th>
                </tr>
              </thead>
              <tbody class="bg-white">
                ${taxSummaryRows}
              </tbody>
            </table>
          </div>

          <!-- Amount In Words -->
          <div class="p-2.5 rounded bg-white border border-gray-300">
            <span class="text-[10px] text-gray-500 font-bold uppercase block">Amount Chargeable (in words):</span>
            <span class="font-bold text-gray-900 text-xs">${invoice.amountInWords || numberToWordsIndian(invoice.grandTotal)}</span>
          </div>

          <!-- Bank Details & QR -->
          <div class="flex items-center gap-3 p-3 rounded bg-emerald-50/70 border border-emerald-300">
            ${qrDataUrl ? `<img src="${qrDataUrl}" alt="UPI QR" class="w-20 h-20 object-contain border border-emerald-400 rounded bg-white p-0.5 shrink-0" />` : ''}
            <div class="text-[11px] text-gray-800 leading-tight space-y-0.5">
              <span class="font-bold text-emerald-900 uppercase text-[10px] block">Bank Account for Settlement:</span>
              <div><b>Bank:</b> ${company.bankDetails?.bankName || 'State Bank of India'}</div>
              <div><b>A/c No:</b> <span class="font-mono font-bold">${company.bankDetails?.accountNo || 'N/A'}</span></div>
              <div><b>IFSC:</b> <span class="font-mono font-bold">${company.bankDetails?.ifsc || 'N/A'}</span> | <b>Branch:</b> ${company.bankDetails?.branch || 'Main'}</div>
              ${company.bankDetails?.upiId ? `<div><b>UPI ID:</b> <span class="font-mono font-bold text-emerald-900">${company.bankDetails.upiId}</span></div>` : ''}
            </div>
          </div>
        </div>

        <!-- Right: Grand Totals, Terms & Signatory -->
        <div class="p-3.5 flex flex-col justify-between bg-white">
          <div class="space-y-1.5 text-xs">
            <div class="flex justify-between text-gray-700">
              <span>Total Taxable Value:</span>
              <span class="font-mono font-bold text-gray-900">₹${Number(invoice.totalTaxable ?? (invoice as any).taxableAmount ?? invoice.grandTotal ?? 0).toFixed(2)}</span>
            </div>
            ${
              isInterState
                ? `
                <div class="flex justify-between text-gray-700">
                  <span>IGST Total:</span>
                  <span class="font-mono font-bold text-gray-900">₹${Number(invoice.igstTotal ?? (invoice as any).totalIgst ?? 0).toFixed(2)}</span>
                </div>
              `
                : `
                <div class="flex justify-between text-gray-700">
                  <span>CGST Total:</span>
                  <span class="font-mono font-bold text-gray-900">₹${Number(invoice.cgstTotal ?? (invoice as any).totalCgst ?? 0).toFixed(2)}</span>
                </div>
                <div class="flex justify-between text-gray-700">
                  <span>SGST Total:</span>
                  <span class="font-mono font-bold text-gray-900">₹${Number(invoice.sgstTotal ?? (invoice as any).totalSgst ?? 0).toFixed(2)}</span>
                </div>
              `
            }
            ${
              Number(invoice.cessTotal || 0) > 0
                ? `
                <div class="flex justify-between text-gray-700">
                  <span>Cess Amount:</span>
                  <span class="font-mono font-bold text-gray-900">₹${Number(invoice.cessTotal || 0).toFixed(2)}</span>
                </div>
              `
                : ''
            }
            ${
              Number(invoice.roundOff || 0) !== 0
                ? `
                <div class="flex justify-between text-gray-600 border-t border-gray-200 pt-1">
                  <span>Round Off:</span>
                  <span class="font-mono font-semibold text-gray-800">₹${Number(invoice.roundOff || 0).toFixed(2)}</span>
                </div>
              `
                : ''
            }
            <div class="flex justify-between text-base font-extrabold text-emerald-950 bg-emerald-100/70 p-2.5 rounded border border-emerald-300 mt-2">
              <span>Grand Total (INR):</span>
              <span class="font-mono text-xl">₹${Number(invoice.grandTotal || 0).toFixed(2)}</span>
            </div>
          </div>

          <!-- Terms & Signature Box -->
          <div class="mt-4 pt-3 border-t border-gray-300 grid grid-cols-2 gap-3 text-[10px]">
            <div class="text-gray-600">
              <span class="font-bold text-gray-800 block uppercase text-[9px]">Terms & Conditions:</span>
              <p class="whitespace-pre-line leading-tight text-[9px] mt-0.5">${invoice.terms || company.termsAndConditions || '1. Goods once sold will not be taken back.\n2. Subject to local jurisdiction only.'}</p>
            </div>
            <div class="text-right flex flex-col justify-between">
              <p class="font-bold text-gray-800 text-[10px]">For ${company.tradeName || company.legalName}</p>
              <div class="mt-10 border-t border-gray-400 pt-1 font-bold text-gray-700 text-[9px] uppercase">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 5. Decorative Pinned Footer Band -->
      <div class="p-2.5 bg-emerald-900 text-white flex justify-between items-center text-[10px]">
        <span class="font-bold tracking-wide">Thank you for your business!</span>
        <span class="opacity-80">This is a computer generated tax invoice.</span>
        <span class="font-mono">${company.contact.phone ? 'Helpdesk: ' + company.contact.phone : ''}</span>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Render HTML for Purchase Bill / Inward Tax Invoice (Internal Audit Layout - NO Business Logo)
   */
  public static async renderPurchaseBillHtml(
    purchase: IPurchaseBill,
    company: ICompany
  ): Promise<string> {
    const isInterState = purchase.isInterState;

    const itemsRows = purchase.items
      .map(
        (it, idx) => `
        <tr class="border-b border-gray-300 ${idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'} text-[11px] leading-tight avoid-break">
          <td class="p-2.5 text-center text-gray-700 font-semibold border-r border-gray-200">${idx + 1}</td>
          <td class="p-2.5 font-bold text-gray-900 border-r border-gray-200">
            <div>${it.name}</div>
          </td>
          <td class="p-2.5 text-center text-gray-700 font-mono border-r border-gray-200">${it.hsnCode || '—'}</td>
          <td class="p-2.5 text-right text-gray-800 font-semibold border-r border-gray-200">${it.quantity} ${it.uqc || 'PCS'}</td>
          <td class="p-2.5 text-right text-gray-800 font-mono border-r border-gray-200">₹${it.purchaseRate.toFixed(2)}</td>
          <td class="p-2.5 text-right text-gray-600 font-mono border-r border-gray-200">${it.discountPercent ? it.discountPercent + '%' : '0%'}</td>
          <td class="p-2.5 text-right font-bold text-gray-900 font-mono border-r border-gray-200">₹${it.taxableValue.toFixed(2)}</td>
          ${
            isInterState
              ? `<td class="p-2.5 text-right text-gray-800 font-mono border-r border-gray-200">${it.gstRate}% (₹${(it.igstAmount || 0).toFixed(2)})</td>`
              : `<td class="p-2.5 text-right text-gray-800 font-mono border-r border-gray-200">${it.gstRate / 2}% (₹${(it.cgstAmount || 0).toFixed(2)})</td>
                 <td class="p-2.5 text-right text-gray-800 font-mono border-r border-gray-200">${it.gstRate / 2}% (₹${(it.sgstAmount || 0).toFixed(2)})</td>`
          }
          <td class="p-2.5 text-right font-extrabold text-gray-900 font-mono">₹${it.total.toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    const taxSummaryRows = (purchase.taxSummary || [])
      .map(
        (ts) => `
        <tr class="border-b border-gray-200 text-[10px] font-mono">
          <td class="p-1.5 font-bold text-gray-800">${ts.gstRate}%</td>
          <td class="p-1.5 text-right">₹${ts.taxableValue.toFixed(2)}</td>
          ${
            isInterState
              ? `<td class="p-1.5 text-right text-indigo-800">₹${ts.igst.toFixed(2)}</td>`
              : `<td class="p-1.5 text-right">₹${ts.cgst.toFixed(2)}</td><td class="p-1.5 text-right">₹${ts.sgst.toFixed(2)}</td>`
          }
          <td class="p-1.5 text-right font-bold text-gray-900">₹${ts.totalTax.toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    const formattedSupplierDate = new Date(purchase.supplierInvoiceDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const formattedEntryDate = new Date(purchase.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Purchase Bill - ${purchase.billNumber}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { 
      size: A4 portrait; 
      margin: 8mm; 
    }
    * {
      box-sizing: border-box;
    }
    html, body { 
      margin: 0;
      padding: 0;
      width: 100%;
      background: #fff;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif; 
      color: #111827; 
      font-size: 11px;
      line-height: 1.35;
    }
    .invoice-card {
      width: 100%;
      min-height: calc(297mm - 16mm);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      background: #fff;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    @media screen {
      body {
        background: #f1f5f9;
      }
      .invoice-card {
        max-width: 210mm;
        margin: 20px auto 40px auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        border: 2px solid #334155;
        border-radius: 8px;
        overflow: hidden;
      }
    }

    @media print {
      body { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
        background: #fff !important; 
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print, #preview-action-toolbar { 
        display: none !important; 
      }
      .invoice-card {
        width: 100% !important;
        min-height: calc(297mm - 16mm) !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        box-shadow: none !important;
        border: 2px solid #334155 !important;
        border-radius: 0 !important;
        margin: 0 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .avoid-break {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>

<body class="p-0 bg-white text-gray-900 w-full">
  <div class="invoice-card w-full border-2 border-slate-700 rounded-xl overflow-hidden bg-white shadow-none">

    
    <!-- Top & Middle Content Container -->
    <div class="flex-1 flex flex-col">
      <!-- 1. Header Section (NO Business Logo - Internal Audit Format) -->
      <div class="p-4 bg-slate-100 border-b-2 border-slate-700 flex justify-between items-center gap-4">
        <div class="flex-1 min-w-0">
          <div class="inline-block bg-slate-800 text-white font-black px-3 py-1 text-xs rounded uppercase tracking-wider mb-1.5">
            PURCHASE RECORD / INWARD TAX INVOICE
          </div>
          <h1 class="text-xl md:text-[22px] font-black text-slate-900 uppercase tracking-tight leading-tight break-words">${purchase.supplierName}</h1>
          <p class="text-xs text-gray-700 mt-1 leading-snug">
            ${purchase.supplierAddress?.line1 || ''} ${purchase.supplierAddress?.city ? ', ' + purchase.supplierAddress?.city : ''} ${purchase.supplierAddress?.state ? ', ' + purchase.supplierAddress?.state : ''}
          </p>
          <div class="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-800">
            <span><b>Supplier GSTIN:</b> <span class="font-mono text-slate-900 font-bold text-sm">${purchase.supplierGstin || 'URP (Unregistered)'}</span></span>
            ${purchase.supplierPhone ? `<span>📞 <b>Phone:</b> ${purchase.supplierPhone}</span>` : ''}
          </div>
        </div>

        <div class="text-right shrink-0 w-[210px]">
          <div class="bg-white p-3 rounded-lg border border-slate-300 text-xs text-left shadow-sm space-y-1.5">
            <div><span class="text-gray-500 font-semibold">Purchase Bill #:</span> <b class="text-slate-900 font-mono text-sm">${purchase.billNumber}</b></div>
            <div><span class="text-gray-500 font-semibold">Supplier Inv No:</span> <b class="text-indigo-950 font-mono">${purchase.supplierInvoiceNumber}</b></div>
            <div><span class="text-gray-500 font-semibold">Supplier Inv Date:</span> <b class="text-gray-900">${formattedSupplierDate}</b></div>
            <div><span class="text-gray-500 font-semibold">Entry Date:</span> <b class="text-gray-900">${formattedEntryDate}</b></div>
            <div><span class="text-gray-500 font-semibold">Place of Supply:</span> <b class="text-gray-900">${purchase.placeOfSupply}</b></div>
          </div>
        </div>
      </div>

      <!-- 2. Buyer / Recipient Details (Company) -->
      <div class="p-3.5 border-b border-slate-700 bg-slate-50 text-xs">
        <div class="font-extrabold text-[11px] uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-1.5 flex items-center justify-between">
          <span>Billed To / Inward Recipient (Company):</span>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="font-bold text-sm text-gray-900">${company.tradeName || company.legalName}</div>
            <div class="text-gray-700 mt-0.5">${company.address.line1}, ${company.address.city}, ${company.address.state} - <b>${company.address.pincode}</b></div>
          </div>
          <div class="space-y-0.5 text-right">
            <div><span class="font-semibold text-gray-600">Company GSTIN:</span> <b class="font-mono text-slate-900">${company.gstin}</b></div>
            <div><span class="font-semibold text-gray-600">PAN:</span> <b class="font-mono">${company.pan}</b></div>
          </div>
        </div>
      </div>

      <!-- 3. Items Table -->
      <div class="flex-1 overflow-x-auto">
        <table class="w-full text-left border-collapse border-b border-slate-700">
          <thead>
            <tr class="bg-slate-800 text-white text-[10px] uppercase font-bold tracking-wider">
              <th class="p-2.5 text-center w-8 border-r border-slate-700">#</th>
              <th class="p-2.5 border-r border-slate-700">Item / Service Description</th>
              <th class="p-2.5 text-center border-r border-slate-700">HSN/SAC</th>
              <th class="p-2.5 text-right border-r border-slate-700">Qty</th>
              <th class="p-2.5 text-right border-r border-slate-700">Purchase Rate</th>
              <th class="p-2.5 text-right border-r border-slate-700">Disc</th>
              <th class="p-2.5 text-right border-r border-slate-700">Taxable</th>
              ${
                isInterState
                  ? `<th class="p-2.5 text-right border-r border-slate-700">Input IGST</th>`
                  : `<th class="p-2.5 text-right border-r border-slate-700">Input CGST</th><th class="p-2.5 text-right border-r border-slate-700">Input SGST</th>`
              }
              <th class="p-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pinned Bottom Section (Summary, ITC Breakdown & Signatories) -->
    <div class="avoid-break bg-white">
      <!-- 4. Lower Summary Grid -->
      <div class="grid grid-cols-2 text-xs border-t border-slate-700">
        <!-- Left: Input Tax Credit (ITC) Breakdown -->
        <div class="p-3.5 border-r border-slate-700 space-y-3 bg-gray-50/40">
          <div>
            <div class="font-bold text-[10px] text-slate-800 uppercase tracking-wider mb-1">Input Tax Credit (ITC) Analysis</div>
            <table class="w-full text-left border border-gray-300 rounded overflow-hidden">
              <thead class="bg-slate-700 text-white text-[9px] uppercase font-bold">
                <tr>
                  <th class="p-1.5">Rate</th>
                  <th class="p-1.5 text-right">Taxable Val</th>
                  ${isInterState ? `<th class="p-1.5 text-right">Input IGST</th>` : `<th class="p-1.5 text-right">Input CGST</th><th class="p-1.5 text-right">Input SGST</th>`}
                  <th class="p-1.5 text-right">Total ITC</th>
                </tr>
              </thead>
              <tbody class="bg-white">
                ${taxSummaryRows}
              </tbody>
            </table>
          </div>

          <!-- Amount In Words -->
          <div class="p-2.5 rounded bg-white border border-gray-300">
            <span class="text-[10px] text-gray-500 font-bold uppercase block">Amount in words:</span>
            <span class="font-bold text-gray-900 text-xs">${purchase.amountInWords || numberToWordsIndian(purchase.grandTotal)}</span>
          </div>
        </div>

        <!-- Right: Totals & Internal Verification -->
        <div class="p-3.5 flex flex-col justify-between bg-white">
          <div class="space-y-1.5 text-xs">
            <div class="flex justify-between text-gray-700">
              <span>Total Taxable Value:</span>
              <span class="font-mono font-bold text-gray-900">₹${purchase.totalTaxable.toFixed(2)}</span>
            </div>
            ${
              isInterState
                ? `
                <div class="flex justify-between text-gray-700">
                  <span>Input IGST Total:</span>
                  <span class="font-mono font-bold text-gray-900">₹${purchase.igstTotal.toFixed(2)}</span>
                </div>
              `
                : `
                <div class="flex justify-between text-gray-700">
                  <span>Input CGST Total:</span>
                  <span class="font-mono font-bold text-gray-900">₹${purchase.cgstTotal.toFixed(2)}</span>
                </div>
                <div class="flex justify-between text-gray-700">
                  <span>Input SGST Total:</span>
                  <span class="font-mono font-bold text-gray-900">₹${purchase.sgstTotal.toFixed(2)}</span>
                </div>
              `
            }
            ${
              purchase.roundOff !== 0
                ? `
                <div class="flex justify-between text-gray-600 border-t border-gray-200 pt-1">
                  <span>Round Off:</span>
                  <span class="font-mono font-semibold text-gray-800">₹${purchase.roundOff.toFixed(2)}</span>
                </div>
              `
                : ''
            }
            <div class="flex justify-between text-base font-extrabold text-slate-900 bg-slate-100 p-2.5 rounded border border-slate-300 mt-2">
              <span>Grand Total Payable:</span>
              <span class="font-mono text-xl">₹${purchase.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <!-- Internal Audit Verification Box -->
          <div class="mt-4 pt-3 border-t border-gray-300 grid grid-cols-2 gap-3 text-[10px]">
            <div>
              <p class="font-bold text-gray-700 text-[9px] uppercase">Goods Received By:</p>
              <div class="mt-8 border-t border-gray-400 pt-1 font-semibold text-gray-600">
                Store In-charge
              </div>
            </div>
            <div class="text-right">
              <p class="font-bold text-gray-700 text-[9px] uppercase">Verified & Passed By:</p>
              <div class="mt-8 border-t border-gray-400 pt-1 font-semibold text-gray-600">
                Accounts Department
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 5. Decorative Pinned Footer Band -->
      <div class="p-2.5 bg-slate-800 text-white flex justify-between items-center text-[10px]">
        <span class="font-bold tracking-wide">Internal Purchase Record — Claim eligible Input Tax Credit in GSTR-3B</span>
        <span class="font-mono">FY: ${purchase.financialYear || company.currentFY}</span>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Render HTML for A5 Compact Invoice (Half Page with Flex Height & Proportions)
   */
  public static async renderA5Html(invoice: IInvoice, company: ICompany): Promise<string> {
    const isInterState = invoice.isInterState;
    const itemsRows = (invoice.items || [])
      .map(
        (it: any, idx) => {
          const itemName = it.name || (it.item && typeof it.item === 'object' ? it.item.name : '') || 'Item';
          const itemHsn = it.hsnCode || (it.item && typeof it.item === 'object' ? it.item.hsnCode : '') || '—';
          const itemRate = Number(it.rate ?? it.unitPrice ?? 0);
          const itemTaxable = Number(it.taxableValue ?? it.taxableAmount ?? (itemRate * (it.quantity || 1)));
          const itemTotal = Number(it.total ?? (itemTaxable + (it.cgstAmount || 0) + (it.sgstAmount || 0) + (it.igstAmount || 0)));
          const itemUqc = it.uqc || (it.item && typeof it.item === 'object' ? it.item.uqc : '') || 'PCS';
          return `
        <tr class="border-b border-gray-200 text-[10px]">
          <td class="p-1.5 text-center">${idx + 1}</td>
          <td class="p-1.5 font-bold">${itemName}</td>
          <td class="p-1.5 text-center">${itemHsn}</td>
          <td class="p-1.5 text-right font-semibold">${it.quantity || 1} ${itemUqc}</td>
          <td class="p-1.5 text-right">₹${itemRate.toFixed(2)}</td>
          <td class="p-1.5 text-right font-bold">₹${itemTaxable.toFixed(2)}</td>
          <td class="p-1.5 text-right">${it.gstRate || 0}%</td>
          <td class="p-1.5 text-right font-black">₹${itemTotal.toFixed(2)}</td>
        </tr>
      `;
        }
      )
      .join('');

    const logoDataUrl = this.getLogoDataUrl(company);
    const logoHtml = logoDataUrl
      ? `<div class="shrink-0 flex items-center justify-center p-1 bg-white rounded border border-emerald-200 shadow-sm mr-2.5">
           <img src="${logoDataUrl}" alt="" class="max-h-16 max-w-[120px] object-contain rounded" />
         </div>`
      : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${invoice.invoiceNumber}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @page { size: A5 landscape; margin: 6mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #f8fafc;
      font-family: 'Segoe UI', Arial, sans-serif; 
      color: #1f2937; 
      font-size: 11px;
    }
    #printable-document {
      width: 100%;
      display: flex;
      justify-content: center;
      padding: 16px 8px;
      box-sizing: border-box;
      overflow-x: auto;
    }
    .invoice-card {
      width: 100%;
      max-width: 210mm;
      min-width: 600px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      background: #fff;
      box-shadow: 0 4px 15px rgba(0,0,0,0.08);
      border: 1px solid #064e3b;
      border-radius: 8px;
      padding: 12px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; }
      .no-print, #preview-action-toolbar { display: none !important; }
      #printable-document { display: block !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; }
      .invoice-card {
        min-height: 0 !important;
        height: auto !important;
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        display: block !important;
        box-shadow: none !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  </style>
</head>
<body class="p-0 bg-slate-50 text-gray-900">
  <div id="printable-document">
  <div class="invoice-card border border-emerald-900 rounded-lg p-3 bg-white">
    <div>
      <!-- Header -->
      <div class="flex justify-between items-center border-b border-emerald-900 pb-2.5">
        <div class="flex items-center">
          ${logoHtml}
          <div>
            <h1 class="text-xl font-black text-emerald-950 uppercase tracking-tight">${company.tradeName || company.legalName}</h1>
            <p class="text-[10px] text-gray-700">${company.address.line1}, ${company.address.city}, ${company.address.state} - ${company.address.pincode}</p>
            <p class="text-[10px] font-bold text-emerald-900">GSTIN: ${company.gstin || 'N/A'} | Mob: ${company.contact.phone || 'N/A'}</p>
          </div>
        </div>
        <div class="text-right shrink-0">
          <span class="bg-emerald-900 text-white font-black px-2.5 py-0.5 text-[10px] rounded uppercase shadow-sm">Tax Invoice</span>
          <p class="text-xs font-black font-mono text-emerald-950 mt-1">#${invoice.invoiceNumber}</p>
          <p class="text-[10px] text-gray-600">${new Date(invoice.date).toLocaleDateString('en-IN')}</p>
        </div>
      </div>

      <!-- Customer -->
      <div class="flex justify-between bg-emerald-50/40 p-2 rounded my-2 text-[10px] border border-emerald-200">
        <div>
          <span class="font-bold text-gray-900">Customer:</span> ${invoice.customerName} | Mob: ${invoice.customerPhone || 'N/A'}
        </div>
        <div>
          <span class="font-bold text-gray-900">GSTIN:</span> ${invoice.customerGstin || 'Unregistered'} | POS: ${invoice.placeOfSupply}
        </div>
      </div>

      <!-- Table -->
      <table class="w-full text-left border-collapse border border-gray-200 my-2">
        <thead class="bg-emerald-900 text-white text-[10px]">
          <tr>
            <th class="p-1.5 text-center w-6">#</th>
            <th class="p-1.5">Item Description</th>
            <th class="p-1.5 text-center">HSN</th>
            <th class="p-1.5 text-right">Qty</th>
            <th class="p-1.5 text-right">Rate</th>
            <th class="p-1.5 text-right">Taxable</th>
            <th class="p-1.5 text-right">GST%</th>
            <th class="p-1.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
    </div>

    <!-- Bottom summary -->
    <div class="flex justify-between items-end pt-2 border-t border-emerald-900 text-[10px]">
      <div class="text-[9px] text-gray-700 leading-tight space-y-0.5">
        <p><b>Bank:</b> ${company.bankDetails?.bankName || 'N/A'} | <b>A/c:</b> ${company.bankDetails?.accountNo || 'N/A'} | <b>IFSC:</b> ${company.bankDetails?.ifsc || 'N/A'}</p>
        <p><b>Words:</b> ${invoice.amountInWords || numberToWordsIndian(invoice.grandTotal)}</p>
      </div>
      <div class="text-right">
        <div class="text-sm font-black font-mono text-emerald-950">
          Grand Total: ₹${invoice.grandTotal.toFixed(2)}
        </div>
        <div class="text-[9px] text-gray-600 mt-1">For ${company.tradeName || company.legalName}</div>
      </div>
    </div>
  </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Render HTML for POS Thermal Receipt (58mm / 80mm)
   */
  public static async renderPosHtml(
    invoice: IInvoice,
    company: ICompany,
    widthMm: number = 80
  ): Promise<string> {
    const qrDataUrl = await this.generateUPIQR(
      company.bankDetails?.upiId || '',
      company.tradeName || company.legalName,
      invoice.grandTotal,
      invoice.invoiceNumber
    );

    const logoDataUrl = this.getLogoDataUrl(company);
    const logoHtml = logoDataUrl
      ? `<div style="text-align:center; margin-bottom:4px;"><img src="${logoDataUrl}" style="max-height:50px; max-width:140px; object-fit:contain; filter:grayscale(100%);" /></div>`
      : '';

    const itemsRows = (invoice.items || [])
      .map(
        (it: any) => {
          const itemName = it.name || (it.item && typeof it.item === 'object' ? it.item.name : '') || 'Item';
          const itemHsn = it.hsnCode || (it.item && typeof it.item === 'object' ? it.item.hsnCode : '') || '—';
          const itemRate = Number(it.rate ?? it.unitPrice ?? 0);
          const itemTaxable = Number(it.taxableValue ?? it.taxableAmount ?? (itemRate * (it.quantity || 1)));
          const itemTotal = Number(it.total ?? (itemTaxable + (it.cgstAmount || 0) + (it.sgstAmount || 0) + (it.igstAmount || 0)));
          const itemUqc = it.uqc || (it.item && typeof it.item === 'object' ? it.item.uqc : '') || 'PCS';
          return `
        <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
          <span style="font-weight:700;">${itemName}</span>
          <span>₹${itemTotal.toFixed(2)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size: 10px; color: #444; margin-bottom: 4px;">
          <span>${it.quantity || 1} ${itemUqc} @ ₹${itemRate.toFixed(2)} (${it.gstRate || 0}% GST)</span>
          <span>HSN: ${itemHsn}</span>
        </div>
      `;
        }
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - ${invoice.invoiceNumber}</title>
  <style>
    @page { size: ${widthMm}mm auto; margin: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: ${widthMm}mm;
      margin: 0 auto;
      padding: 6px;
      font-size: 11px;
      line-height: 1.2;
      color: #000;
      background: #fff;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .divider { border-bottom: 1px dashed #000; margin: 5px 0; }
    .double-divider { border-bottom: 2px solid #000; margin: 6px 0; }
  </style>
</head>
<body>
  <div class="center">
    ${logoHtml}
    <div style="font-size: 16px; font-weight: 900; text-transform: uppercase;">${company.tradeName || company.legalName}</div>
    <div>${company.address.line1 || ''}, ${company.address.city || ''}</div>
    <div>GSTIN: ${company.gstin || 'UNREGISTERED'}</div>
    <div>Ph: ${company.contact.phone || 'N/A'}</div>
  </div>

  <div class="divider"></div>

  <div style="display:flex; justify-content:space-between;">
    <span>Inv: <b>${invoice.invoiceNumber}</b></span>
    <span>${new Date(invoice.date).toLocaleDateString('en-IN')}</span>
  </div>
  <div>Customer: ${invoice.customerName} (${invoice.customerPhone || 'Walk-in'})</div>

  <div class="divider"></div>

  <!-- Items -->
  <div>
    ${itemsRows}
  </div>

  <div class="divider"></div>

  <!-- Summary -->
  <div style="display:flex; justify-content:space-between;">
    <span>Taxable Subtotal:</span>
    <span>₹${Number(invoice.totalTaxable ?? (invoice as any).taxableAmount ?? invoice.grandTotal ?? 0).toFixed(2)}</span>
  </div>
  ${
    invoice.isInterState
      ? `<div style="display:flex; justify-content:space-between;"><span>IGST:</span><span>₹${Number(invoice.igstTotal ?? (invoice as any).totalIgst ?? 0).toFixed(2)}</span></div>`
      : `<div style="display:flex; justify-content:space-between;"><span>CGST:</span><span>₹${Number(invoice.cgstTotal ?? (invoice as any).totalCgst ?? 0).toFixed(2)}</span></div>
         <div style="display:flex; justify-content:space-between;"><span>SGST:</span><span>₹${Number(invoice.sgstTotal ?? (invoice as any).totalSgst ?? 0).toFixed(2)}</span></div>`
  }
  ${
    Number(invoice.roundOff || 0) !== 0
      ? `<div style="display:flex; justify-content:space-between;"><span>Round Off:</span><span>₹${Number(invoice.roundOff || 0).toFixed(2)}</span></div>`
      : ''
  }

  <div class="double-divider"></div>

  <div style="display:flex; justify-content:space-between; font-size: 14px; font-weight: 900;">
    <span>TOTAL PAYABLE:</span>
    <span>₹${Number(invoice.grandTotal || 0).toFixed(2)}</span>
  </div>

  <div class="divider"></div>

  <div class="center" style="margin-top: 6px;">
    ${qrDataUrl ? `<img src="${qrDataUrl}" style="width: 85px; height: 85px; display: inline-block;" /><br/>` : ''}
    <div style="font-size: 10px; margin-top: 4px;">Scan & Pay via UPI</div>
    <div style="font-weight: bold; margin-top: 6px;">THANK YOU FOR VISITING!</div>
    <div style="font-size: 9px; color: #555;">Goods once sold will not be taken back</div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Save HTML invoice to disk and return path
   */
  public static async saveInvoiceHtml(
    invoice: IInvoice,
    company: ICompany,
    template: 'POS-58' | 'POS-80' | 'A5' | 'A4',
    outputDir: string
  ): Promise<string> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let htmlContent = '';
    if (template === 'POS-58') {
      htmlContent = await this.renderPosHtml(invoice, company, 58);
    } else if (template === 'POS-80') {
      htmlContent = await this.renderPosHtml(invoice, company, 80);
    } else if (template === 'A5') {
      htmlContent = await this.renderA5Html(invoice, company);
    } else {
      htmlContent = await this.renderA4Html(invoice, company);
    }

    const safeInvNo = invoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_');
    const filePath = path.join(outputDir, `Invoice_${safeInvNo}.html`);
    fs.writeFileSync(filePath, htmlContent, 'utf8');
    return filePath;
  }

  /**
   * Automatically locate a Chromium-based browser executable (Edge, Chrome, Brave, Chromium)
   */
  public static findBrowserExecutable(): string | null {
    // 0. Check environment variables first (for Render, Docker, or custom cloud setups)
    const envCandidate =
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      process.env.CHROME_BIN ||
      process.env.CHROME_PATH ||
      process.env.CHROMIUM_PATH;
    if (envCandidate && fs.existsSync(envCandidate)) {
      return envCandidate;
    }

    const candidates: string[] = [];

    // 1. Windows standard Edge / Chrome / Brave paths
    if (process.platform === 'win32') {
      const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
      const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
      const localAppData = process.env['LOCALAPPDATA'] || '';

      candidates.push(
        path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(programFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
        path.join(programFilesX86, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')
      );
    } else if (process.platform === 'darwin') {
      // macOS standard paths
      candidates.push(
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
        '/Applications/Chromium.app/Contents/MacOS/Chromium'
      );
    } else {
      // Linux standard paths
      candidates.push(
        '/usr/bin/microsoft-edge',
        '/usr/bin/microsoft-edge-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium'
      );
    }

    for (const exe of candidates) {
      if (exe && fs.existsSync(exe)) {
        return exe;
      }
    }

    return null;
  }

  /**
   * Generate genuine PDF binary buffer from HTML using headless Chromium/Edge
   */
  public static async generatePdfBuffer(
    html: string,
    options?: {
      format?: 'A4' | 'A5';
      width?: string;
      height?: string;
      printBackground?: boolean;
      landscape?: boolean;
    }
  ): Promise<Buffer> {
    const executablePath = this.findBrowserExecutable();
    if (!executablePath) {
      throw new Error(
        'Could not locate Microsoft Edge or Google Chrome executable on system for PDF rendering.'
      );
    }

    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--no-first-run',
        ],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });

      await page.setContent(html, {
        waitUntil: 'load',
        timeout: 15000,
      });


      await new Promise((r) => setTimeout(r, 200));

      const isPos = options?.width && options.width.includes('mm');

      const pdfBuffer = await page.pdf({
        format: isPos ? undefined : (options?.format || 'A4'),
        width: options?.width,
        height: options?.height,
        printBackground: options?.printBackground !== false,
        landscape: options?.landscape || false,
        preferCSSPageSize: true,
        margin: isPos
          ? { top: '0px', right: '0px', bottom: '0px', left: '0px' }
          : { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch {}
      }
    }

  }

  /**
   * Generate genuine PDF Buffer for an Invoice based on selected template
   */
  public static async generateInvoicePdfBuffer(
    invoice: IInvoice,
    company: ICompany,
    template?: 'POS-58' | 'POS-80' | 'A5' | 'A4'
  ): Promise<Buffer> {
    const tpl = template || (invoice.templateUsed as any) || company.defaultTemplate || 'A4';
    let htmlContent = '';
    let pdfOptions: any = { format: 'A4' };

    if (tpl === 'POS-58') {
      htmlContent = await this.renderPosHtml(invoice, company, 58);
      pdfOptions = { width: '58mm', printBackground: true };
    } else if (tpl === 'POS-80') {
      htmlContent = await this.renderPosHtml(invoice, company, 80);
      pdfOptions = { width: '80mm', printBackground: true };
    } else if (tpl === 'A5') {
      htmlContent = await this.renderA5Html(invoice, company);
      pdfOptions = { format: 'A5', printBackground: true };
    } else {
      htmlContent = await this.renderA4Html(invoice, company);
      pdfOptions = { format: 'A4', printBackground: true };
    }

    return await this.generatePdfBuffer(htmlContent, pdfOptions);
  }

  /**
   * Save genuine PDF file to disk and return path
   */
  public static async saveInvoicePdf(
    invoice: IInvoice,
    company: ICompany,
    template: 'POS-58' | 'POS-80' | 'A5' | 'A4',
    outputDir: string
  ): Promise<string> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const pdfBuffer = await this.generateInvoicePdfBuffer(invoice, company, template);
    const safeInvNo = invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(outputDir, `Invoice_${safeInvNo}.pdf`);
    fs.writeFileSync(filePath, pdfBuffer);
    return filePath;
  }

  /**
   * Generate genuine PDF Buffer for a Purchase Bill
   */
  public static async generatePurchaseBillPdfBuffer(
    purchase: IPurchaseBill | any,
    company: ICompany
  ): Promise<Buffer> {
    const htmlContent = await this.renderPurchaseBillHtml(purchase, company);
    return await this.generatePdfBuffer(htmlContent, { format: 'A4', printBackground: true });
  }

  /**
   * Generate consolidated Bulk HTML containing all customer sales invoices
   */
  public static async generateBulkInvoicesHtml(
    invoices: (IInvoice | any)[],
    company: ICompany
  ): Promise<string> {
    if (!invoices || invoices.length === 0) {
      throw new Error('No invoices provided for bulk generation.');
    }

    const renderedPages: string[] = [];
    for (const inv of invoices) {
      const fullHtml = await this.renderA4Html(inv, company);
      const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const bodyContent = bodyMatch ? bodyMatch[1].trim() : fullHtml.trim();
      renderedPages.push(`<div class="invoice-page">${bodyContent}</div>`);
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Consolidated Invoices - ${company.tradeName || company.legalName}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { 
      size: A4 portrait; 
      margin: 8mm; 
    }
    * {
      box-sizing: border-box;
    }
    html, body { 
      margin: 0;
      padding: 0;
      width: 100%;
      background: #fff;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif; 
      color: #111827; 
      font-size: 11px;
      line-height: 1.35;
    }
    #printable-document {
      width: 100%;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .invoice-page {
      width: 100%;
      min-height: calc(297mm - 16mm);
      box-sizing: border-box;
      background: #fff;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
      margin: 0;
      padding: 0;
    }
    .invoice-page:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }
    .invoice-card {
      width: 100%;
      min-height: calc(297mm - 16mm);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      background: #fff;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    @media screen {
      body {
        background: #f1f5f9;
      }
      #printable-document {
        max-width: 210mm;
        margin: 0 auto;
        padding: 20px 0 40px 0;
        background: transparent;
      }
      .invoice-page {
        margin-bottom: 24px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      }
      .invoice-page:last-child {
        margin-bottom: 0;
      }
    }

    @media print {
      body { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
        background: #fff !important; 
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print, #preview-action-toolbar { 
        display: none !important; 
      }
      #printable-document {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
      }
      .invoice-page {
        width: 100% !important;
        min-height: calc(297mm - 16mm) !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .invoice-page:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      .invoice-card {
        width: 100% !important;
        min-height: calc(297mm - 16mm) !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        box-shadow: none !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body class="p-0 bg-white text-gray-900 w-full">
  <div id="printable-document">
    ${renderedPages.join('\n')}
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate consolidated Bulk PDF buffer containing all customer sales invoices
   */
  public static async generateBulkInvoicesPdfBuffer(
    invoices: (IInvoice | any)[],
    company: ICompany
  ): Promise<Buffer> {
    const combinedHtml = await this.generateBulkInvoicesHtml(invoices, company);
    return await this.generatePdfBuffer(combinedHtml, { format: 'A4', printBackground: true });
  }

  /**
   * Generate consolidated Bulk HTML containing all supplier purchase bills
   */
  public static async generateBulkPurchaseBillsHtml(
    purchases: (IPurchaseBill | any)[],
    company: ICompany
  ): Promise<string> {
    if (!purchases || purchases.length === 0) {
      throw new Error('No purchase bills provided for bulk generation.');
    }

    const renderedPages: string[] = [];
    for (const p of purchases) {
      const fullHtml = await this.renderPurchaseBillHtml(p, company);
      const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const bodyContent = bodyMatch ? bodyMatch[1].trim() : fullHtml.trim();
      renderedPages.push(`<div class="invoice-page">${bodyContent}</div>`);
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Consolidated Purchase Records - ${company.tradeName || company.legalName}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { 
      size: A4 portrait; 
      margin: 8mm; 
    }
    * {
      box-sizing: border-box;
    }
    html, body { 
      margin: 0;
      padding: 0;
      width: 100%;
      background: #fff;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif; 
      color: #111827; 
      font-size: 11px;
      line-height: 1.35;
    }
    #printable-document {
      width: 100%;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .invoice-page {
      width: 100%;
      min-height: calc(297mm - 16mm);
      box-sizing: border-box;
      background: #fff;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
      margin: 0;
      padding: 0;
    }
    .invoice-page:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }
    .invoice-card {
      width: 100%;
      min-height: calc(297mm - 16mm);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      background: #fff;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    @media screen {
      body {
        background: #f1f5f9;
      }
      #printable-document {
        max-width: 210mm;
        margin: 0 auto;
        padding: 20px 0 40px 0;
        background: transparent;
      }
      .invoice-page {
        margin-bottom: 24px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      }
      .invoice-page:last-child {
        margin-bottom: 0;
      }
    }

    @media print {
      body { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
        background: #fff !important; 
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print, #preview-action-toolbar { 
        display: none !important; 
      }
      #printable-document {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
      }
      .invoice-page {
        width: 100% !important;
        min-height: calc(297mm - 16mm) !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .invoice-page:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      .invoice-card {
        width: 100% !important;
        min-height: calc(297mm - 16mm) !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        box-shadow: none !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body class="p-0 bg-white text-gray-900 w-full">
  <div id="printable-document">
    ${renderedPages.join('\n')}
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate consolidated Bulk PDF containing all supplier purchase bills
   */
  public static async generateBulkPurchaseBillsPdfBuffer(
    purchases: (IPurchaseBill | any)[],
    company: ICompany
  ): Promise<Buffer> {
    const combinedHtml = await this.generateBulkPurchaseBillsHtml(purchases, company);
    return await this.generatePdfBuffer(combinedHtml, { format: 'A4', printBackground: true });
  }

  /**
   * Universal Helper: Injects an interactive top action bar (Download PDF, Print / Save as PDF, Close)
   * into any invoice, purchase, or bulk HTML document.
   * Toolbar is automatically hidden inside iframes (embedded preview canvas) and when printed/saved as PDF!
   */
  public static injectPreviewToolbar(
    html: string,
    options: {
      title: string;
      subtitle?: string;
      badge?: string;
      filename?: string;
      format?: string;
      autoPrint?: boolean;
    }
  ): string {
    const safeFilename = (options.filename || 'document').replace(/[^a-zA-Z0-9_-]/g, '_');
    const pdfFormat = options.format || 'a4';

    const toolbarHtml = `
  <div id="preview-action-toolbar" class="no-print" style="position: sticky; top: 0; left: 0; right: 0; z-index: 99999; background: #0f172a; color: #f8fafc; padding: 10px 18px; border-bottom: 1px solid #334155; box-shadow: 0 4px 14px rgba(0,0,0,0.35); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); color: #10b981; border-radius: 8px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 16px;">
        📄
      </div>
      <div>
        <div style="font-weight: 700; font-size: 13px; color: #ffffff; display: flex; align-items: center; gap: 8px;">
          <span>${options.title}</span>
          ${options.badge ? `<span style="font-size: 10px; padding: 2px 7px; border-radius: 4px; background: #1e293b; color: #94a3b8; border: 1px solid #334155; font-family: monospace;">${options.badge}</span>` : ''}
        </div>
        ${options.subtitle ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 1px;">${options.subtitle}</div>` : ''}
      </div>
    </div>

    <div style="display: flex; align-items: center; gap: 8px;">
      <!-- Direct Download PDF via client-side html2pdf with fallback to native print -->
      <button id="btn-download-pdf" onclick="downloadPreviewPDF()" style="background: #059669; color: #ffffff; border: none; border-radius: 6px; padding: 7px 14px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); transition: background 0.15s;">
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
        <span>Download PDF</span>
      </button>

      <!-- Native Print / Save as PDF via browser print dialog -->
      <button onclick="window.print()" style="background: #4f46e5; color: #ffffff; border: none; border-radius: 6px; padding: 7px 14px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); transition: background 0.15s;" title="Print or choose 'Save as PDF' destination">
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
        <span>Print / Save as PDF</span>
      </button>

      <!-- Close Tab Button -->
      <button onclick="window.close()" style="background: #1e293b; color: #cbd5e1; border: 1px solid #475569; border-radius: 6px; padding: 7px 12px; font-size: 12px; font-weight: 600; cursor: pointer;">
        ✕ Close
      </button>
    </div>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <script>
    // Automatically hide toolbar if embedded in an iframe (modal canvas preview)
    if (window.self !== window.top) {
      document.addEventListener('DOMContentLoaded', function() {
        var tb = document.getElementById('preview-action-toolbar');
        if (tb) tb.style.display = 'none';
      });
    }

    function downloadPreviewPDF() {
      var btn = document.getElementById('btn-download-pdf');
      if (!btn) return;
      var origText = btn.innerHTML;
      btn.innerHTML = '⏳ Generating PDF...';
      btn.disabled = true;

      // Ensure window is scrolled to top to eliminate scroll clipping on mobile and desktop
      var origScrollY = window.scrollY;
      window.scrollTo(0, 0);

      var printableDoc = document.getElementById('printable-document');
      var singleCard = document.querySelector('.invoice-card') || document.querySelector('.report-card');
      var target = printableDoc || singleCard || document.body;

      // Temporarily clear screen preview spacing/shadows for pristine 1:1 A4 capture
      var origDocStyle = printableDoc ? printableDoc.getAttribute('style') : null;
      var origCardStyle = (!printableDoc && singleCard) ? singleCard.getAttribute('style') : null;

      var pages = document.querySelectorAll('.invoice-page');
      var origPageStyles = [];
      pages.forEach(function(p, i) {
        origPageStyles[i] = p.getAttribute('style');
        p.style.marginBottom = '0px';
        p.style.boxShadow = 'none';
        p.style.margin = '0px';
      });

      if (printableDoc) {
        printableDoc.style.padding = '0px';
        printableDoc.style.margin = '0px';
        printableDoc.style.maxWidth = '100%';
        printableDoc.style.width = '100%';
      } else if (singleCard) {
        singleCard.style.margin = '0px';
        singleCard.style.boxShadow = 'none';
        singleCard.style.maxWidth = '100%';
        singleCard.style.width = '100%';
      }

      var opt = {
        margin: 0,
        filename: '${safeFilename}.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        enableLinks: false,
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: {
          unit: 'mm',
          format: '${pdfFormat}',
          orientation: 'portrait',
          compress: true
        },
        pagebreak: {
          mode: ['css', 'legacy'],
          avoid: ['.avoid-break', 'tr', '.report-card']
        }
      };

      function restoreStyles() {
        if (printableDoc) {
          if (origDocStyle !== null) printableDoc.setAttribute('style', origDocStyle);
          else printableDoc.removeAttribute('style');
        } else if (singleCard) {
          if (origCardStyle !== null) singleCard.setAttribute('style', origCardStyle);
          else singleCard.removeAttribute('style');
        }
        pages.forEach(function(p, i) {
          if (origPageStyles[i] !== null && origPageStyles[i] !== undefined) {
            p.setAttribute('style', origPageStyles[i]);
          } else {
            p.removeAttribute('style');
          }
        });
        window.scrollTo(0, origScrollY);
        btn.innerHTML = origText;
        btn.disabled = false;
      }

      if (window.html2pdf) {
        window.html2pdf().set(opt).from(target).save().then(function() {
          restoreStyles();
        }).catch(function(err) {
          console.warn('html2pdf notice, opening print dialog:', err);
          restoreStyles();
          window.print();
        });
      } else {
        restoreStyles();
        window.print();
      }
    }

    ${options.autoPrint ? 'window.addEventListener("load", function() { setTimeout(function() { window.print(); }, 400); });' : ''}
  </script>
  <style>
    @media print {
      .no-print, #preview-action-toolbar {
        display: none !important;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
      }
    }
  </style>
    `;

    if (html.includes('</head>')) {
      const headInjected = html.replace('</head>', `  <style>@media print { .no-print, #preview-action-toolbar { display: none !important; } }</style>\n</head>`);
      const bodyMatch = headInjected.match(/<body[^>]*>/i);
      if (bodyMatch) {
        return headInjected.replace(bodyMatch[0], `${bodyMatch[0]}\n${toolbarHtml}`);
      }
      return toolbarHtml + headInjected;
    }

    return toolbarHtml + html;
  }

  /**
   * Render HTML for Customer GST Summary Report (A4 Layout)
   */
  public static async renderCustomerGstReportHtml(
    summary: any,
    party: any,
    company: ICompany,
    dateRangeLabel: string = 'All Time'
  ): Promise<string> {
    const logoDataUrl = this.getLogoDataUrl(company);
    const logoHtml = logoDataUrl
      ? `<div class="shrink-0 flex items-center justify-center p-1 bg-white rounded-lg border border-emerald-200 shadow-sm max-w-[120px]">
           <img src="${logoDataUrl}" alt="Logo" class="max-h-20 max-w-[110px] object-contain rounded" />
         </div>`
      : '';

    const invoices: any[] = summary.invoices || [];
    const invoiceRows = invoices
      .map((inv, idx) => {
        const invDate = inv.date ? new Date(inv.date).toLocaleDateString('en-IN') : '—';
        const taxable = Number(inv.totalTaxable ?? inv.taxableAmount ?? 0);
        const cgst = Number(inv.cgstTotal ?? 0);
        const sgst = Number(inv.sgstTotal ?? 0);
        const igst = Number(inv.igstTotal ?? 0);
        const totalTax = cgst + sgst + igst + Number(inv.cessTotal || 0);
        const roundOff = Number(inv.roundOff || 0);
        const grandTotal = Number(inv.grandTotal || 0);

        return `
        <tr class="border-b border-gray-200 ${idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'} text-[10px] leading-tight">
          <td class="p-2 text-center text-gray-700 font-semibold border-r border-gray-200">${idx + 1}</td>
          <td class="p-2 font-bold font-mono text-emerald-950 border-r border-gray-200">${inv.invoiceNumber}</td>
          <td class="p-2 font-mono text-gray-800 border-r border-gray-200">${invDate}</td>
          <td class="p-2 text-gray-700 border-r border-gray-200">${inv.placeOfSupply || '—'}</td>
          <td class="p-2 text-right font-mono font-semibold text-gray-900 border-r border-gray-200">₹${taxable.toFixed(2)}</td>
          <td class="p-2 text-right font-mono text-gray-700 border-r border-gray-200">₹${cgst.toFixed(2)}</td>
          <td class="p-2 text-right font-mono text-gray-700 border-r border-gray-200">₹${sgst.toFixed(2)}</td>
          <td class="p-2 text-right font-mono text-gray-700 border-r border-gray-200">₹${igst.toFixed(2)}</td>
          <td class="p-2 text-right font-mono font-bold text-gray-900 border-r border-gray-200">₹${totalTax.toFixed(2)}</td>
          <td class="p-2 text-right font-mono text-gray-600 border-r border-gray-200">₹${roundOff.toFixed(2)}</td>
          <td class="p-2 text-right font-mono font-black text-emerald-950 border-r border-gray-200">₹${grandTotal.toFixed(2)}</td>
          <td class="p-2 text-center font-bold text-[9px]">
            <span class="px-1.5 py-0.5 rounded ${inv.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
              ${inv.paymentStatus || 'Paid'}
            </span>
          </td>
        </tr>
        `;
      })
      .join('');

    const formattedGeneratedDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GST Summary Report - ${party?.name || 'Customer'}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { 
      size: A4 portrait; 
      margin: 8mm; 
    }
    * {
      box-sizing: border-box;
    }
    html, body { 
      margin: 0;
      padding: 0;
      width: 100%;
      background: #fff;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif; 
      color: #111827; 
      font-size: 11px;
    }
    .report-card {
      width: 100%;
      min-height: calc(297mm - 16mm);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      background: #fff;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    @media screen {
      body {
        background: #f1f5f9;
      }
      .report-card {
        max-width: 210mm;
        margin: 20px auto 40px auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        border: 2px solid #064e3b;
        border-radius: 8px;
        overflow: hidden;
      }
    }

    @media print {
      body { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
        background: #fff !important; 
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print, #preview-action-toolbar { 
        display: none !important; 
      }
      .report-card {
        width: 100% !important;
        min-height: calc(297mm - 16mm) !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        box-shadow: none !important;
        border: 2px solid #064e3b !important;
        border-radius: 0 !important;
        margin: 0 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body class="p-0 bg-white text-gray-900 w-full">
  <div class="report-card w-full border-2 border-emerald-900 rounded-xl overflow-hidden bg-white shadow-none">
    <div class="flex-1 flex flex-col">
      <!-- 1. Header Banner -->
      <div class="p-4 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40 border-b-2 border-emerald-900 flex justify-between items-center gap-4">
        <div class="flex items-center gap-3.5 flex-1 min-w-0">
          ${logoHtml}
          <div class="min-w-0 flex-1">
            <h1 class="text-xl font-black text-emerald-950 uppercase tracking-tight break-words">
              ${company.tradeName || company.legalName}
            </h1>
            <p class="text-xs text-gray-800 font-medium">
              ${company.address?.line1 || ''}, ${company.address?.city || ''}, ${company.address?.state || ''} - <b>${company.address?.pincode || ''}</b>
            </p>
            <div class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-900">
              <span><b>GSTIN:</b> <span class="font-mono text-emerald-950 font-black">${company.gstin || 'UNREGISTERED'}</span></span>
              <span><b>PAN:</b> <span class="font-mono font-bold">${company.pan || 'N/A'}</span></span>
              ${company.contact?.phone ? `<span>📞 ${company.contact.phone}</span>` : ''}
              ${company.contact?.email ? `<span>✉️ ${company.contact.email}</span>` : ''}
            </div>
          </div>
        </div>

        <div class="text-right shrink-0 w-[220px]">
          <div class="inline-block bg-emerald-950 text-white font-black px-3 py-1 text-[11px] rounded uppercase tracking-wider shadow-sm">
            GST SUMMARY REPORT
          </div>
          <div class="text-[10px] font-bold text-emerald-800 uppercase tracking-wide mt-1">
            Outward Supplies & Sales
          </div>
          <div class="mt-1.5 bg-white p-2 rounded border border-emerald-300 text-xs text-left shadow-sm space-y-0.5">
            <div><span class="text-gray-500 font-semibold">Period:</span> <b class="text-emerald-950">${dateRangeLabel}</b></div>
            <div><span class="text-gray-500 font-semibold">Generated:</span> <b class="text-gray-900 text-[10px]">${formattedGeneratedDate}</b></div>
          </div>
        </div>
      </div>

      <!-- 2. Customer Profile Box -->
      <div class="p-3.5 bg-emerald-50/20 border-b border-emerald-900 text-xs grid grid-cols-2 gap-4">
        <div>
          <span class="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block mb-0.5">Customer / Party Details:</span>
          <div class="text-sm font-extrabold text-gray-900">${party?.name || 'Customer'}</div>
          <div class="text-gray-700 text-[11px] mt-0.5">
            ${party?.billingAddress?.line1 || ''} ${party?.billingAddress?.city ? ', ' + party?.billingAddress?.city : ''} ${party?.billingAddress?.state ? ', ' + party?.billingAddress?.state : ''}
          </div>
        </div>
        <div class="text-right space-y-0.5">
          <div><span class="font-semibold text-gray-600">GSTIN / UIN:</span> <b class="font-mono text-emerald-950 text-xs">${party?.gstin || 'Unregistered'}</b></div>
          <div><span class="font-semibold text-gray-600">State / Place of Supply:</span> <b>${party?.placeOfSupply || party?.billingAddress?.state || 'Bihar'}</b></div>
          ${party?.phone ? `<div><span class="font-semibold text-gray-600">Phone:</span> ${party.phone}</div>` : ''}
        </div>
      </div>

      <!-- 3. Key Aggregated Summary Metrics Cards -->
      <div class="p-3 bg-gray-50/80 border-b border-emerald-900 grid grid-cols-4 gap-2.5 text-center">
        <div class="p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div class="text-[9px] uppercase font-bold text-gray-500">Invoices Count</div>
          <div class="text-base font-black font-mono text-gray-900 mt-0.5">${summary.invoiceCount || 0}</div>
        </div>
        <div class="p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div class="text-[9px] uppercase font-bold text-gray-500">Total Taxable Value</div>
          <div class="text-base font-black font-mono text-emerald-900 mt-0.5">₹${Number(summary.totalTaxable || 0).toFixed(2)}</div>
        </div>
        <div class="p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div class="text-[9px] uppercase font-bold text-gray-500">Total Tax Collected</div>
          <div class="text-base font-black font-mono text-emerald-900 mt-0.5">₹${Number(summary.totalTax || 0).toFixed(2)}</div>
        </div>
        <div class="p-2 bg-emerald-100/60 rounded-lg border border-emerald-300 shadow-sm">
          <div class="text-[9px] uppercase font-black text-emerald-950">Grand Total Value</div>
          <div class="text-base font-black font-mono text-emerald-950 mt-0.5">₹${Number(summary.grandTotal || 0).toFixed(2)}</div>
        </div>
      </div>

      <!-- 4. Detailed Invoices Table -->
      <div class="flex-1 overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-emerald-900 text-white text-[9px] uppercase font-bold tracking-wider">
              <th class="p-2 text-center w-7 border-r border-emerald-800">#</th>
              <th class="p-2 border-r border-emerald-800">Invoice No</th>
              <th class="p-2 border-r border-emerald-800">Date</th>
              <th class="p-2 border-r border-emerald-800">Place of Supply</th>
              <th class="p-2 text-right border-r border-emerald-800">Taxable (₹)</th>
              <th class="p-2 text-right border-r border-emerald-800">CGST (₹)</th>
              <th class="p-2 text-right border-r border-emerald-800">SGST (₹)</th>
              <th class="p-2 text-right border-r border-emerald-800">IGST (₹)</th>
              <th class="p-2 text-right border-r border-emerald-800">Tax (₹)</th>
              <th class="p-2 text-right border-r border-emerald-800">RoundOff</th>
              <th class="p-2 text-right border-r border-emerald-800">Grand Total (₹)</th>
              <th class="p-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceRows || '<tr><td colspan="12" class="p-6 text-center text-gray-500">No invoices recorded in this period.</td></tr>'}
          </tbody>
          <tfoot>
            <tr class="bg-emerald-100/80 font-black text-[10px] border-t-2 border-emerald-900 text-emerald-950">
              <td colspan="4" class="p-2 text-right uppercase">Summary Totals:</td>
              <td class="p-2 text-right font-mono">₹${Number(summary.totalTaxable || 0).toFixed(2)}</td>
              <td class="p-2 text-right font-mono">₹${Number(summary.totalCgst || 0).toFixed(2)}</td>
              <td class="p-2 text-right font-mono">₹${Number(summary.totalSgst || 0).toFixed(2)}</td>
              <td class="p-2 text-right font-mono">₹${Number(summary.totalIgst || 0).toFixed(2)}</td>
              <td class="p-2 text-right font-mono">₹${Number(summary.totalTax || 0).toFixed(2)}</td>
              <td class="p-2 text-right font-mono">₹${Number(summary.totalRoundOff || 0).toFixed(2)}</td>
              <td class="p-2 text-right font-mono font-black text-sm">₹${Number(summary.grandTotal || 0).toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Pinned Footer -->
    <div class="avoid-break bg-white border-t border-emerald-900">
      <div class="p-3 bg-emerald-900 text-white flex justify-between items-center text-[10px]">
        <span>Computer Generated GST Statement — Certified True & Correct</span>
        <span class="font-bold">For ${company.tradeName || company.legalName}</span>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate genuine PDF Buffer for Customer GST Summary Report
   */
  public static async generateCustomerGstReportPdfBuffer(
    summary: any,
    party: any,
    company: ICompany,
    dateRangeLabel: string = 'All Time'
  ): Promise<Buffer> {
    const htmlContent = await this.renderCustomerGstReportHtml(summary, party, company, dateRangeLabel);
    return await this.generatePdfBuffer(htmlContent, { format: 'A4', printBackground: true });
  }

  /**
   * Render HTML for Supplier Purchase & ITC Summary Report (A4 Layout)
   */
  public static async renderSupplierItcReportHtml(
    summary: any,
    party: any,
    company: ICompany,
    dateRangeLabel: string = 'All Time'
  ): Promise<string> {
    const purchases: any[] = summary.purchases || [];
    const purchaseRows = purchases
      .map((p, idx) => {
        const pDate = p.date ? new Date(p.date).toLocaleDateString('en-IN') : '—';
        const taxable = Number(p.totalTaxable ?? 0);
        const cgst = Number(p.cgstTotal ?? 0);
        const sgst = Number(p.sgstTotal ?? 0);
        const igst = Number(p.igstTotal ?? 0);
        const totalItc = cgst + sgst + igst + Number(p.cessTotal || 0);
        const roundOff = Number(p.roundOff || 0);
        const grandTotal = Number(p.grandTotal || 0);

        return `
        <tr class="border-b border-gray-200 ${idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'} text-[10px] leading-tight">
          <td class="p-2 text-center text-gray-700 font-semibold border-r border-gray-200">${idx + 1}</td>
          <td class="p-2 font-bold font-mono text-slate-900 border-r border-gray-200">${p.billNumber}</td>
          <td class="p-2 font-mono text-indigo-950 font-semibold border-r border-gray-200">${p.supplierInvoiceNumber}</td>
          <td class="p-2 font-mono text-gray-800 border-r border-gray-200">${pDate}</td>
          <td class="p-2 text-right font-mono font-semibold text-gray-900 border-r border-gray-200">₹${taxable.toFixed(2)}</td>
          <td class="p-2 text-right font-mono text-gray-700 border-r border-gray-200">₹${cgst.toFixed(2)}</td>
          <td class="p-2 text-right font-mono text-gray-700 border-r border-gray-200">₹${sgst.toFixed(2)}</td>
          <td class="p-2 text-right font-mono text-gray-700 border-r border-gray-200">₹${igst.toFixed(2)}</td>
          <td class="p-2 text-right font-mono font-bold text-indigo-900 border-r border-gray-200">₹${totalItc.toFixed(2)}</td>
          <td class="p-2 text-right font-mono text-gray-600 border-r border-gray-200">₹${roundOff.toFixed(2)}</td>
          <td class="p-2 text-right font-mono font-black text-slate-950 border-r border-gray-200">₹${grandTotal.toFixed(2)}</td>
          <td class="p-2 text-center font-bold text-[9px]">
            <span class="px-1.5 py-0.5 rounded ${p.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
              ${p.paymentStatus || 'Unpaid'}
            </span>
          </td>
        </tr>
        `;
      })
      .join('');

    const formattedGeneratedDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Purchase & ITC Summary - ${party?.name || 'Supplier'}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { 
      size: A4 portrait; 
      margin: 8mm; 
    }
    * {
      box-sizing: border-box;
    }
    html, body { 
      margin: 0;
      padding: 0;
      width: 100%;
      background: #fff;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif; 
      color: #111827; 
      font-size: 11px;
    }
    .report-card {
      width: 100%;
      min-height: calc(297mm - 16mm);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      background: #fff;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    @media screen {
      body {
        background: #f1f5f9;
      }
      .report-card {
        max-width: 210mm;
        margin: 20px auto 40px auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        border: 2px solid #334155;
        border-radius: 8px;
        overflow: hidden;
      }
    }

    @media print {
      body { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
        background: #fff !important; 
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print, #preview-action-toolbar { 
        display: none !important; 
      }
      .report-card {
        width: 100% !important;
        min-height: calc(297mm - 16mm) !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        box-shadow: none !important;
        border: 2px solid #334155 !important;
        border-radius: 0 !important;
        margin: 0 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body class="p-0 bg-white text-gray-900 w-full">
  <div class="report-card w-full border-2 border-slate-800 rounded-xl overflow-hidden bg-white shadow-none">
    <div class="flex-1 flex flex-col">
      <!-- 1. Header Banner (NO Business Logo - Internal Audit Format) -->
      <div class="p-4 bg-slate-100 border-b-2 border-slate-800 flex justify-between items-center gap-4">
        <div class="flex-1 min-w-0">
          <div class="inline-block bg-slate-800 text-white font-black px-3 py-1 text-[11px] rounded uppercase tracking-wider mb-1">
            INTERNAL AUDIT & ITC RECONCILIATION
          </div>
          <h1 class="text-xl font-black text-slate-900 uppercase tracking-tight break-words">
            ${company.tradeName || company.legalName}
          </h1>
          <p class="text-xs text-gray-800 font-medium">
            ${company.address?.line1 || ''}, ${company.address?.city || ''}, ${company.address?.state || ''} - <b>${company.address?.pincode || ''}</b>
          </p>
          <div class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-900">
            <span><b>Company GSTIN:</b> <span class="font-mono text-slate-900 font-bold">${company.gstin || 'UNREGISTERED'}</span></span>
            <span><b>PAN:</b> <span class="font-mono font-bold">${company.pan || 'N/A'}</span></span>
          </div>
        </div>

        <div class="text-right shrink-0 w-[220px]">
          <div class="inline-block bg-indigo-950 text-white font-black px-3 py-1 text-[11px] rounded uppercase tracking-wider shadow-sm">
            PURCHASE & ITC SUMMARY
          </div>
          <div class="text-[10px] font-bold text-slate-700 uppercase tracking-wide mt-1">
            Inward Supplies (GSTR-3B)
          </div>
          <div class="mt-1.5 bg-white p-2 rounded border border-slate-300 text-xs text-left shadow-sm space-y-0.5">
            <div><span class="text-gray-500 font-semibold">Period:</span> <b class="text-slate-900">${dateRangeLabel}</b></div>
            <div><span class="text-gray-500 font-semibold">Generated:</span> <b class="text-gray-900 text-[10px]">${formattedGeneratedDate}</b></div>
          </div>
        </div>
      </div>

      <!-- 2. Supplier Profile Box -->
      <div class="p-3.5 bg-slate-50 border-b border-slate-800 text-xs grid grid-cols-2 gap-4">
        <div>
          <span class="text-[10px] font-bold text-slate-800 uppercase tracking-wider block mb-0.5">Supplier / Vendor Details:</span>
          <div class="text-sm font-extrabold text-gray-900">${party?.name || 'Supplier'}</div>
          <div class="text-gray-700 text-[11px] mt-0.5">
            ${party?.billingAddress?.line1 || ''} ${party?.billingAddress?.city ? ', ' + party?.billingAddress?.city : ''} ${party?.billingAddress?.state ? ', ' + party?.billingAddress?.state : ''}
          </div>
        </div>
        <div class="text-right space-y-0.5">
          <div><span class="font-semibold text-gray-600">Supplier GSTIN:</span> <b class="font-mono text-slate-950 text-xs">${party?.gstin || 'Unregistered'}</b></div>
          <div><span class="font-semibold text-gray-600">Place of Supply:</span> <b>${party?.placeOfSupply || party?.billingAddress?.state || 'Bihar'}</b></div>
          ${party?.phone ? `<div><span class="font-semibold text-gray-600">Phone:</span> ${party.phone}</div>` : ''}
        </div>
      </div>

      <!-- 3. Key Aggregated Summary Metrics Cards -->
      <div class="p-3 bg-gray-50/80 border-b border-slate-800 grid grid-cols-4 gap-2.5 text-center">
        <div class="p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div class="text-[9px] uppercase font-bold text-gray-500">Purchase Bills</div>
          <div class="text-base font-black font-mono text-gray-900 mt-0.5">${summary.billCount || 0}</div>
        </div>
        <div class="p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div class="text-[9px] uppercase font-bold text-gray-500">Taxable Purchases</div>
          <div class="text-base font-black font-mono text-indigo-950 mt-0.5">₹${Number(summary.totalTaxable || 0).toFixed(2)}</div>
        </div>
        <div class="p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div class="text-[9px] uppercase font-bold text-gray-500">Eligible Input Tax Credit</div>
          <div class="text-base font-black font-mono text-indigo-900 mt-0.5">₹${Number(summary.totalTax || 0).toFixed(2)}</div>
        </div>
        <div class="p-2 bg-slate-100 rounded-lg border border-slate-300 shadow-sm">
          <div class="text-[9px] uppercase font-black text-slate-900">Total Inward Bill Value</div>
          <div class="text-base font-black font-mono text-slate-950 mt-0.5">₹${Number(summary.grandTotal || 0).toFixed(2)}</div>
        </div>
      </div>

      <!-- 4. Detailed Purchases Table -->
      <div class="flex-1 overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-800 text-white text-[9px] uppercase font-bold tracking-wider">
              <th class="p-2 text-center w-7 border-r border-slate-700">#</th>
              <th class="p-2 border-r border-slate-700">Bill #</th>
              <th class="p-2 border-r border-slate-700">Supplier Inv #</th>
              <th class="p-2 border-r border-slate-700">Date</th>
              <th class="p-2 text-right border-r border-slate-700">Taxable (₹)</th>
              <th class="p-2 text-right border-r border-slate-700">Input CGST (₹)</th>
              <th class="p-2 text-right border-r border-slate-700">Input SGST (₹)</th>
              <th class="p-2 text-right border-r border-slate-700">Input IGST (₹)</th>
              <th class="p-2 text-right border-r border-slate-700">Total ITC (₹)</th>
              <th class="p-2 text-right border-r border-slate-700">RoundOff</th>
              <th class="p-2 text-right border-r border-slate-700">Grand Total (₹)</th>
              <th class="p-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            ${purchaseRows || '<tr><td colspan="12" class="p-6 text-center text-gray-500">No purchase records found in this period.</td></tr>'}
          </tbody>
          <tfoot>
            <tr class="bg-slate-100 font-black text-[10px] border-t-2 border-slate-800 text-slate-900">
              <td colspan="4" class="p-2 text-right uppercase">Summary Totals:</td>
              <td class="p-2 text-right font-mono">₹${Number(summary.totalTaxable || 0).toFixed(2)}</td>
              <td class="p-2 text-right font-mono">₹${Number(summary.totalCgst || 0).toFixed(2)}</td>
              <td class="p-2 text-right font-mono">₹${Number(summary.totalSgst || 0).toFixed(2)}</td>
              <td class="p-2 text-right font-mono">₹${Number(summary.totalIgst || 0).toFixed(2)}</td>
              <td class="p-2 text-right font-mono font-bold text-indigo-900">₹${Number(summary.totalTax || 0).toFixed(2)}</td>
              <td class="p-2 text-right font-mono">₹${Number(summary.totalRoundOff || 0).toFixed(2)}</td>
              <td class="p-2 text-right font-mono font-black text-sm">₹${Number(summary.grandTotal || 0).toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Pinned Footer -->
    <div class="avoid-break bg-white border-t border-slate-800">
      <div class="p-3 bg-slate-800 text-white flex justify-between items-center text-[10px]">
        <span>Internal Purchase & ITC Reconciliation Statement for GSTR-3B Table 4</span>
        <span class="font-mono">Audited & Verified</span>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate genuine PDF Buffer for Supplier Purchase & ITC Summary Report
   */
  public static async generateSupplierItcReportPdfBuffer(
    summary: any,
    party: any,
    company: ICompany,
    dateRangeLabel: string = 'All Time'
  ): Promise<Buffer> {
    const htmlContent = await this.renderSupplierItcReportHtml(summary, party, company, dateRangeLabel);
    return await this.generatePdfBuffer(htmlContent, { format: 'A4', printBackground: true });
  }
}

