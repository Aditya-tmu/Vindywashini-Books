import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { GSTR1Data } from './gstEngine';

export class ExcelService {
  /**
   * Generates the multi-sheet GSTR-1 Excel workbook matching the Government Offline Utility template
   */
  public static async generateGSTR1Workbook(
    gstr1Data: GSTR1Data,
    outputDir: string
  ): Promise<{ filePath: string; filename: string }> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Vindywashini Books';
    workbook.lastModifiedBy = 'Vindywashini Books';
    workbook.created = new Date();
    workbook.modified = new Date();

    const headerStyle = {
      font: { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } } as ExcelJS.Fill,
      alignment: { vertical: 'middle' as const, horizontal: 'center' as const, wrapText: true },
      border: {
        top: { style: 'thin' as const, color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin' as const, color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin' as const, color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin' as const, color: { argb: 'FFCCCCCC' } },
      },
    };

    // 1. Sheet: b2b,sez,de
    const wsB2b = workbook.addWorksheet('b2b,sez,de');
    wsB2b.columns = [
      { header: 'GSTIN/UIN of Recipient', key: 'gstin', width: 18 },
      { header: 'Receiver Name', key: 'receiverName', width: 25 },
      { header: 'Invoice Number', key: 'invoiceNumber', width: 16 },
      { header: 'Invoice date', key: 'invoiceDate', width: 14 },
      { header: 'Invoice Value', key: 'invoiceValue', width: 15 },
      { header: 'Place Of Supply', key: 'placeOfSupply', width: 18 },
      { header: 'Reverse Charge', key: 'reverseCharge', width: 15 },
      { header: 'Applicable % of Tax Rate', key: 'applicableTaxRate', width: 22 },
      { header: 'Invoice Type', key: 'invoiceType', width: 14 },
      { header: 'E-Commerce GSTIN', key: 'eCommerceGstin', width: 18 },
      { header: 'Rate', key: 'rate', width: 10 },
      { header: 'Taxable Value', key: 'taxableValue', width: 15 },
      { header: 'Cess Amount', key: 'cessAmount', width: 14 },
    ];
    (gstr1Data.b2b || []).forEach((row) => wsB2b.addRow(row));

    // 2. Sheet: b2cl
    const wsB2cl = workbook.addWorksheet('b2cl');
    wsB2cl.columns = [
      { header: 'Invoice Number', key: 'invoiceNumber', width: 16 },
      { header: 'Invoice date', key: 'invoiceDate', width: 14 },
      { header: 'Invoice Value', key: 'invoiceValue', width: 15 },
      { header: 'Place Of Supply', key: 'placeOfSupply', width: 18 },
      { header: 'Applicable % of Tax Rate', key: 'applicableTaxRate', width: 22 },
      { header: 'Rate', key: 'rate', width: 10 },
      { header: 'Taxable Value', key: 'taxableValue', width: 15 },
      { header: 'Cess Amount', key: 'cessAmount', width: 14 },
      { header: 'E-Commerce GSTIN', key: 'eCommerceGstin', width: 18 },
    ];
    (gstr1Data.b2cl || []).forEach((row) => wsB2cl.addRow(row));

    // 3. Sheet: b2cs
    const wsB2cs = workbook.addWorksheet('b2cs');
    wsB2cs.columns = [
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Place Of Supply', key: 'placeOfSupply', width: 18 },
      { header: 'Rate', key: 'rate', width: 10 },
      { header: 'Applicable % of Tax Rate', key: 'applicableTaxRate', width: 22 },
      { header: 'Taxable Value', key: 'taxableValue', width: 15 },
      { header: 'Cess Amount', key: 'cessAmount', width: 14 },
      { header: 'E-Commerce GSTIN', key: 'eCommerceGstin', width: 18 },
    ];
    (gstr1Data.b2cs || []).forEach((row) => wsB2cs.addRow(row));

    // 4. Sheet: cdnr
    const wsCdnr = workbook.addWorksheet('cdnr');
    wsCdnr.columns = [
      { header: 'GSTIN/UIN of Recipient', key: 'gstin', width: 18 },
      { header: 'Receiver Name', key: 'receiverName', width: 25 },
      { header: 'Note Number', key: 'noteNumber', width: 16 },
      { header: 'Note Date', key: 'noteDate', width: 14 },
      { header: 'Note Type', key: 'noteType', width: 12 },
      { header: 'Place Of Supply', key: 'placeOfSupply', width: 18 },
      { header: 'Reverse Charge', key: 'reverseCharge', width: 15 },
      { header: 'Note Supply Type', key: 'noteSupplyType', width: 16 },
      { header: 'Note Value', key: 'noteValue', width: 15 },
      { header: 'Applicable % of Tax Rate', key: 'applicableTaxRate', width: 22 },
      { header: 'Rate', key: 'rate', width: 10 },
      { header: 'Taxable Value', key: 'taxableValue', width: 15 },
      { header: 'Cess Amount', key: 'cessAmount', width: 14 },
    ];
    (gstr1Data.cdnr || []).forEach((row) => wsCdnr.addRow(row));

