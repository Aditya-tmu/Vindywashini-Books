import { getRepositories } from '../repositories/factory';
import { INDIAN_STATES } from '../config/constants';

export interface GSTR1Data {
  period: string; // e.g. "072025" or "2025-07"
  gstin: string;
  fp: string; // Financial period MMYYYY
  version: string;
  b2b: any[];
  b2cl: any[];
  b2cs: any[];
  cdnr: any[];
  cdnur: any[];
  exp: any[];
  at: any[];
  exemp: any[];
  hsn_b2b: any[];
  hsn_b2c: any[];
  docs: any[];
  summary: {
    totalInvoices: number;
    totalTaxable: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    totalCess: number;
    totalValue: number;
  };
}

export class GSTEngine {
  /**
   * Helper to format date as DD-Mon-YY or DD-MM-YYYY
   */
  public static formatDateGSTR(dateInput: Date | string): string {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(d.getDate()).padStart(2, '0');
    const mon = months[d.getMonth()];
    const yr = String(d.getFullYear()).slice(-2);
    return `${day}-${mon}-${yr}`;
  }

  /**
   * Format POS code with name: e.g. "10-Bihar"
   */
  public static formatPOS(posInput: string): string {
    if (!posInput) return '10-Bihar';
    if (posInput.includes('-')) return posInput;
    const stateObj = INDIAN_STATES[posInput];
    return stateObj ? `${stateObj.code}-${stateObj.name}` : posInput;
  }

