# Vindywashini Books 📚💼

> **Modern Desktop Accounting, Billing, and GST Filing Software for Indian Businesses**

[![Electron](https://img.shields.io/badge/Electron-34.2.0-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4.17-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

**Vindywashini Books** is an all-in-one desktop application designed for Indian MSMEs, traders, wholesalers, and retailers. It combines GST-compliant billing, double-entry bookkeeping, inventory management, PDF generation, and automated GST return filing exports into a fast, offline-first desktop experience.

---

## ✨ Key Features

### 🧾 GST Billing & Invoicing
- **Tax Invoices & Bills of Supply**: Support for B2B, B2C (Large & Small), Interstate (IGST), and Intrastate (CGST + SGST) billing.
- **Multiple Print Formats**: Standard A4, Compact A5, and 3-inch (80mm) Thermal POS receipts.
- **Dynamic UPI QR Codes**: Integrated instant payment QR codes generated directly on invoices.
- **HSN/SAC Validation**: Automated GST slab calculations (0%, 5%, 12%, 18%, 28%) and HSN code tracking.

### 📊 Double-Entry Accounting Engine
- **Full Tally-Grade Accounting**: Complete Journal, Payment, Receipt, Contra, Sales, and Purchase vouchers.
- **Financial Statements**: Real-time Day Book, Ledger Statements, Trial Balance, Profit & Loss (P&L), and Balance Sheet.
- **Pre-seeded Master Chart of Accounts**: Standard Indian accounting groups (Sundry Debtors, Creditors, Direct/Indirect Expenses, Assets, Liabilities).

### 📦 Inventory & Stock Management
- **Real-Time Stock Tracking**: Automated stock updates on sales, purchases, and returns.
- **Low Stock & Reorder Alerts**: Real-time notifications for items nearing threshold levels.
- **Unit Conversions & Categorization**: Support for PCS, KGS, BAG, MTR, BTL, BOX, and custom UQC units.

### 📑 GST Filing & Reconciliation
- **GSTR-1 Exports**: One-click generation of official Excel workbooks (`.xlsx`) and Government offline tool CSV ZIP packages.
- **GSTR-3B Summary**: Auto-computed Table 3.1 outward tax liabilities and Table 4 Eligible ITC claims.
- **GSTR-2B Auto-Reconciliation**: Compare purchase registers with portal returns to identify missing ITC and mismatched invoices.

### 🚀 Smart Communication & Cloud Storage
- **WhatsApp Invoicing**: Direct WhatsApp link generation (`wa.me`) with pre-formatted invoice summaries.
- **Email Delivery**: Automated email dispatch via Nodemailer (Gmail App Passwords & Custom SMTP).
- **Cloud Storage Integration**: Private Supabase Storage bucket support with secure expiring signed URLs.

### 🔄 Dual Database & Data Portability
- **MongoDB & PostgreSQL / Supabase**: Flexible database architecture with instant provider switching.
- **Local & Cloud Ready**: Run completely offline with local MongoDB or sync across branches with cloud PostgreSQL.
- **One-Click Backup & Restore**: Full JSON schema snapshots and seamless cross-database migration.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Desktop Shell** | Electron 34, Electron Builder |
| **Frontend UI** | React 18, TypeScript, Tailwind CSS, Lucide React, Zustand |
| **Backend Engine** | Node.js, Express, TypeScript, TSX |
| **Databases** | MongoDB (Mongoose) / PostgreSQL / Supabase (pg) |
| **Document Generation** | Puppeteer-core, ExcelJS, Adm-Zip, QRCode |
| **Messaging & Transport** | Nodemailer (SMTP), Supabase Storage JS |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v20 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (for local database mode) OR a PostgreSQL / Supabase connection string

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Aditya-tmu/Vindywashini-Books.git
   cd Vindywashini-Books
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start in Development Mode:
   ```bash
   npm run dev
   ```
   *This starts the Express server (`localhost:4545`), Vite frontend (`localhost:5173`), and launches Electron.*

---

## 📦 Build & Release

To build production installers for Windows:

```bash
# Build Vite frontend, Server, and Electron binaries
npm run build

# Package Windows NSIS Installer (.exe) and Portable build
npm run dist
```

Installers will be generated in the `release/` directory.

---

## 🔒 Security & Privacy

- All sensitive configurations, tokens, and database credentials remain stored locally in your operating system's secure AppData directory (`%APPDATA%/VindywashiniBooks/`).
- No private business data or credentials are hardcoded or tracked in version control.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