    // 5. Sheet: cdnur
    const wsCdnur = workbook.addWorksheet('cdnur');
    wsCdnur.columns = [
      { header: 'UR Type', key: 'urType', width: 12 },
      { header: 'Note Number', key: 'noteNumber', width: 16 },
      { header: 'Note Date', key: 'noteDate', width: 14 },
      { header: 'Note Type', key: 'noteType', width: 12 },
      { header: 'Place Of Supply', key: 'placeOfSupply', width: 18 },
      { header: 'Note Value', key: 'noteValue', width: 15 },
      { header: 'Applicable % of Tax Rate', key: 'applicableTaxRate', width: 22 },
      { header: 'Rate', key: 'rate', width: 10 },
      { header: 'Taxable Value', key: 'taxableValue', width: 15 },
      { header: 'Cess Amount', key: 'cessAmount', width: 14 },
    ];
    (gstr1Data.cdnur || []).forEach((row) => wsCdnur.addRow(row));

    // 6. Sheet: exp
    const wsExp = workbook.addWorksheet('exp');
    wsExp.columns = [
      { header: 'Export Type', key: 'exportType', width: 15 },
      { header: 'Invoice Number', key: 'invoiceNumber', width: 16 },
      { header: 'Invoice date', key: 'invoiceDate', width: 14 },
      { header: 'Invoice Value', key: 'invoiceValue', width: 15 },
      { header: 'Port Code', key: 'portCode', width: 12 },
      { header: 'Shipping Bill Number', key: 'shippingBillNumber', width: 18 },
      { header: 'Shipping Bill Date', key: 'shippingBillDate', width: 16 },
      { header: 'Rate', key: 'rate', width: 10 },
      { header: 'Taxable Value', key: 'taxableValue', width: 15 },
      { header: 'Cess Amount', key: 'cessAmount', width: 14 },
    ];
    (gstr1Data.exp || []).forEach((row) => wsExp.addRow(row));

    // 7. Sheet: at
    const wsAt = workbook.addWorksheet('at');
    wsAt.columns = [
      { header: 'Place Of Supply', key: 'placeOfSupply', width: 18 },
      { header: 'Applicable % of Tax Rate', key: 'applicableTaxRate', width: 22 },
      { header: 'Rate', key: 'rate', width: 10 },
      { header: 'Gross Advance Received', key: 'grossAdvanceReceived', width: 22 },
      { header: 'Cess Amount', key: 'cessAmount', width: 14 },
    ];
    (gstr1Data.at || []).forEach((row) => wsAt.addRow(row));

    // 8. Sheet: exemp
    const wsExemp = workbook.addWorksheet('exemp');
    wsExemp.columns = [
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Nil Rated Supplies', key: 'nilRated', width: 18 },
      { header: 'Exempted (other than nil rated/non-GST)', key: 'exempted', width: 32 },
      { header: 'Non-GST Supplies', key: 'nonGst', width: 18 },
    ];
    (gstr1Data.exemp || []).forEach((row) => wsExemp.addRow(row));

    // 9. Sheet: hsn(b2b)
    const wsHsnB2b = workbook.addWorksheet('hsn(b2b)');
    wsHsnB2b.columns = [
      { header: 'HSN', key: 'hsn', width: 12 },
      { header: 'Description', key: 'description', width: 25 },
      { header: 'UQC', key: 'uqc', width: 10 },
      { header: 'Total Quantity', key: 'totalQuantity', width: 14 },
      { header: 'Total Value', key: 'totalValue', width: 15 },
      { header: 'Taxable Value', key: 'taxableValue', width: 15 },
      { header: 'Integrated Tax Amount', key: 'integratedTaxAmount', width: 20 },
      { header: 'Central Tax Amount', key: 'centralTaxAmount', width: 18 },
      { header: 'State/UT Tax Amount', key: 'stateTaxAmount', width: 18 },
      { header: 'Cess Amount', key: 'cessAmount', width: 14 },
      { header: 'Rate', key: 'rate', width: 10 },
    ];
    (gstr1Data.hsn_b2b || []).forEach((row) => wsHsnB2b.addRow(row));

