export interface HelpTopic {
  id: string;
  title: string;
  category: 'Vouchers' | 'Billing' | 'Purchases' | 'Banking & GST' | 'Inventory' | 'Reports' | 'General';
  summary: string;
  requiredFields: string[];
  commonErrors: Array<{ error: string; cause: string; solution: string }>;
  stepByStep: string[];
  markdownContent: string;
}

export const HELP_TOPICS: Record<string, HelpTopic> = {
  voucher: {
    id: 'voucher',
    title: 'Double-Entry Voucher Posting',
    category: 'Vouchers',
    summary:
      'Vouchers record financial transactions between ledger accounts according to Indian double-entry accounting rules.',
    requiredFields: [
      'Voucher Type (Payment, Receipt, Contra, Journal, etc.)',
      'Voucher Number (unique sequential series per FY)',
      'Voucher Date',
      'At least 2 Ledger line entries (at least one Debit and one Credit)',
      'Each entry must have a valid Ledger Account selected and Amount > 0',
      'Total Debit (Dr) MUST exactly equal Total Credit (Cr)',
    ],
    commonErrors: [
      {
        error: 'Voucher is not balanced / Post Voucher button does nothing',
        cause: 'Total Debit (Dr) amount does not match Total Credit (Cr) amount.',
        solution:
          'Check the "Total Dr" and "Total Cr" counter badges at the bottom right. Adjust the row amounts until the badge turns green ("Balanced ✓") with 0 difference.',
      },
      {
        error: 'Row has no Ledger Account selected',
        cause: 'One or more entry rows has an empty or unselected ledger dropdown.',
        solution:
          'Select a valid ledger account for every row, or click the Trash icon to remove any unused empty row.',
      },
      {
        error: 'Voucher # already exists for this Financial Year',
        cause: 'Duplicate voucher number was entered for the same type in this FY.',
        solution: 'Use the auto-generated number or enter a unique sequential voucher number (e.g., PAY/0002).',
      },
      {
        error: 'Financial Year is locked',
        cause: 'The voucher date falls in an audit-locked Financial Year.',
        solution: 'Navigate to Settings > Lock / Unlock FY and unlock the relevant financial year.',
      },
    ],
    stepByStep: [
      'Select the Voucher Type tab at the top (e.g. Payment for outward money, Receipt for inward money, Contra for Bank-to-Cash, Journal for adjustments).',
      'Verify the Voucher Number and Date.',
      'In the Accounting Entries section, select the Dr account and enter the amount.',
      'In the next row, select the Cr account and enter the matching amount.',
      'Add a brief descriptive Narration for audit reference.',
      'Click "Post Voucher" to commit to ledger balances, or "Save as Draft" if you want to finish later.',
    ],
    markdownContent: `
### Understanding Voucher Types
- **Payment Voucher (F5)**: Used for paying expenses, vendors, or cash withdrawals. (e.g. Dr Supplier / Office Expense, Cr Cash / Bank).
- **Receipt Voucher (F6)**: Used for receiving money from customers, debtors, or capital. (e.g. Dr Bank / Cash, Cr Customer).
- **Contra Voucher (F4)**: Used ONLY for internal cash-to-bank or bank-to-cash transfers. (e.g. Dr Bank Account, Cr Cash in Hand).
- **Journal Voucher (F7)**: Used for non-cash adjustment entries, depreciation, year-end adjustments, and rectifications.
- **Credit Note (F8)**: Issued to customers for sales returns or discounts.
- **Debit Note (F9)**: Issued to suppliers for purchase returns or price adjustments.

### Voiding / Cancelling Vouchers
If a voucher was posted in error, avoid hard-deleting it if your books are audited. Instead, use the **"Cancel"** action which keeps the voucher in the register as *Cancelled* and automatically generates reversing ledger entries to maintain a clean audit trail.
    `,
  },

  billing: {
    id: 'billing',
    title: 'Sales Invoicing & POS Terminal',
    category: 'Billing',
    summary:
      'Create GST-compliant tax invoices, retail cash memos, and thermal POS receipts for customers.',
    requiredFields: [
      'Customer details (Name, State / Place of Supply, GSTIN if registered)',
      'Invoice Number (auto-incremented or custom)',
      'Invoice Date',
      'At least 1 Line Item (Goods or Service) with Quantity > 0 and Rate > 0',
      'Payment Mode & Status (Cash, Credit, Bank, UPI)',
    ],
    commonErrors: [
      {
        error: 'Tax rate mismatch / GST calculation seems wrong',
        cause: 'Customer state does not match company state, triggering IGST instead of CGST+SGST.',
        solution:
          'If buyer is within the same state (Intra-state), tax splits into CGST 50% + SGST 50%. If buyer is in a different state (Inter-state), IGST 100% applies. Verify Place of Supply in header.',
      },
      {
        error: 'Blocked frame origin / Print preview error',
        cause: 'Browser or iframe cross-origin restriction when printing.',
        solution:
          'Use the built-in "Print / PDF" button which uses Electron native printing pipeline and eliminates cross-origin errors completely.',
      },
    ],
    stepByStep: [
      'Select billing layout: Standard A4/A5 or POS Thermal (80mm/58mm).',
      'Search and select a Customer from the dropdown or type a walk-in name. For new parties, use "Quick Add Customer".',
      'Add items from Item Master. HSN/SAC codes, tax rates, and rates auto-fill.',
      'Adjust quantities, discounts, or override rates if needed.',
      'Choose payment mode (Cash, Bank, UPI, or Credit for unpaid balance).',
      'Click "Save & Generate Invoice" to print or export PDF.',
    ],
    markdownContent: `
### GST Tax Engine Logic
- **Intra-State (Within State)**: CGST + SGST applied equally (e.g. 18% GST = 9% CGST + 9% SGST).
- **Inter-State (Outside State)**: IGST applied in full (e.g. 18% IGST).
- **Composition / URP**: Walk-in retail customers without GSTIN are marked as Unregistered Person (URP).
    `,
  },

  purchase: {
    id: 'purchase',
    title: 'Purchase Bill & Vendor Invoices',
    category: 'Purchases',
    summary:
      'Record inward purchase invoices from suppliers to increment inventory stock and claim Input Tax Credit (ITC).',
    requiredFields: [
      'Supplier (from Parties where type is Supplier or Both)',
      'Supplier Invoice Number (the bill number issued by vendor)',
      'Supplier Invoice Date',
      'Internal Purchase Bill Number',
      'Line Items with purchase rate, quantity, and HSN/SAC code',
    ],
    commonErrors: [
      {
        error: 'Supplier not listed in dropdown',
        cause: 'Party was saved only as a Customer rather than a Supplier.',
        solution:
          'Go to Parties Master and ensure the party type is set to "Supplier" or "Both", or click "+ Quick Add Supplier" directly on the Purchase page.',
      },
      {
        error: 'Service items increasing physical stock count',
        cause: 'Item type was set to Goods instead of Service.',
        solution:
          'Ensure service charges (e.g. Freight, POS rental, Consultancy) have Item Type = "Service" and SAC code, which bypasses inventory count.',
      },
    ],
    stepByStep: [
      'Open the Purchase Bill page from the top navigation.',
      'Select the Supplier. Their GSTIN, State, and contact details will auto-populate.',
      'Enter the vendor’s Supplier Invoice Number and Invoice Date.',
      'Add line items. If a product is new, click "Inline Add Item" to register its name and HSN code immediately.',
      'Verify taxable amounts and Input CGST/SGST/IGST.',
      'Click "Save Purchase Bill". Stock will automatically increase and Input Tax Credit is queued for GSTR-3B.',
    ],
    markdownContent: `
### Sales vs Purchase Bills
- **Sales Invoices**: Customer-facing tax documents printed with your company logo, bank UPI QR, and terms.
- **Purchase Bills**: Internal audit documents formatted without company logo, documenting inward goods for tax and ledger reconciliation.
    `,
  },

  bank_charges: {
    id: 'bank_charges',
    title: 'Bank & POS Charges (MDR & ITC)',
    category: 'Banking & GST',
    summary:
      'Record GST charged by banks, payment gateways, and POS swipe machine providers (SBI, Razorpay, Pine Labs, Paytm) to claim full Input Tax Credit.',
    requiredFields: [
      'Bank / POS Provider Name & GSTIN',
      'Period Covered (e.g. April 2026 Monthly Statement)',
      'MDR / Processing Fee (Taxable Value under SAC 997114)',
      'GST Charged by Bank (18% Input CGST/SGST or IGST)',
    ],
    commonErrors: [
      {
        error: 'GSTR-2B shows bank GST but books do not tally',
        cause: 'Bank automatically deducts MDR charges and files GST on your GSTIN, but you did not record a corresponding purchase voucher in your books.',
        solution:
          'Use the "Bank & Merchant Charges Quick Entry" on the Purchase page to log monthly bank GST invoices, which claims ITC and matches GSTR-2B perfectly.',
      },
    ],
    stepByStep: [
      'Download your monthly POS / Merchant GST Tax Invoice from your bank net-banking or POS provider portal.',
      'Open Purchase > "Quick Bank Charges".',
      'Select your Bank / Provider ledger (e.g. SBI Merchant Services, Razorpay, Pine Labs).',
      'Enter the monthly service fee under SAC 997114.',
      'Input the CGST/SGST or IGST from the bank’s tax invoice.',
      'Click "Post Bank Charges Entry". This credits the Bank and debits Bank Charges Expense + Input GST.',
    ],
    markdownContent: `
### Standard Banking SAC Codes
- **SAC 997114**: Financial intermediation services, merchant discount rate (MDR), POS terminal charges.
- **SAC 997159**: Other financial services, NEFT/RTGS/IMPS charges, annual maintenance fees.
- **GST Rate**: Universally 18% (9% CGST + 9% SGST for same-state bank branch, or 18% IGST for out-of-state payment gateway).
    `,
  },

  inventory: {
    id: 'inventory',
    title: 'Item Master (Goods & Services)',
    category: 'Inventory',
    summary:
      'Manage product catalog, HSN/SAC codes, pricing, stock levels, and service definitions.',
    requiredFields: [
      'Item Name',
      'Item Type ("Goods" for physical stock or "Service" for billable labor/fees)',
      'HSN Code (Goods) or SAC Code (Service)',
      'GST Rate (0%, 5%, 12%, 18%, 28%)',
      'Unit of Measurement (UQC, e.g. PCS, KGS, BOX)',
      'Sale Rate & Purchase Rate',
    ],
    commonErrors: [
      {
        error: 'Invalid HSN/SAC Code',
        cause: 'HSN codes must be 4, 6, or 8 digits; SAC codes are typically 6 digits starting with 99.',
        solution: 'Use the built-in HSN/SAC picker or search the master database.',
      },
    ],
    stepByStep: [
      'Open Inventory View.',
      'Click "+ Add Item".',
      'Select Item Type: choose "Goods" for inventory items or "Service" for consulting/machine rental/labor.',
      'Enter Name, HSN/SAC code, GST rate, and rates.',
      'Set Reorder Level to get automated dashboard alerts when stock runs low.',
      'Save item.',
    ],
    markdownContent: `
### Goods vs Services in Vindywashini Books
- **Goods**: Tracked in real-time. Sales decrement stock, purchases increment stock. Appears in Stock Summary and valuation.
- **Services**: Zero stock tracking. Rate and GST apply on bills without adjusting warehouse physical quantities.
    `,
  },

  gst: {
    id: 'gst',
    title: 'GST Reports & GSTR-1 / 3B Filing',
    category: 'Reports',
    summary:
      'Generate monthly/quarterly GST returns, GSTR-1 B2B/B2C sheets, and GSTR-3B tax summaries.',
    requiredFields: ['Financial Year & Tax Period (Month/Quarter)', 'Active Company with valid GSTIN'],
    commonErrors: [
      {
        error: 'B2B invoice missing in GSTR-1',
        cause: 'Customer had no GSTIN entered or GSTIN format was invalid.',
        solution:
          'Ensure B2B customers have a valid 15-character GSTIN. Invoices to customers without GSTIN automatically route to B2CS (B2C Small).',
      },
    ],
    stepByStep: [
      'Navigate to GST Portal from navigation.',
      'Select tax period month and year.',
      'Review GSTR-1 summary tabs (B2B, B2CL, B2CS, CDNR, HSN Summary).',
      'Export official Excel workbook or direct JSON format for upload to the GST Portal.',
    ],
    markdownContent: `
### Return Types
- **GSTR-1**: Statement of outward supplies (sales).
- **GSTR-2B**: Static auto-drafted ITC statement from suppliers.
- **GSTR-3B**: Monthly summary return for payment of net tax (Outward Tax minus Input Tax Credit).
    `,
  },

  database: {
    id: 'database',
    title: 'Database Setup (Supabase / MongoDB)',
    category: 'General',
    summary:
      'Configure cloud database providers (Supabase PostgreSQL, MongoDB Atlas, AWS DocumentDB) or offline local MongoDB storage.',
    requiredFields: [
      'Database Provider Selection (Supabase / Atlas / AWS / Local)',
      'Host or SRV Domain',
      'Username & Password (auto-encoded by Credential Wizard)',
      'Database Name',
      'SSL / TLS Mode Enabled for Cloud Databases',
    ],
    commonErrors: [
      {
        error: 'Could not connect to Supabase: getaddrinfo ENOTFOUND or Network Timeout',
        cause:
          'You are using Supabase Direct Connection host (db.<project-ref>.supabase.co), which is IPv6-only and is not routed on most standard home/office internet connections.',
        solution:
          'Switch to Supabase Session Pooler in Settings > Database Setup. In Supabase Dashboard, go to Connect (top bar) > Session Pooler tab. Use Host: aws-0-<region>.pooler.supabase.com, Port: 5432, User: postgres.<project-ref>. This connects over dual-stack IPv4.',
      },
      {
        error: 'Invalid Credentials or URI syntax error with @, #, $, or % in password',
        cause: 'Special characters in the password break URI parsing if not URL-encoded.',
        solution:
          'Use the "Credential Wizard" tab in Settings > Database. The wizard automatically encodes all reserved characters (e.g. @ becomes %40).',
      },
      {
        error: 'Transaction Pooler (Port 6543) causing query restrictions',
        cause: 'Port 6543 enables transaction pooling mode which restricts session-level features and prepared statements.',
        solution: 'Always use Port 5432 (Session Pooler mode) for standard desktop accounting applications.',
      },
    ],
    stepByStep: [
      'Open Settings > Database Setup tab.',
      'Select your provider: Supabase / PostgreSQL (Cloud), MongoDB Atlas (Cloud), AWS DocumentDB, or Local MongoDB (Offline).',
      'For Supabase, open your Supabase Dashboard, click Connect (top of project page), and switch to the "Session Pooler" tab.',
      'Copy the Session Pooler Host (e.g. aws-0-ap-northeast-1.pooler.supabase.com) and User (postgres.<your-project-ref>).',
      'Enter your database password and click "Save & Connect".',
      'Optionally click "Migrate Active Database to Target DB" to copy all ledgers, items, vouchers, and companies in 1 click.',
    ],
    markdownContent: `
### Supabase Connection Modes Explained
- **Session Pooler (Port 5432) [RECOMMENDED]**: Routes via \`pooler.supabase.com\` with dual-stack IPv4/IPv6 support. Compatible with all home/office broadband connections. Username format: \`postgres.<project-ref>\`.
- **Direct Connection (Port 5432)**: Direct connection to \`db.<project-ref>.supabase.co\`. Requires outbound IPv6 routing. Fails on most desktop client environments unless IPv4 add-on is purchased.
- **Transaction Pooler (Port 6543)**: Ephemeral connection pooling for serverless functions. Disables session prepared statements — not recommended for desktop accounting clients.
    `,
  },
};