  /**
   * Generate GSTR-1 Data Buckets from Invoices & Vouchers for a period
   */
  public static async generateGSTR1(
    companyId: string,
    period: string // "YYYY-MM" or "YYYY-Q1"
  ): Promise<GSTR1Data> {
    const repos = getRepositories();
    const company = await repos.companies.findById(companyId);
    if (!company) throw new Error('Company not found');

    let startDate: Date;
    let endDate: Date;

    if (period.includes('-Q')) {
      const [yearStr, qStr] = period.split('-Q');
      const yr = parseInt(yearStr);
      const q = parseInt(qStr);
      const startMonth = (q - 1) * 3;
      startDate = new Date(yr, startMonth, 1);
      endDate = new Date(yr, startMonth + 3, 0, 23, 59, 59, 999);
    } else {
      const [yearStr, monthStr] = period.split('-');
      const yr = parseInt(yearStr);
      const mo = parseInt(monthStr) - 1;
      startDate = new Date(yr, mo, 1);
      endDate = new Date(yr, mo + 1, 0, 23, 59, 59, 999);
    }

    const companyGstin = company.gstin || '';
    const companyStateCode = company.address.stateCode || '10';

    const allVouchers = await repos.vouchers.findByCompany(companyId, { status: 'Posted' });
    const vouchers = allVouchers.filter((v) => {
      const vTime = new Date(v.date).getTime();
      return (
        vTime >= startDate.getTime() &&
        vTime <= endDate.getTime() &&
        ['Sales', 'Credit Note', 'Debit Note', 'CreditNote', 'DebitNote'].includes(v.voucherType)
      );
    });

    vouchers.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const b2bList: any[] = [];
    const b2clList: any[] = [];
    const b2csMap = new Map<string, any>();
    const cdnrList: any[] = [];
    const cdnurList: any[] = [];
    const expList: any[] = [];
    const hsnB2bMap = new Map<string, any>();
    const hsnB2cMap = new Map<string, any>();

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalCess = 0;
    let totalValue = 0;

    let minSalesDocNum = '';
    let maxSalesDocNum = '';
    let salesCount = 0;

    let minCNDocNum = '';
    let maxCNDocNum = '';
    let cnCount = 0;

    for (const v of vouchers) {
      const isSales = v.voucherType === 'Sales';
      const isCreditNote = (v.voucherType as string) === 'Credit Note' || (v.voucherType as string) === 'CreditNote';
      const isDebitNote = (v.voucherType as string) === 'Debit Note' || (v.voucherType as string) === 'DebitNote';

      if (isSales) {
        salesCount++;
        if (!minSalesDocNum) minSalesDocNum = v.voucherNumber;
        maxSalesDocNum = v.voucherNumber;
      } else if (isCreditNote || isDebitNote) {
        cnCount++;
        if (!minCNDocNum) minCNDocNum = v.voucherNumber;
        maxCNDocNum = v.voucherNumber;
      }

      const hasGstin = Boolean(v.partyGstin && v.partyGstin.trim().length === 15);
      const pos = this.formatPOS(v.placeOfSupply || `${companyStateCode}-${company.address.state}`);
      const posCode = pos.substring(0, 2);
      const isInterState = posCode !== companyStateCode;
      const invoiceVal = v.totalAmount || 0;

      totalTaxable += v.totalTaxable || 0;
      totalCgst += v.cgstTotal || 0;
      totalSgst += v.sgstTotal || 0;
      totalIgst += v.igstTotal || 0;
      totalCess += v.cessTotal || 0;
      totalValue += invoiceVal;

      const items =
        v.items && v.items.length > 0
          ? v.items
          : [
              {
                name: 'General Supply',
                hsnCode: '9983',
                uqc: 'OTH',
                quantity: 1,
                taxableValue: v.totalTaxable || invoiceVal,
                gstRate: isInterState ? (v.igstTotal && v.igstTotal > 0 ? 18 : 0) : (v.cgstTotal && v.cgstTotal > 0 ? 18 : 0),
                cgstAmount: v.cgstTotal || 0,
                sgstAmount: v.sgstTotal || 0,
                igstAmount: v.igstTotal || 0,
                cessAmount: v.cessTotal || 0,
                total: invoiceVal,
              },
            ];

      if (isSales) {
        if (hasGstin) {
          for (const it of items) {
            b2bList.push({
              gstin: v.partyGstin,
              receiverName: v.partyName || 'Registered Buyer',
              invoiceNumber: v.voucherNumber,
              invoiceDate: this.formatDateGSTR(v.date),
              invoiceValue: invoiceVal,
              placeOfSupply: pos,
              reverseCharge: 'N',
              applicableTaxRate: '',
              invoiceType: 'Regular',
              eCommerceGstin: '',
              rate: it.gstRate,
              taxableValue: it.taxableValue,
              cessAmount: it.cessAmount || 0,
            });

            const hsnKey = `${it.hsnCode || '9983'}_${it.gstRate}`;
            const existing = hsnB2bMap.get(hsnKey) || {
              hsn: it.hsnCode || '9983',
              description: it.name || 'Goods/Services',
              uqc: it.uqc || 'PCS',
              totalQuantity: 0,
              totalValue: 0,
              taxableValue: 0,
              integratedTaxAmount: 0,
              centralTaxAmount: 0,
              stateTaxAmount: 0,
              cessAmount: 0,
              rate: it.gstRate,
            };
            existing.totalQuantity += it.quantity || 1;
            existing.totalValue += it.total || it.taxableValue;
            existing.taxableValue += it.taxableValue;
            existing.integratedTaxAmount += it.igstAmount || 0;
            existing.centralTaxAmount += it.cgstAmount || 0;
            existing.stateTaxAmount += it.sgstAmount || 0;
            existing.cessAmount += it.cessAmount || 0;
            hsnB2bMap.set(hsnKey, existing);
          }
        } else {
          if (isInterState && invoiceVal > 250000) {
            for (const it of items) {
              b2clList.push({
                invoiceNumber: v.voucherNumber,
                invoiceDate: this.formatDateGSTR(v.date),
                invoiceValue: invoiceVal,
                placeOfSupply: pos,
                applicableTaxRate: '',
                rate: it.gstRate,
                taxableValue: it.taxableValue,
                cessAmount: it.cessAmount || 0,
                eCommerceGstin: '',
              });
            }
          } else {
            for (const it of items) {
              const b2csKey = `${pos}_${it.gstRate}_${isInterState ? 'INTER' : 'OE'}`;
              const existing = b2csMap.get(b2csKey) || {
                type: isInterState ? 'INTER' : 'OE',
                placeOfSupply: pos,
                rate: it.gstRate,
                applicableTaxRate: '',
                taxableValue: 0,
                cessAmount: 0,
                eCommerceGstin: '',
              };
              existing.taxableValue += it.taxableValue;
              existing.cessAmount += it.cessAmount || 0;
              b2csMap.set(b2csKey, existing);
            }
          }
        }
      }
    }

    const docs = [];
    if (salesCount > 0) {
      docs.push({
        natureOfDocument: 'Invoices for outward supply',
        srNoFrom: minSalesDocNum,
        srNoTo: maxSalesDocNum,
        totalNumber: salesCount,
        cancelled: 0,
      });
    }

    return {
      period,
      gstin: companyGstin,
      fp: period.replace('-', ''),
      version: 'GSTR1_V2.2',
      b2b: b2bList,
      b2cl: b2clList,
      b2cs: Array.from(b2csMap.values()),
      cdnr: cdnrList,
      cdnur: cdnurList,
      exp: expList,
      at: [],
      exemp: [],
      hsn_b2b: Array.from(hsnB2bMap.values()),
      hsn_b2c: Array.from(hsnB2cMap.values()),
      docs,
      summary: {
        totalInvoices: vouchers.length,
        totalTaxable: Math.round(totalTaxable * 100) / 100,
        totalCgst: Math.round(totalCgst * 100) / 100,
        totalSgst: Math.round(totalSgst * 100) / 100,
        totalIgst: Math.round(totalIgst * 100) / 100,
        totalCess: Math.round(totalCess * 100) / 100,
        totalValue: Math.round(totalValue * 100) / 100,
      },
    };
  }