    // 10. Sheet: hsn(b2c)
    const wsHsnB2c = workbook.addWorksheet('hsn(b2c)');
    wsHsnB2c.columns = [
      { header: 'HSN', key: 'hsn', width: 12 },
      { header: 'Description', key: 'description', width: 25 },
      { header: 'UQC', key: 'uqc', width: 10 },
      { header: 'Total Quantity', key: 'totalQuantity', width: 14 },
      { header: 'Total Value', key: 'totalValue', width: 15 },
      { header: 'Taxable Value', key: 'taxableValue', width: 15 },
      { header: 'Integrated Tax Amount', key: 'integratedTaxAmount', width: 20 },
      { header: 'Central Tax Amount', key: 'centralTaxAmount', width: 18 },
      { header: 'State/UT Tax Amount', key: 'stateTaxAmount', width: 18 },
      { header: 'Cess Amount', key: 'cessAmount', width: 14 },
      { header: 'Rate', key: 'rate', width: 10 },
    ];
    (gstr1Data.hsn_b2c || []).forEach((row) => wsHsnB2c.addRow(row));

    // 11. Sheet: docs
    const wsDocs = workbook.addWorksheet('docs');
    wsDocs.columns = [
      { header: 'Nature of Document', key: 'natureOfDocument', width: 30 },
      { header: 'Sr. No. From', key: 'srNoFrom', width: 16 },
      { header: 'Sr. No. To', key: 'srNoTo', width: 16 },
      { header: 'Total Number', key: 'totalNumber', width: 14 },
      { header: 'Cancelled', key: 'cancelled', width: 12 },
    ];
    (gstr1Data.docs || []).forEach((row) => wsDocs.addRow(row));

