# Build Prompt for Antigravity CLI — "Vindywashini Books" (Desktop Accounting & Billing App)

Copy everything below into Antigravity CLI as the project brief.

---

## 1. Project Summary

Build a **Windows desktop accounting and billing application** (Tally / RetailDaddy style) named **"Vindywashini Books"** for small-to-medium Indian retail/hardware businesses. The app must let a user:

1. Create and manage **multiple companies** (multi-tenant on one machine).
2. Do full **accounting** (chart of accounts, ledgers, vouchers, day book, trial balance, P&L, balance sheet).
3. Do **billing/invoicing** with GST calculation, in **POS / A4 / A5** print formats, with a **custom business logo**.
4. Generate **GSTR-1 / GSTR-2 / GSTR-3B** reports as **Excel and CSV in the exact GST offline-utility format**, and (where technically possible) push filings **directly to the GST portal**.
5. Auto-send the **invoice PDF + a greeting message** to the customer via **Email** and **WhatsApp** the moment a bill is cut, if a customer mobile/email is attached.
6. Store all data locally in **MongoDB** (connecting to the local **MongoDB Compass** instance already installed on the PC).

---

## 2. Tech Stack (use exactly this unless a step below says otherwise)

| Layer | Choice | Why |
|---|---|---|
| Shell | **Electron** (not Tauri) | Best PDF/print + native OS integration (WhatsApp Desktop deep-link, default mail client, printer selection for POS/A4/A5) on Windows |
| Frontend | **React + TypeScript + Vite**, Tailwind CSS | Fast dev, easy to theme invoice templates |
| State/Data layer | React Query + Zustand | Local caching, offline-first UI |
| Backend (inside Electron main process) | **Node.js + Express** (runs as a local service on `127.0.0.1`) | Keeps business logic out of renderer, reusable if a web version is added later |
| ODM | **Mongoose** | Schema validation against MongoDB |
| Database | **MongoDB Community**, connected via the local connection string the user already uses in **MongoDB Compass** (default `mongodb://127.0.0.1:27017`) — app should let the user paste/verify this connection string in Settings on first run | Per user requirement |
| PDF/Invoice rendering | **Puppeteer** (HTML/CSS → PDF) for A4/A5; **ESC/POS via `node-thermal-printer`** for POS thermal printers | HTML gives full layout control for logo + GST columns; POS needs raw ESC/POS commands |
| Excel/CSV generation | **ExcelJS** for `.xlsx`, native CSV writer for `.csv` — must byte-match the government offline utility's column headers (see Section 6) | GSTR filing compatibility |
| Email | **Nodemailer** (SMTP — let user configure Gmail/Business SMTP in Settings) | Send invoice on billing |
| WhatsApp | **WhatsApp Cloud API (Meta Business Platform)** as the primary integration, with a fallback **`wa.me` deep link** (opens WhatsApp Desktop/Web pre-filled with the greeting text; user attaches PDF manually) for users without a Business API key | See Section 8 — true auto-send of PDFs requires a paid/approved WhatsApp Business API; be upfront about this in the UI |
| Packaging | `electron-builder` → signed `.exe` installer | Distribution |

Antigravity: scaffold this as a **monorepo** with `/app` (Electron+React) and `/server` (Express+Mongoose) if you prefer separate processes, or a single Electron app with an embedded Express server — your call, but keep DB access, PDF generation, and GST-report generation in isolated, testable modules (not inline in React components).

---

## 3. Company Management Module

- **Create Company** wizard: Legal Name, Trade Name, GSTIN, PAN, Address (with state — critical for CGST/SGST vs IGST logic), State Code (auto-derive from GSTIN first 2 digits), Bank details (Account No., IFSC, Bank Name — for printing on invoice), Business Logo upload (PNG/JPG, store as file + path in Mongo, not as binary blob), Financial Year start month (default April), Invoice numbering pattern (prefix + running number + optional financial-year suffix, resettable each FY).
- Support **multiple companies**; a company switcher in the top bar. All Mongo collections must be scoped by `companyId`.
- Each company can register **multiple GST registrations** if needed (rare, but support it) — but default is one GSTIN per company, matching the current business (MAA VINDYWASHINI HARDWARE style: single intra-state Bihar GSTIN).

---

## 4. Accounting Module (Tally-equivalent)

Implement standard double-entry accounting:

- **Chart of Accounts**: pre-seed groups (Capital Account, Loans, Current Liabilities, Fixed Assets, Current Assets, Sales Account, Purchase Account, Direct/Indirect Expenses, Direct/Indirect Income, Duties & Taxes) — editable/extendable, matching Tally's default group structure so the mental model is familiar.
- **Ledgers**: create under a group, with opening balance, GSTIN (for supplier/customer ledgers), address, contact (phone + email — required for the WhatsApp/email auto-send feature).
- **Vouchers**: Sales, Purchase, Payment, Receipt, Contra, Journal, Credit Note, Debit Note. Each voucher posts balanced debit/credit entries to the ledgers.
- **Reports**: Day Book, Ledger-wise statement, Trial Balance, Profit & Loss, Balance Sheet, Cash/Bank Book, Stock Summary — all with date-range filters and Excel/PDF export.
- **Inventory**: Item master (Name, HSN/SAC code, Unit/UQC, Purchase rate, Sale rate, GST rate, Opening stock, Reorder level), stock ledger auto-updates on sales/purchase vouchers.

---

## 5. Billing / Invoicing Module

### 5.1 Invoice creation flow
- Select/​create **Customer** (Name, GSTIN if B2B, Mobile, Email, Billing/Shipping Address, Place of Supply).
- Add line items from Item master (auto-fill HSN, rate, GST%); manual quantity/discount per line.
- Auto tax split: if Customer's Place-of-Supply state == Company's state → **CGST + SGST**; else → **IGST**. (Mirrors the intra-state Bihar logic already used for MAA VINDYWASHINI HARDWARE.)
- Round-off, terms & conditions, notes fields.
- On **Save & Print**, generate the PDF in the chosen template (see 5.2), assign the next invoice number from the numbering series, post the corresponding Sales voucher automatically, decrement stock.

### 5.2 Multiple invoice print formats — must be selectable per invoice or set as company default
Build these as separate HTML/CSS templates (all pull from the same invoice data model) so Antigravity should implement a `templates/` folder with one file per layout:

1. **POS / Thermal (58mm & 80mm)** — compact, no logo or a tiny monochrome logo, item name/qty/rate/amount only, GST summary line, total, "Thank you" footer. Print via ESC/POS to the thermal printer.
2. **A5** — half-page, logo top-left, company details top-right, itemized table with HSN + GST%, tax summary box, signature area. Good for retail counter printers.
3. **A4** — full "tax invoice" layout: logo, company + GSTIN + bank details header, Bill-to/Ship-to two-column block, itemized table (Sr, Item, HSN, Qty, UQC, Rate, Discount, Taxable Value, CGST/SGST/IGST amount & rate, Total), amount-in-words, tax summary table by rate, terms, signature block. This is the one emailed/WhatsApp'd as the invoice PDF.
- Let the user pick a **default template per company**, and override per-invoice at print time (dropdown: POS-58 / POS-80 / A5 / A4).
- **Logo placement**: uploaded logo must render on A5 and A4 templates (top-left header, max height ~80px so it doesn't break layout); optional tiny logo on POS width permitting.

---

## 6. GST Reports — GSTR-1 Excel/CSV Export (must match official format exactly)

The government's offline utility workbook has these sheets — replicate column-for-column when the app generates its own Excel/CSV so the file can be **directly imported into the offline utility or GST portal**:

| Section | Sheet/File | Key columns (exact headers) |
|---|---|---|
| B2B, SEZ, DE | `b2b,sez,de` / `b2b_sez_de.csv` | GSTIN/UIN of Recipient, Receiver Name, Invoice Number, Invoice date, Invoice Value, Place Of Supply, Reverse Charge, Applicable % of Tax Rate, Invoice Type, E-Commerce GSTIN, Rate, Taxable Value, Cess Amount |
| B2C Large | `b2cl` | Invoice Number, Invoice date, Invoice Value, Place Of Supply, Applicable % of Tax Rate, Rate, Taxable Value, Cess Amount, E-Commerce GSTIN |
| B2C Small | `b2cs` | Type, Place Of Supply, Rate, Applicable % of Tax Rate, Taxable Value, Cess Amount, E-Commerce GSTIN |
| Credit/Debit Notes (Registered) | `cdnr` | GSTIN/UIN of Recipient, Receiver Name, Note Number, Note Date, Note Type, Place Of Supply, Reverse Charge, Note Supply Type, Note Value, Applicable % of Tax Rate, Rate, Taxable Value, Cess Amount |
| Credit/Debit Notes (Unregistered) | `cdnur` | UR Type, Note Number, Note Date, Note Type, Place Of Supply, Note Value, Applicable % of Tax Rate, Rate, Taxable Value, Cess Amount |
| Exports | `exp` | Export Type, Invoice Number, Invoice date, Invoice Value, Port Code, Shipping Bill Number, Shipping Bill Date, Rate, Taxable Value, Cess Amount |
| Tax on Advances | `at` | Place Of Supply, Applicable % of Tax Rate, Rate, Gross Advance Received, Cess Amount |
| Nil-rated/Exempt/Non-GST | `exemp` | Description, Nil Rated Supplies, Exempted (other than nil rated/non-GST), Non-GST Supplies |
| HSN Summary (B2B) | `hsn(b2b)` / `hsn_b2b_.csv` | HSN, Description, UQC, Total Quantity, Total Value, Taxable Value, Integrated Tax Amount, Central Tax Amount, State/UT Tax Amount, Cess Amount, Rate |
| HSN Summary (B2C) | `hsn(b2c)` / `hsn_b2c_.csv` | same columns as above |
| Documents Issued | `docs` | Nature of Document, Sr. No. From, Sr. No. To, Total Number, Cancelled |
| Supplies through E-Commerce Operator | `eco` (+ `ecob2b`, `ecob2c`, etc.) | Nature of Supply, GSTIN of E-Commerce Operator, E-Commerce Operator Name, Net value of supplies, Integrated tax, Central tax, State/UT tax, Cess |
| Amendment sheets | `b2ba`, `b2cla`, `b2csa`, `cdnra`, `cdnura`, `expa`, `ata`, `atadja`, `ecoa*` | Same columns as their base sheet plus original-invoice reference fields |
| Master/dropdown data | `master` | UQC list, Export Type, Reverse Charge Y/N, Note Type (C/D), Type (OE/E), Tax Rate list, POS (state list "01-Jammu & Kashmir" etc.), Invoice Type list, Nature of Document list, UR Type list, Supply Type (Inter/Intra State), Month, Financial Year, Nature of Supply (for ECO) |

Implementation notes for Antigravity:
- Build a **GST report engine** module that reads posted Sales/Credit-Note/Debit-Note vouchers for a selected return period and buckets them into the sections above automatically (B2B if customer has GSTIN, B2CL if unregistered invoice value > ₹2.5L (interstate) — apply current CBIC threshold rules, else B2CS; CDNR/CDNUR for notes against registered/unregistered parties, etc.).
- Output **both** an `.xlsx` workbook replicating the full multi-sheet offline-utility structure (with the same summary rows/headers on top of each sheet as seen in the government template) **and** individual `.csv` files per section, matching the sample CSVs exactly (header row, comma-separated, date format `DD-Mon-YY`).
- Also generate the equivalent **GSTR-1 JSON** (the actual schema the GST portal's offline tool and API consume) as a stretch goal, since JSON is what's actually uploaded/validated — Excel/CSV are for the user's records and for import into the offline Excel-to-JSON converter utility.
- **GSTR-3B**: build a summary report (Table 3.1 outward supplies, Table 4 ITC, Table 5 exempt) computed from the same voucher data plus Purchase register for ITC — exportable as PDF/Excel matching the portal's on-screen layout.
- **GSTR-2A/2B reconciliation**: allow importing the GSTR-2A/2B JSON or Excel downloaded from the portal and auto-match against the Purchase register (this app already has proven bank-vs-GST reconciliation logic from prior work — replicate that matching approach: invoice number + GSTIN + value tolerance matching).

### 6.1 Direct upload to the GST portal — be realistic in the build
- The GST portal does **not** offer a public "upload from any desktop app" API for individual taxpayers. Real direct filing requires either (a) the taxpayer's own portal login via a **GSP (GST Suvidha Provider) / ASP** integration (e.g., ClearTax, Cygnet, Taxbase — these require a commercial agreement and API keys), or (b) the user manually uploading the JSON the app generates on the GST portal website.
- Build the app so that:
  - It always produces a **portal-ready JSON/Excel** the user can manually upload (guaranteed to work, zero dependency).
  - It has a **pluggable GSP connector interface** (`/server/integrations/gsp/*`) so that if the user later signs up with a GSP and gets API credentials, the app can push filings programmatically — but ship v1 without assuming a live GSP contract exists.
- Surface this clearly in the UI: a "Download for Portal Upload" button (always works) and a "Direct e-File" button (disabled/greyed out until GSP API keys are entered in Settings).

---

## 7. Invoice Delivery — Email & WhatsApp on Bill Creation

- After an invoice is saved and PDF is generated, if the customer record has an email and/or mobile number, show a **"Send Invoice"** panel with checkboxes for Email / WhatsApp, pre-filled with an editable greeting message, e.g.:
  > "Dear {CustomerName}, thank you for shopping with {CompanyName}! Please find your invoice #{InvoiceNo} dated {Date} attached. Total: ₹{Amount}. We appreciate your business!"
- **Email**: send via Nodemailer with the PDF as attachment, using SMTP creds configured once in Settings (support Gmail App Password and generic SMTP).
- **WhatsApp**:
  - **Primary path (auto-send with PDF)**: WhatsApp Cloud API — requires the business to register a WhatsApp Business Account + phone number with Meta and get a permanent access token; app calls the `messages` endpoint with a `document` media type carrying the invoice PDF plus the greeting as the message body/template. Store the token encrypted in Settings.
  - **Fallback path (no API key)**: open `https://wa.me/91<number>?text=<url-encoded greeting>` in the default browser/WhatsApp Desktop — this pre-fills the chat with the text; the user then manually attaches the already-generated PDF from a "Reveal in folder" button, since `wa.me` links cannot auto-attach files. Make this the zero-setup default so the feature works out of the box.
  - Let the user choose which path is active per company in Settings, and clearly label the fallback as "manual attach required."
- Log every send attempt (channel, timestamp, success/failure) against the invoice for audit.

---

## 8. Data Model (MongoDB collections — Mongoose schemas)

Design at minimum these collections, all scoped by `companyId` except `companies` and `settings`:

- `companies` — profile, GSTIN, state, logo path, invoice numbering config, FY config
- `users` — for optional multi-user login/roles (Admin, Accountant, Biller) within a company
- `ledgers` — chart-of-accounts entries (group, opening balance, GSTIN, contact)
- `items` — inventory master (HSN, UQC, rates, GST%, stock qty)
- `customers` / `suppliers` — can be a `parties` collection with a `type` field, linked 1:1 to a `ledgers` doc
- `vouchers` — polymorphic: `type` (sales/purchase/payment/receipt/journal/contra/creditnote/debitnote), `entries[]` (ledger, debit/credit amount), `items[]` for sales/purchase, GST breakup fields, `placeOfSupply`, `invoiceNumber`
- `invoices` — denormalized snapshot of a sales voucher formatted for printing/sending (so historic invoices don't change if item master later changes) + template chosen + send log
- `gstReturns` — generated GSTR-1/2A-2B-recon/3B snapshots per period, with export file paths and filing status
- `settings` — SMTP creds, WhatsApp config, GSP API keys (encrypted), default invoice template, printer selection

Use `companyId` + compound indexes on frequently filtered fields (`invoiceNumber`, `date`, `partyId`, `hsn`).

---

## 9. Non-functional requirements

- **Offline-first**: everything must work with zero internet except Email/WhatsApp/GSP-upload steps.
- **Backup/Restore**: one-click export of the MongoDB database (per company or full) to a `.gz` archive on disk, and restore from it.
- **Data validation**: GSTIN checksum validation, HSN code lookup against a bundled master list, mandatory fields before voucher posting (must balance debit=credit).
- **Printing**: printer selection per template type, remembered per company (POS printer vs A4/A5 laser/inkjet may be different physical printers).
- **Financial-year lock**: allow locking a closed FY so past vouchers can't be edited without an explicit "reopen" action.
- **Audit trail**: every voucher/invoice edit logs old vs new values with timestamp and user.

---

## 10. Build Milestones (suggested order for Antigravity to execute)

1. Scaffold Electron+React+TS app, embedded Express server, Mongoose connection to local MongoDB (Settings screen to confirm/edit connection string first-run).
2. Company CRUD + multi-company switcher + logo upload.
3. Chart of Accounts + Ledger CRUD.
4. Item/Inventory master CRUD.
5. Voucher engine (Sales/Purchase/Payment/Receipt/Journal/Contra/CN/DN) with balanced posting + Day Book/Trial Balance/P&L/Balance Sheet reports.
6. Invoicing UI on top of Sales voucher, with the three print templates (POS/A5/A4) and PDF generation.
7. Email + WhatsApp send flow (fallback wa.me path first, Cloud API path second).
8. GST report engine: bucket vouchers into B2B/B2CL/B2CS/CDNR/CDNUR/EXP/HSN/DOCS sections; Excel (multi-sheet, matching offline-utility layout) + CSV exports.
9. GSTR-3B summary report.
10. GSTR-2A/2B import + reconciliation against Purchase register.
11. Settings: SMTP, WhatsApp, GSP connector stub, printer selection, backup/restore.
12. Packaging with `electron-builder`, installer, auto-update (optional, via `electron-updater`).

---

## 11. Reference sample files (already validated against the real GST offline utility)

The following sample files were used to confirm the exact section/column structure above — Antigravity should treat these as ground truth for the export format: `GSTR1_Excel_Workbook_Template_V2_2.xlsx` (full 31-sheet offline utility workbook), `b2b_sez_de.csv`, `b2cl.csv`, `b2cs.csv`, `hsn_b2b_.csv`, `hsn_b2c_.csv`, `hsn.csv`.

---

**End of prompt.** Antigravity: ask clarifying questions only if something above is genuinely ambiguous (e.g., exact WhatsApp provider preference); otherwise proceed milestone by milestone and produce a runnable Electron app after each milestone.