  /**
   * Convert GSTR1Data to government portal upload JSON
   */
  public static generateGSTR1PortalJson(gstr1Data: GSTR1Data): any {
    return {
      gstin: gstr1Data.gstin,
      fp: gstr1Data.fp,
      version: 'GSTR1_V2.2',
      b2b: gstr1Data.b2b,
      b2cl: gstr1Data.b2cl,
      b2cs: gstr1Data.b2cs,
      hsn: { data: [...gstr1Data.hsn_b2b, ...gstr1Data.hsn_b2c] },
      doc_issue: { doc_det: gstr1Data.docs },
    };
  }

  /**
   * Generate GSTR-3B Summary Report
   */
  public static async generateGSTR3B(companyId: string, period: string) {
    const gstr1 = await this.generateGSTR1(companyId, period);
    const repos = getRepositories();

    let startDate: Date;
    let endDate: Date;
    const [yearStr, monthStr] = period.split('-');
    const yr = parseInt(yearStr);
    const mo = parseInt(monthStr) - 1;
    startDate = new Date(yr, mo, 1);
    endDate = new Date(yr, mo + 1, 0, 23, 59, 59, 999);

    const allVouchers = await repos.vouchers.findByCompany(companyId, { status: 'Posted' });
    const purchaseVouchers = allVouchers.filter((v) => {
      const vTime = new Date(v.date).getTime();
      return vTime >= startDate.getTime() && vTime <= endDate.getTime() && v.voucherType === 'Purchase';
    });

    let itcTaxable = 0;
    let itcIgst = 0;
    let itcCgst = 0;
    let itcSgst = 0;
    let itcCess = 0;

    for (const pv of purchaseVouchers) {
      itcTaxable += pv.totalTaxable || 0;
      itcIgst += pv.igstTotal || 0;
      itcCgst += pv.cgstTotal || 0;
      itcSgst += pv.sgstTotal || 0;
      itcCess += pv.cessTotal || 0;
    }

    const table3_1 = {
      outwardTaxableSupplies: {
        totalTaxable: gstr1.summary.totalTaxable,
        igst: gstr1.summary.totalIgst,
        cgst: gstr1.summary.totalCgst,
        sgst: gstr1.summary.totalSgst,
        cess: gstr1.summary.totalCess,
      },
      outwardZeroRated: { totalTaxable: 0, igst: 0, cess: 0 },
      otherOutwardNilExempt: { totalTaxable: 0 },
      inwardReverseCharge: { totalTaxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 },
      nonGstOutward: { totalTaxable: 0 },
    };

    const table4 = {
      itcAvailable: {
        allOtherITC: {
          taxableValue: itcTaxable,
          igst: itcIgst,
          cgst: itcCgst,
          sgst: itcSgst,
          cess: itcCess,
        },
      },
      netITCAvailable: {
        igst: itcIgst,
        cgst: itcCgst,
        sgst: itcSgst,
        cess: itcCess,
      },
    };

    const taxPayable = {
      igst: Math.max(0, gstr1.summary.totalIgst - itcIgst),
      cgst: Math.max(0, gstr1.summary.totalCgst - itcCgst),
      sgst: Math.max(0, gstr1.summary.totalSgst - itcSgst),
      cess: Math.max(0, gstr1.summary.totalCess - itcCess),
    };

    return {
      period,
      gstin: gstr1.gstin,
      table3_1,
      table4,
      taxPayable,
      totalNetLiability: taxPayable.igst + taxPayable.cgst + taxPayable.sgst + taxPayable.cess,
    };
  }