    // Style all header rows
    workbook.worksheets.forEach((ws) => {
      const headerRow = ws.getRow(1);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.font = headerStyle.font;
        cell.fill = headerStyle.fill;
        cell.alignment = headerStyle.alignment;
        cell.border = headerStyle.border;
      });
    });

    const filename = `GSTR1_Excel_Workbook_${gstr1Data.gstin || 'NO_GSTIN'}_${gstr1Data.fp}.xlsx`;
    const filePath = path.join(outputDir, filename);
    await workbook.xlsx.writeFile(filePath);

    return { filePath, filename };
  }

  /**
   * Generates individual official CSV files matching sample templates
   */
  public static generateGSTR1CsvFiles(
    gstr1Data: GSTR1Data,
    outputDir: string
  ): Array<{ filename: string; filePath: string; content: string }> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const files: Array<{ filename: string; filePath: string; content: string }> = [];

    const toCsvString = (headers: string[], rows: any[][]): string => {
      const headerLine = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',');
      const dataLines = rows.map((row) =>
        row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
      );
      return [headerLine, ...dataLines].join('\r\n');
    };

    // 1. b2b_sez_de.csv
    const b2bHeaders = [
      'GSTIN/UIN of Recipient',
      'Receiver Name',
      'Invoice Number',
      'Invoice date',
      'Invoice Value',
      'Place Of Supply',
      'Reverse Charge',
      'Applicable % of Tax Rate',
      'Invoice Type',
      'E-Commerce GSTIN',
      'Rate',
      'Taxable Value',
      'Cess Amount',
    ];
    const b2bRows = (gstr1Data.b2b || []).map((r) => [
      r.gstin,
      r.receiverName,
      r.invoiceNumber,
      r.invoiceDate,
      r.invoiceValue,
      r.placeOfSupply,
      r.reverseCharge,
      r.applicableTaxRate,
      r.invoiceType,
      r.eCommerceGstin,
      r.rate,
      r.taxableValue,
      r.cessAmount,
    ]);
    const b2bContent = toCsvString(b2bHeaders, b2bRows);
    const b2bPath = path.join(outputDir, 'b2b_sez_de.csv');
    fs.writeFileSync(b2bPath, b2bContent, 'utf8');
    files.push({ filename: 'b2b_sez_de.csv', filePath: b2bPath, content: b2bContent });

    // 2. b2cl.csv
    const b2clHeaders = [
      'Invoice Number',
      'Invoice date',
      'Invoice Value',
      'Place Of Supply',
      'Applicable % of Tax Rate',
      'Rate',
      'Taxable Value',
      'Cess Amount',
      'E-Commerce GSTIN',
    ];
    const b2clRows = (gstr1Data.b2cl || []).map((r) => [
      r.invoiceNumber,
      r.invoiceDate,
      r.invoiceValue,
      r.placeOfSupply,
      r.applicableTaxRate,
      r.rate,
      r.taxableValue,
      r.cessAmount,
      r.eCommerceGstin,
    ]);
    const b2clContent = toCsvString(b2clHeaders, b2clRows);
    const b2clPath = path.join(outputDir, 'b2cl.csv');
    fs.writeFileSync(b2clPath, b2clContent, 'utf8');
    files.push({ filename: 'b2cl.csv', filePath: b2clPath, content: b2clContent });

    // 3. b2cs.csv
    const b2csHeaders = [
      'Type',
      'Place Of Supply',
      'Rate',
      'Applicable % of Tax Rate',
      'Taxable Value',
      'Cess Amount',
      'E-Commerce GSTIN',
    ];
    const b2csRows = (gstr1Data.b2cs || []).map((r) => [
      r.type,
      r.placeOfSupply,
      r.rate,
      r.applicableTaxRate,
      r.taxableValue,
      r.cessAmount,
      r.eCommerceGstin,
    ]);
    const b2csContent = toCsvString(b2csHeaders, b2csRows);
    const b2csPath = path.join(outputDir, 'b2cs.csv');
    fs.writeFileSync(b2csPath, b2csContent, 'utf8');
    files.push({ filename: 'b2cs.csv', filePath: b2csPath, content: b2csContent });

    // 4. hsn_b2b_.csv
    const hsnHeaders = [
      'HSN',
      'Description',
      'UQC',
      'Total Quantity',
      'Total Value',
      'Taxable Value',
      'Integrated Tax Amount',
      'Central Tax Amount',
      'State/UT Tax Amount',
      'Cess Amount',
      'Rate',
    ];
    const hsnB2bRows = (gstr1Data.hsn_b2b || []).map((r) => [
      r.hsn,
      r.description,
      r.uqc,
      r.totalQuantity,
      r.totalValue,
      r.taxableValue,
      r.integratedTaxAmount,
      r.centralTaxAmount,
      r.stateTaxAmount,
      r.cessAmount,
      r.rate,
    ]);
    const hsnB2bContent = toCsvString(hsnHeaders, hsnB2bRows);
    const hsnB2bPath = path.join(outputDir, 'hsn_b2b_.csv');
    fs.writeFileSync(hsnB2bPath, hsnB2bContent, 'utf8');
    files.push({ filename: 'hsn_b2b_.csv', filePath: hsnB2bPath, content: hsnB2bContent });

    // 5. hsn_b2c_.csv
    const hsnB2cRows = (gstr1Data.hsn_b2c || []).map((r) => [
      r.hsn,
      r.description,
      r.uqc,
      r.totalQuantity,
      r.totalValue,
      r.taxableValue,
      r.integratedTaxAmount,
      r.centralTaxAmount,
      r.stateTaxAmount,
      r.cessAmount,
      r.rate,
    ]);
    const hsnB2cContent = toCsvString(hsnHeaders, hsnB2cRows);
    const hsnB2cPath = path.join(outputDir, 'hsn_b2c_.csv');
    fs.writeFileSync(hsnB2cPath, hsnB2cContent, 'utf8');
    files.push({ filename: 'hsn_b2c_.csv', filePath: hsnB2cPath, content: hsnB2cContent });

    // 6. docs.csv
    const docsHeaders = ['Nature of Document', 'Sr. No. From', 'Sr. No. To', 'Total Number', 'Cancelled'];
    const docsRows = (gstr1Data.docs || []).map((r) => [
      r.natureOfDocument,
      r.srNoFrom,
      r.srNoTo,
      r.totalNumber,
      r.cancelled,
    ]);
    const docsContent = toCsvString(docsHeaders, docsRows);
    const docsPath = path.join(outputDir, 'docs.csv');
    fs.writeFileSync(docsPath, docsContent, 'utf8');
    files.push({ filename: 'docs.csv', filePath: docsPath, content: docsContent });

    return files;
  }

  /**
   * Zip all GSTR-1 CSV files into a single zip archive
   */
  public static async createGSTR1CsvZip(
    gstr1Data: GSTR1Data,
    outputDir: string
  ): Promise<{ zipPath: string; filename: string }> {
    const csvFiles = this.generateGSTR1CsvFiles(gstr1Data, outputDir);
    const filename = `GSTR1_CSVs_${gstr1Data.gstin || 'NO_GSTIN'}_${gstr1Data.fp}.zip`;
    const zipPath = path.join(outputDir, filename);

    const zip = new AdmZip();
    csvFiles.forEach((file) => {
      zip.addLocalFile(file.filePath);
    });
    zip.writeZip(zipPath);

    return { zipPath, filename };
  }

  /**
   * Export Day Book / Ledger / Trial Balance to Excel
   */
  public static async exportGenericReportToExcel(
    title: string,
    headers: string[],
    rows: any[][],
    outputDir: string
  ): Promise<{ filePath: string; filename: string }> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Report');

    ws.addRow([title]);
    ws.getRow(1).font = { name: 'Arial', size: 14, bold: true };
    ws.addRow([`Generated on: ${new Date().toLocaleString('en-IN')}`]);
    ws.addRow([]); // Blank row

    const headerRow = ws.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    rows.forEach((r) => ws.addRow(r));

    // Auto-fit column widths
    ws.columns.forEach((col) => {
      col.width = 18;
    });

    const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const filename = `${safeTitle}_${Date.now()}.xlsx`;
    const filePath = path.join(outputDir, filename);
    await workbook.xlsx.writeFile(filePath);

    return { filePath, filename };
  }
}
