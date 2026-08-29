import React from 'react';
import {
  Scale,
  TrendingUp,
  FileSpreadsheet,
  Calendar,
  BookOpen,
  DollarSign,
  Building,
  CheckCircle2,
  AlertCircle,
  Download,
  HelpCircle,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import { Ledger } from '../types';
import { HelpDrawer } from '../components/HelpDrawer';

export const FinancialStatementsView: React.FC = () => {
  const { activeCompany, showToast } = useAppStore();

  const [activeTab, setActiveTab] = React.useState<
    'trial-balance' | 'profit-loss' | 'balance-sheet' | 'ledger-statement' | 'cash-bank'
  >('trial-balance');

  // Dates
  const [asOfDate, setAsOfDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [fromDate, setFromDate] = React.useState<string>(
    new Date(new Date().getFullYear(), 3, 1).toISOString().split('T')[0]
  );
  const [toDate, setToDate] = React.useState<string>(new Date().toISOString().split('T')[0]);

  // Data states
  const [trialBalanceData, setTrialBalanceData] = React.useState<any>(null);
  const [pnlData, setPnlData] = React.useState<any>(null);
  const [balanceSheetData, setBalanceSheetData] = React.useState<any>(null);
  const [cashBankData, setCashBankData] = React.useState<any>(null);

  // Ledger statement state
  const [ledgers, setLedgers] = React.useState<Ledger[]>([]);
  const [selectedLedgerId, setSelectedLedgerId] = React.useState<string>('');
  const [ledgerStatementData, setLedgerStatementData] = React.useState<any>(null);
  const [isHelpOpen, setIsHelpOpen] = React.useState<boolean>(false);

  const [loading, setLoading] = React.useState<boolean>(false);

  const loadData = async () => {
    if (!activeCompany) return;
    try {
      setLoading(true);
      if (activeTab === 'trial-balance') {
        const data = await api.getTrialBalance(activeCompany._id, asOfDate);
        setTrialBalanceData(data);
      } else if (activeTab === 'profit-loss') {
        const data = await api.getProfitAndLoss(activeCompany._id, fromDate, toDate);
        setPnlData(data);
      } else if (activeTab === 'balance-sheet') {
        const data = await api.getBalanceSheet(activeCompany._id, asOfDate);
        setBalanceSheetData(data);
      } else if (activeTab === 'cash-bank') {
        const data = await api.getCashBankBook(activeCompany._id, fromDate, toDate);
        setCashBankData(data);
      } else if (activeTab === 'ledger-statement') {
        const lList = await api.getLedgers(activeCompany._id);
        setLedgers(lList);
        if (lList.length > 0 && !selectedLedgerId) {
          setSelectedLedgerId(lList[0]._id);
          const st = await api.getLedgerStatement(activeCompany._id, lList[0]._id, fromDate, toDate);
          setLedgerStatementData(st);
        } else if (selectedLedgerId) {
          const st = await api.getLedgerStatement(activeCompany._id, selectedLedgerId, fromDate, toDate);
          setLedgerStatementData(st);
        }
      }
    } catch (err: any) {
      console.warn('Error loading statement:', err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, [activeCompany, activeTab, asOfDate, fromDate, toDate, selectedLedgerId]);

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-100">Financial Statements & Accounting Reports</h1>
            <p className="text-xs text-slate-400">
              Tally-compliant Double-Entry Financial Statements, Profit & Loss, Trial Balance & Ledger Statements
            </p>
          </div>
        </div>

        {/* Tab Selection */}
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 text-xs font-semibold overflow-x-auto">
              {[
                { id: 'trial-balance', label: 'Trial Balance' },
                { id: 'profit-loss', label: 'Profit & Loss' },
                { id: 'balance-sheet', label: 'Balance Sheet' },
                { id: 'ledger-statement', label: 'Ledger Statement' },
                { id: 'cash-bank', label: 'Cash & Bank Book' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded transition ${
                    activeTab === tab.id
                      ? 'bg-emerald-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition"
              title="Open Financial Reports Guide"
            >
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>Help</span>
            </button>
          </div>
        </div>

      {/* 1. Trial Balance Tab */}
      {activeTab === 'trial-balance' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-100">Trial Balance</h2>
              <p className="text-xs text-slate-400">
                As of {new Date(asOfDate).toLocaleDateString('en-IN')} | All ledger accounts with debit/credit closing balances
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
                <span className="text-slate-400">As of Date:</span>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="bg-slate-900 text-slate-100 px-2 py-0.5 rounded border border-slate-700 font-mono text-xs"
                />
              </div>

              <div
                className={`px-3 py-1 rounded-lg text-xs font-bold font-mono border flex items-center gap-1.5 ${
                  trialBalanceData?.difference === 0
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : 'bg-rose-950 text-rose-400 border-rose-800'
                }`}
              >
                {trialBalanceData?.difference === 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{trialBalanceData?.difference === 0 ? 'Trial Balance Balanced' : `Diff: ₹${trialBalanceData?.difference}`}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Particulars (Ledger Name)</th>
                  <th className="py-2.5 px-3">Group Hierarchy</th>
                  <th className="py-2.5 px-3">Nature</th>
                  <th className="py-2.5 px-3 text-right">Debit Balance (₹)</th>
                  <th className="py-2.5 px-3 text-right">Credit Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {trialBalanceData?.rows?.map((row: any) => (
                  <tr key={row._id} className="hover:bg-slate-850/40 transition">
                    <td className="py-2.5 px-3 font-semibold text-slate-100">{row.name}</td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{row.groupName}</td>
                    <td className="py-2.5 px-3 text-slate-500">{row.nature}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-sky-400">
                      {row.debit > 0 ? `₹${row.debit.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                      {row.credit > 0 ? `₹${row.credit.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-700 bg-slate-950 font-mono font-extrabold text-sm text-slate-100">
                  <td colSpan={3} className="py-3 px-3 uppercase">Grand Total</td>
                  <td className="py-3 px-3 text-right text-sky-400">
                    ₹{(trialBalanceData?.grandTotalDebit || 0).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right text-amber-400">
                    ₹{(trialBalanceData?.grandTotalCredit || 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 2. Profit & Loss Account */}
      {activeTab === 'profit-loss' && pnlData && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-100">Profit & Loss Account (Trading & P&L)</h2>
              <p className="text-xs text-slate-400">
                Period: {new Date(fromDate).toLocaleDateString('en-IN')} to {new Date(toDate).toLocaleDateString('en-IN')}
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-lg border border-slate-700 text-xs">
              <span className="text-slate-400">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-slate-900 text-slate-100 px-2 py-0.5 rounded border border-slate-700 font-mono text-xs"
              />
              <span className="text-slate-400">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-slate-900 text-slate-100 px-2 py-0.5 rounded border border-slate-700 font-mono text-xs"
              />
            </div>
          </div>

          {/* Two Columns: Trading & Operating Expenses vs Income */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Expenses / Outwards */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                Trading Expenses / Cost of Sales
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>To Opening Stock</span>
                  <span className="font-mono font-bold">
                    ₹{pnlData.tradingAccount.openingStock.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-300">
                  <span>To Purchases (Purchase Register)</span>
                  <span className="font-mono font-bold">
                    ₹{pnlData.tradingAccount.totalPurchases.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-300">
                  <span>To Direct Expenses</span>
                  <span className="font-mono font-bold">
                    ₹{pnlData.tradingAccount.totalDirectExpenses.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-emerald-400 font-bold border-t border-slate-800 pt-2">
                  <span>To Gross Profit c/d</span>
                  <span className="font-mono text-sm">
                    ₹{pnlData.tradingAccount.grossProfit.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Indirect Expenses */}
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider border-b border-slate-800 pt-4 pb-2">
                Indirect Expenses
              </h3>

              <div className="space-y-2 text-xs">
                {pnlData.profitAndLoss.indirectExpenses.map((exp: any, i: number) => (
                  <div key={i} className="flex justify-between text-slate-300">
                    <span>To {exp.name}</span>
                    <span className="font-mono font-bold">₹{exp.amount.toFixed(2)}</span>
                  </div>
                ))}
                {pnlData.profitAndLoss.indirectExpenses.length === 0 && (
                  <div className="text-slate-500 italic">No indirect expenses in period</div>
                )}

                <div className="flex justify-between text-emerald-400 font-extrabold border-t-2 border-slate-800 pt-3 text-sm">
                  <span>Nett Profit (Transferred to Balance Sheet)</span>
                  <span className="font-mono">₹{pnlData.profitAndLoss.netProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Right: Income / Inwards */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pb-2">
                Trading Income / Revenue
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>By Sales (Sales Register)</span>
                  <span className="font-mono font-bold">
                    ₹{pnlData.tradingAccount.totalSales.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-300">
                  <span>By Direct Incomes</span>
                  <span className="font-mono font-bold">
                    ₹{pnlData.tradingAccount.totalDirectIncome.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-300">
                  <span>By Closing Stock (Valuation)</span>
                  <span className="font-mono font-bold">
                    ₹{pnlData.tradingAccount.closingStock.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Indirect Incomes & Gross Profit b/d */}
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800 pt-4 pb-2">
                Indirect Incomes
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>By Gross Profit b/d</span>
                  <span className="font-mono font-bold">
                    ₹{pnlData.profitAndLoss.grossProfitBroughtDown.toFixed(2)}
                  </span>
                </div>

                {pnlData.profitAndLoss.indirectIncomes.map((inc: any, i: number) => (
                  <div key={i} className="flex justify-between text-slate-300">
                    <span>By {inc.name}</span>
                    <span className="font-mono font-bold">₹{inc.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Balance Sheet */}
      {activeTab === 'balance-sheet' && balanceSheetData && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-100">Balance Sheet</h2>
              <p className="text-xs text-slate-400">
                As of {new Date(asOfDate).toLocaleDateString('en-IN')} | Capital & Liabilities vs Property & Assets
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
                <span className="text-slate-400">As of Date:</span>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="bg-slate-900 text-slate-100 px-2 py-0.5 rounded border border-slate-700 font-mono text-xs"
                />
              </div>

              <div
                className={`px-3 py-1 rounded-lg text-xs font-bold font-mono border flex items-center gap-1.5 ${
                  balanceSheetData.isBalanced
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : 'bg-rose-950 text-rose-400 border-rose-800'
                }`}
              >
                {balanceSheetData.isBalanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{balanceSheetData.isBalanced ? 'Balanced' : 'Discrepancy'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Liabilities Column */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-2">
                <span>Liabilities & Capital</span>
                <span>Amount (₹)</span>
              </div>

              <div className="space-y-3 text-xs">
                {balanceSheetData.liabilities.map((group: any, idx: number) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between font-bold text-slate-200">
                      <span>{group.groupName}</span>
                      <span className="font-mono">₹{group.total.toFixed(2)}</span>
                    </div>
                    {group.ledgers.map((l: any, lIdx: number) => (
                      <div key={lIdx} className="flex justify-between pl-4 text-slate-400 text-[11px]">
                        <span>{l.name}</span>
                        <span className="font-mono">₹{(l.credit - l.debit).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Net Profit row */}
                <div className="flex justify-between font-bold text-emerald-400 pt-2 border-t border-slate-800">
                  <span>Profit & Loss A/c (Net Profit)</span>
                  <span className="font-mono">₹{balanceSheetData.netProfit.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t-2 border-slate-700 pt-3 flex justify-between font-mono font-extrabold text-sm text-slate-100">
                <span>TOTAL LIABILITIES</span>
                <span className="text-amber-400">₹{balanceSheetData.totalLiabilities.toFixed(2)}</span>
              </div>
            </div>

            {/* Assets Column */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-sky-400 border-b border-slate-800 pb-2">
                <span>Assets & Property</span>
                <span>Amount (₹)</span>
              </div>

              <div className="space-y-3 text-xs">
                {balanceSheetData.assets.map((group: any, idx: number) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between font-bold text-slate-200">
                      <span>{group.groupName}</span>
                      <span className="font-mono">₹{group.total.toFixed(2)}</span>
                    </div>
                    {group.ledgers.map((l: any, lIdx: number) => (
                      <div key={lIdx} className="flex justify-between pl-4 text-slate-400 text-[11px]">
                        <span>{l.name}</span>
                        <span className="font-mono">₹{(l.debit - l.credit).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-slate-700 pt-3 flex justify-between font-mono font-extrabold text-sm text-slate-100">
                <span>TOTAL ASSETS</span>
                <span className="text-sky-400">₹{balanceSheetData.totalAssets.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Ledger Statement */}
      {activeTab === 'ledger-statement' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-100">Ledger Statement Account</h2>
              <p className="text-xs text-slate-400">
                Running balance statement for party and general ledger accounts
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedLedgerId}
                onChange={(e) => setSelectedLedgerId(e.target.value)}
                className="bg-slate-800 text-slate-100 text-xs px-3 py-1.5 rounded-lg border border-slate-700 font-semibold max-w-[220px]"
              >
                {ledgers.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.name} ({l.groupName})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-slate-900 text-slate-100 px-2 py-0.5 rounded border border-slate-700 font-mono text-xs"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-slate-900 text-slate-100 px-2 py-0.5 rounded border border-slate-700 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {ledgerStatementData && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400 font-semibold">Account: </span>
                  <span className="font-bold text-slate-100 text-sm">{ledgerStatementData.ledger.name}</span>
                  <span className="text-slate-500 ml-2 font-mono">[{ledgerStatementData.ledger.groupName}]</span>
                </div>
                <div className="font-mono text-xs">
                  Opening Balance:{' '}
                  <span className="font-bold text-slate-200">
                    ₹{ledgerStatementData.openingBalance.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Voucher #</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Opposite Ledger / Particulars</th>
                      <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Running Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {ledgerStatementData.transactions.map((t: any) => (
                      <tr key={t._id} className="hover:bg-slate-850/40 transition">
                        <td className="py-2.5 px-3 text-slate-400 font-mono">
                          {new Date(t.date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-200">
                          {t.voucherNumber}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{t.voucherType}</td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-[200px] truncate">
                          {t.particulars}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-sky-400">
                          {t.debit > 0 ? `₹${t.debit.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                          {t.credit > 0 ? `₹${t.credit.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                          ₹{t.runningBalance.toFixed(2)}
                        </td>
                      </tr>
                    ))}

                    {ledgerStatementData.transactions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                          No transactions found for this ledger in the selected date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-700 bg-slate-950 font-mono font-extrabold text-xs text-slate-100">
                      <td colSpan={4} className="py-3 px-3 uppercase">Closing Balance</td>
                      <td className="py-3 px-3 text-right text-sky-400">
                        ₹{ledgerStatementData.periodDebit.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-400">
                        ₹{ledgerStatementData.periodCredit.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-400 text-sm">
                        ₹{ledgerStatementData.closingBalance.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Cash & Bank Book */}
      {activeTab === 'cash-bank' && cashBankData && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-100">Cash & Bank Accounts Book</h2>
              <p className="text-xs text-slate-400">
                Balances and movement across all Cash in Hand, Bank Current, and Overdraft accounts
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cashBankData.accounts?.map((acc: any) => (
              <div key={acc.ledger._id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm">{acc.ledger.name}</h3>
                    <p className="text-[11px] text-slate-500 font-mono">{acc.ledger.groupName}</p>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[10px] text-slate-400 block uppercase">Closing Balance</span>
                    <span className="text-base font-extrabold text-emerald-400">
                      ₹{acc.closingBalance.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-slate-400">
                  <div className="flex justify-between">
                    <span>Opening Balance:</span>
                    <span className="font-mono text-slate-200">₹{acc.openingBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Inflow (Receipts):</span>
                    <span className="font-mono text-sky-400">₹{acc.periodDebit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Outflow (Payments):</span>
                    <span className="font-mono text-amber-400">₹{acc.periodCredit.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contextual Help Drawer */}
      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        initialTopicId="financials"
      />
    </div>
  );
};