  /**
   * GSTR-2B Reconciliation
   */
  public static async reconcileGSTR2B(
    companyId: string,
    period: string,
    portal2bRecords: Array<{
      gstin: string;
      tradeName?: string;
      invoiceNumber: string;
      invoiceDate: string;
      invoiceValue: number;
      taxableValue: number;
      igst: number;
      cgst: number;
      sgst: number;
      cess?: number;
    }>
  ) {
    const repos = getRepositories();
    let startDate: Date;
    let endDate: Date;
    const [yearStr, monthStr] = period.split('-');
    const yr = parseInt(yearStr);
    const mo = parseInt(monthStr) - 1;
    startDate = new Date(yr, mo, 1);
    endDate = new Date(yr, mo + 1, 0, 23, 59, 59, 999);

    const allPurchases = await repos.purchases.findByCompany(companyId);
    const purchaseBills = allPurchases.filter((p) => {
      const pTime = new Date(p.date).getTime();
      return pTime >= startDate.getTime() && pTime <= endDate.getTime();
    });

    const results: any[] = [];
    const matched2bIndices = new Set<number>();

    for (const pb of purchaseBills) {
      const pbGstin = (pb.supplierGstin || '').trim().toUpperCase();
      const pbInvNum = (pb.supplierInvoiceNumber || pb.billNumber || '').trim().toUpperCase();
      const pbTaxable = pb.totalTaxable || 0;
      const pbTax = (pb.cgstTotal || 0) + (pb.sgstTotal || 0) + (pb.igstTotal || 0);

      let matchedIndex = -1;
      for (let i = 0; i < portal2bRecords.length; i++) {
        if (matched2bIndices.has(i)) continue;
        const rec = portal2bRecords[i];
        const recGstin = (rec.gstin || '').trim().toUpperCase();
        const recInvNum = (rec.invoiceNumber || '').trim().toUpperCase();

        if (recGstin === pbGstin && recInvNum === pbInvNum) {
          matchedIndex = i;
          break;
        }
      }

      if (matchedIndex !== -1) {
        matched2bIndices.add(matchedIndex);
        const rec = portal2bRecords[matchedIndex];
        const portalTax = (rec.cgst || 0) + (rec.sgst || 0) + (rec.igst || 0);
        const diffTaxable = Math.round((pbTaxable - rec.taxableValue) * 100) / 100;
        const diffTax = Math.round((pbTax - portalTax) * 100) / 100;
        const isExact = Math.abs(diffTaxable) <= 1 && Math.abs(diffTax) <= 1;

        results.push({
          status: isExact ? 'MATCHED' : 'MISMATCHED',
          gstin: pbGstin,
          partyName: pb.supplierName,
          invoiceNumber: pbInvNum,
          invoiceDate: this.formatDateGSTR(pb.date),
          booksTaxable: pbTaxable,
          booksTax: pbTax,
          portalTaxable: rec.taxableValue,
          portalTax,
          diffTaxable,
          diffTax,
          actionRecommended: isExact ? 'Eligible for 100% ITC claim' : 'Review discrepancy with supplier invoice',
        });
      } else {
        results.push({
          status: 'IN_BOOKS_ONLY',
          gstin: pbGstin,
          partyName: pb.supplierName,
          invoiceNumber: pbInvNum,
          invoiceDate: this.formatDateGSTR(pb.date),
          booksTaxable: pbTaxable,
          booksTax: pbTax,
          portalTaxable: 0,
          portalTax: 0,
          diffTaxable: pbTaxable,
          diffTax: pbTax,
          actionRecommended: 'Supplier has not filed GSTR-1 yet. Follow up with supplier.',
        });
      }
    }

    const matchedCount = results.filter((r) => r.status === 'MATCHED').length;
    const mismatchedCount = results.filter((r) => r.status === 'MISMATCHED').length;

    return {
      period,
      summary: {
        totalRecords: results.length,
        matchedCount,
        mismatchedCount,
        matchedPercentage: results.length ? Math.round((matchedCount / results.length) * 100) : 0,
      },
      records: results,
    };
  }
}
