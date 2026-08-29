import { getRepositories } from '../repositories/factory';
import { IVoucherEntity } from '../repositories/interfaces/IVoucherRepository';

export class AccountingEngine {
  /**
   * Validate double entry balance
   */
  public static validateVoucherBalance(entries: Array<{ debit: number; credit: number }>): boolean {
    const totalDebit = entries.reduce((acc, curr) => acc + (Number(curr.debit) || 0), 0);
    const totalCredit = entries.reduce((acc, curr) => acc + (Number(curr.credit) || 0), 0);
    return Math.abs(totalDebit - totalCredit) < 0.01;
  }

  /**
   * Post voucher effects to Ledger balances and Item stocks
   */
  public static async postVoucherEffects(
    voucher: Partial<IVoucherEntity>,
    isReversal: boolean = false
  ): Promise<void> {
    const multiplier = isReversal ? -1 : 1;
    const repos = getRepositories();

    // Update Ledgers
    for (const entry of voucher.entries || []) {
      if (!entry.ledgerId) continue;
      const ledger = await repos.ledgers.findById(entry.ledgerId);
      if (ledger) {
        const netChange = (Number(entry.debit) || 0) - (Number(entry.credit) || 0);
        // For Assets & Expenses: Dr is +ve, Cr is -ve
        // For Liabilities & Income: Cr is +ve, Dr is -ve
        const balanceDiff =
          ledger.nature === 'Assets' || ledger.nature === 'Expenses'
            ? netChange * multiplier
            : -netChange * multiplier;

        await repos.ledgers.updateBalance(entry.ledgerId, balanceDiff);
      }
    }

    // Update Stock if items present
    if (voucher.items && voucher.items.length > 0) {
      for (const itemEntry of voucher.items) {
        if (!itemEntry.itemId) continue;
        const item = await repos.items.findById(itemEntry.itemId);
        if (item && item.itemType !== 'Service') {
          let stockChange = 0;
          if (voucher.voucherType === 'Sales' || voucher.voucherType === 'Debit Note') {
            stockChange = -itemEntry.quantity; // Outward
          } else if (voucher.voucherType === 'Purchase' || voucher.voucherType === 'Credit Note') {
            stockChange = itemEntry.quantity; // Inward
          }

          if (stockChange !== 0) {
            await repos.items.updateStock(itemEntry.itemId, stockChange * multiplier);
          }
        }
      }
    }
  }

  /**
   * Recalculate all ledger and item balances from scratch for a company
   */
  public static async recalculateCompanyBalances(companyId: string): Promise<void> {
    const repos = getRepositories();
    const ledgers = await repos.ledgers.findByCompany(companyId);
    for (const ledger of ledgers) {
      await repos.ledgers.update(ledger._id, { currentBalance: ledger.openingBalance || 0 });
    }

    const items = await repos.items.findByCompany(companyId);
    for (const item of items) {
      await repos.items.update(item._id, { currentStock: item.openingStock || 0 });
    }

    const vouchers = await repos.vouchers.findByCompany(companyId, { status: 'Posted' });
    vouchers.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const voucher of vouchers) {
      await this.postVoucherEffects(voucher, false);
    }
  }

  /**
   * Get Day Book
   */
  public static async getDayBook(companyId: string, fromDate?: string, toDate?: string) {
    const repos = getRepositories();
    let vouchers = await repos.vouchers.findByCompany(companyId);

    if (fromDate || toDate) {
      const fDate = fromDate ? new Date(fromDate).getTime() : 0;
      const tDate = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;
      vouchers = vouchers.filter((v) => {
        const vTime = new Date(v.date).getTime();
        return vTime >= fDate && vTime <= tDate;
      });
    }

    vouchers.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let totalDebit = 0;
    let totalCredit = 0;

    const rows = vouchers.map((v) => {
      const vDebit = v.entries.reduce((sum, e) => sum + (e.debit || 0), 0);
      const vCredit = v.entries.reduce((sum, e) => sum + (e.credit || 0), 0);
      totalDebit += vDebit;
      totalCredit += vCredit;
      return {
        _id: v._id,
        date: v.date,
        voucherNumber: v.voucherNumber,
        voucherType: v.voucherType,
        partyName: v.partyName || v.entries[0]?.ledgerName || '',
        partyGstin: v.partyGstin,
        entries: v.entries,
        items: v.items,
        totalAmount: v.totalAmount || vDebit,
        narration: v.narration,
        status: v.status,
      };
    });

    return {
      fromDate,
      toDate,
      vouchers: rows,
      totalVouchers: rows.length,
      totalDebit,
      totalCredit,
    };
  }

  /**
   * Get Ledger-wise Statement
   */
  public static async getLedgerStatement(
    companyId: string,
    ledgerId: string,
    fromDate?: string,
    toDate?: string
  ) {
    const repos = getRepositories();
    const ledger = await repos.ledgers.findById(ledgerId);
    if (!ledger) throw new Error('Ledger not found');

    const fDate = fromDate ? new Date(fromDate).getTime() : 0;
    const tDate = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;

    const allVouchers = await repos.vouchers.findByCompany(companyId, { status: 'Posted' });
    const involvingVouchers = allVouchers.filter((v) =>
      v.entries.some((e) => String(e.ledgerId) === String(ledger._id))
    );

    let runningBalance = ledger.openingBalance || 0;

    // Calculate opening balance before fDate
    const vouchersBefore = involvingVouchers.filter((v) => new Date(v.date).getTime() < fDate);
    for (const v of vouchersBefore) {
      for (const e of v.entries) {
        if (String(e.ledgerId) === String(ledger._id)) {
          const net = (e.debit || 0) - (e.credit || 0);
          if (ledger.nature === 'Assets' || ledger.nature === 'Expenses') {
            runningBalance += net;
          } else {
            runningBalance -= net;
          }
        }
      }
    }

    const startBalance = runningBalance;

    const currentVouchers = involvingVouchers.filter((v) => {
      const vTime = new Date(v.date).getTime();
      return vTime >= fDate && vTime <= tDate;
    });
    currentVouchers.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let periodDebit = 0;
    let periodCredit = 0;

    const transactions = currentVouchers.map((v) => {
      const myEntries = v.entries.filter((e) => String(e.ledgerId) === String(ledger._id));
      const oppositeEntries = v.entries.filter((e) => String(e.ledgerId) !== String(ledger._id));
      const debit = myEntries.reduce((s, e) => s + (e.debit || 0), 0);
      const credit = myEntries.reduce((s, e) => s + (e.credit || 0), 0);

      periodDebit += debit;
      periodCredit += credit;

      const net = debit - credit;
      if (ledger.nature === 'Assets' || ledger.nature === 'Expenses') {
        runningBalance += net;
      } else {
        runningBalance -= net;
      }

      return {
        _id: v._id,
        date: v.date,
        voucherNumber: v.voucherNumber,
        voucherType: v.voucherType,
        particulars: oppositeEntries.map((e) => e.ledgerName).join(', ') || ledger.name,
        narration: v.narration,
        debit,
        credit,
        runningBalance,
      };
    });

    return {
      ledger: {
        _id: ledger._id,
        name: ledger.name,
        groupName: ledger.groupName,
        nature: ledger.nature,
        gstin: ledger.gstin,
        contact: ledger.contact,
      },
      openingBalance: startBalance,
      transactions,
      periodDebit,
      periodCredit,
      closingBalance: runningBalance,
    };
  }

  /**
   * Generate Trial Balance
   */
  public static async getTrialBalance(companyId: string, asOfDate?: string) {
    const repos = getRepositories();
    const ledgers = await repos.ledgers.findByCompany(companyId);
    const endDate = asOfDate ? new Date(asOfDate).setHours(23, 59, 59, 999) : Infinity;

    const allVouchers = await repos.vouchers.findByCompany(companyId, { status: 'Posted' });
    const filteredVouchers = allVouchers.filter((v) => new Date(v.date).getTime() <= endDate);

    const rows = [];
    let grandTotalDebit = 0;
    let grandTotalCredit = 0;

    for (const ledger of ledgers) {
      let totalDr = ledger.openingType === 'Dr' ? ledger.openingBalance : 0;
      let totalCr = ledger.openingType === 'Cr' ? ledger.openingBalance : 0;

      for (const v of filteredVouchers) {
        for (const e of v.entries) {
          if (String(e.ledgerId) === String(ledger._id)) {
            totalDr += e.debit || 0;
            totalCr += e.credit || 0;
          }
        }
      }

      let closingDebit = 0;
      let closingCredit = 0;

      if (totalDr >= totalCr) {
        closingDebit = totalDr - totalCr;
      } else {
        closingCredit = totalCr - totalDr;
      }

      if (closingDebit > 0 || closingCredit > 0 || (ledger.openingBalance && ledger.openingBalance > 0)) {
        grandTotalDebit += closingDebit;
        grandTotalCredit += closingCredit;

        rows.push({
          _id: ledger._id,
          name: ledger.name,
          groupName: ledger.groupName,
          nature: ledger.nature,
          debit: closingDebit,
          credit: closingCredit,
        });
      }
    }

    return {
      asOfDate: asOfDate ? new Date(asOfDate) : new Date(),
      rows,
      grandTotalDebit: Math.round(grandTotalDebit * 100) / 100,
      grandTotalCredit: Math.round(grandTotalCredit * 100) / 100,
      difference: Math.round(Math.abs(grandTotalDebit - grandTotalCredit) * 100) / 100,
    };
  }

  /**
   * Generate Profit & Loss Account
   */
  public static async getProfitAndLoss(companyId: string, fromDate?: string, toDate?: string) {
    const repos = getRepositories();
    const fDate = fromDate ? new Date(fromDate).getTime() : 0;
    const tDate = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : Infinity;

    const allVouchers = await repos.vouchers.findByCompany(companyId, { status: 'Posted' });
    const vouchers = allVouchers.filter((v) => {
      const vTime = new Date(v.date).getTime();
      return vTime >= fDate && vTime <= tDate;
    });

    const ledgers = await repos.ledgers.findByCompany(companyId);
    const ledgerMap = new Map(ledgers.map((l) => [String(l._id), l]));

    const salesList: Array<{ name: string; amount: number }> = [];
    const directIncomeList: Array<{ name: string; amount: number }> = [];
    const indirectIncomeList: Array<{ name: string; amount: number }> = [];

    const purchaseList: Array<{ name: string; amount: number }> = [];
    const directExpenseList: Array<{ name: string; amount: number }> = [];
    const indirectExpenseList: Array<{ name: string; amount: number }> = [];

    const ledgerTotals: Record<string, { dr: number; cr: number }> = {};
    for (const v of vouchers) {
      for (const e of v.entries) {
        const id = String(e.ledgerId);
        if (!ledgerTotals[id]) ledgerTotals[id] = { dr: 0, cr: 0 };
        ledgerTotals[id].dr += e.debit || 0;
        ledgerTotals[id].cr += e.credit || 0;
      }
    }

    for (const [id, tot] of Object.entries(ledgerTotals)) {
      const l = ledgerMap.get(id);
      if (!l) continue;

      const netIncome = tot.cr - tot.dr;
      const netExpense = tot.dr - tot.cr;

      if (l.groupName === 'Sales Accounts' && netIncome !== 0) {
        salesList.push({ name: l.name, amount: netIncome });
      } else if (l.groupName === 'Direct Incomes' && netIncome !== 0) {
        directIncomeList.push({ name: l.name, amount: netIncome });
      } else if (l.groupName === 'Indirect Incomes' && netIncome !== 0) {
        indirectIncomeList.push({ name: l.name, amount: netIncome });
      } else if (l.groupName === 'Purchase Accounts' && netExpense !== 0) {
        purchaseList.push({ name: l.name, amount: netExpense });
      } else if (l.groupName === 'Direct Expenses' && netExpense !== 0) {
        directExpenseList.push({ name: l.name, amount: netExpense });
      } else if (l.groupName === 'Indirect Expenses' && netExpense !== 0) {
        indirectExpenseList.push({ name: l.name, amount: netExpense });
      }
    }

    const items = await repos.items.findByCompany(companyId);
    const closingStockValue = items.reduce((acc, it) => acc + (it.currentStock * it.purchaseRate || 0), 0);
    const openingStockValue = items.reduce((acc, it) => acc + (it.openingStock * it.purchaseRate || 0), 0);

    const totalSales = salesList.reduce((s, x) => s + x.amount, 0);
    const totalDirectIncome = directIncomeList.reduce((s, x) => s + x.amount, 0);
    const totalPurchases = purchaseList.reduce((s, x) => s + x.amount, 0);
    const totalDirectExpenses = directExpenseList.reduce((s, x) => s + x.amount, 0);

    const tradingIncome = totalSales + totalDirectIncome + closingStockValue;
    const tradingExpense = openingStockValue + totalPurchases + totalDirectExpenses;
    const grossProfit = tradingIncome - tradingExpense;

    const totalIndirectIncome = indirectIncomeList.reduce((s, x) => s + x.amount, 0);
    const totalIndirectExpenses = indirectExpenseList.reduce((s, x) => s + x.amount, 0);
    const netProfit = grossProfit + totalIndirectIncome - totalIndirectExpenses;

    return {
      fromDate: fromDate ? new Date(fromDate) : new Date(new Date().getFullYear(), 3, 1),
      toDate: toDate ? new Date(toDate) : new Date(),
      tradingAccount: {
        openingStock: openingStockValue,
        purchases: purchaseList,
        totalPurchases,
        directExpenses: directExpenseList,
        totalDirectExpenses,
        sales: salesList,
        totalSales,
        directIncomes: directIncomeList,
        totalDirectIncome,
        closingStock: closingStockValue,
        grossProfit,
      },
      profitAndLoss: {
        grossProfitBroughtDown: grossProfit,
        indirectIncomes: indirectIncomeList,
        totalIndirectIncome,
        indirectExpenses: indirectExpenseList,
        totalIndirectExpenses,
        netProfit,
      },
    };
  }

  /**
   * Generate Balance Sheet
   */
  public static async getBalanceSheet(companyId: string, asOfDate?: string) {
    const trialBalance = await this.getTrialBalance(companyId, asOfDate);
    const pnl = await this.getProfitAndLoss(companyId, undefined, asOfDate);
    const netProfit = pnl.profitAndLoss.netProfit;

    const liabilities: Array<{ groupName: string; ledgers: any[]; total: number }> = [];
    const assets: Array<{ groupName: string; ledgers: any[]; total: number }> = [];

    const liabilityGroups = [
      'Capital Account',
      'Reserves & Surplus',
      'Loans (Liability)',
      'Bank OD/CC A/c',
      'Secured Loans',
      'Unsecured Loans',
      'Current Liabilities',
      'Duties & Taxes',
      'Sundry Creditors',
      'Provisions',
    ];

    const assetGroups = [
      'Fixed Assets',
      'Investments',
      'Current Assets',
      'Stock-in-hand',
      'Sundry Debtors',
      'Cash-in-hand',
      'Bank Accounts',
      'Loans & Advances (Asset)',
      'Deposits (Asset)',
    ];

    const groupRows: Record<string, any[]> = {};
    for (const r of trialBalance.rows) {
      if (!groupRows[r.groupName]) groupRows[r.groupName] = [];
      groupRows[r.groupName].push(r);
    }

    let totalLiabilities = 0;
    let totalAssets = 0;

    for (const gName of liabilityGroups) {
      const list = groupRows[gName] || [];
      const sum = list.reduce((s, r) => s + (r.credit - r.debit), 0);
      if (list.length > 0 || sum !== 0) {
        liabilities.push({ groupName: gName, ledgers: list, total: sum });
        totalLiabilities += sum;
      }
    }

    totalLiabilities += netProfit;

    for (const gName of assetGroups) {
      const list = groupRows[gName] || [];
      let sum = list.reduce((s, r) => s + (r.debit - r.credit), 0);
      if (gName === 'Stock-in-hand' && pnl.tradingAccount.closingStock > 0) {
        sum += pnl.tradingAccount.closingStock;
        list.push({
          name: 'Closing Stock (Valuation)',
          debit: pnl.tradingAccount.closingStock,
          credit: 0,
        });
      }
      if (list.length > 0 || sum !== 0) {
        assets.push({ groupName: gName, ledgers: list, total: sum });
        totalAssets += sum;
      }
    }

    return {
      asOfDate: trialBalance.asOfDate,
      liabilities,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      netProfit,
      assets,
      totalAssets: Math.round(totalAssets * 100) / 100,
      isBalanced: Math.abs(totalLiabilities - totalAssets) < 1,
    };
  }

  /**
   * Cash and Bank Book
   */
  public static async getCashBankBook(companyId: string, fromDate?: string, toDate?: string) {
    const repos = getRepositories();
    const ledgers = await repos.ledgers.findByCompany(companyId);
    const cashBankLedgers = ledgers.filter((l) =>
      ['Cash-in-hand', 'Bank Accounts', 'Bank OD/CC A/c'].includes(l.groupName)
    );

    const accounts = [];
    for (const l of cashBankLedgers) {
      const statement = await this.getLedgerStatement(companyId, l._id, fromDate, toDate);
      accounts.push(statement);
    }

    return {
      fromDate,
      toDate,
      accounts,
    };
  }

  /**
   * Stock Summary Report
   */
  public static async getStockSummary(companyId: string) {
    const repos = getRepositories();
    const items = await repos.items.findByCompany(companyId);
    let totalPurchaseValue = 0;

    let totalSaleValue = 0;
    let totalItems = items.length;
    let goodsCount = 0;
    let serviceCount = 0;
    let lowStockCount = 0;

    const rows = items.map((it) => {
      const isService = it.itemType === 'Service';
      if (isService) {
        serviceCount++;
      } else {
        goodsCount++;
      }
      const qty = Number(it.currentStock) || 0;
      const purchaseRate = Number(it.purchaseRate) || 0;
      const saleRate = Number(it.saleRate) || 0;
      const valuation = isService ? 0 : qty * purchaseRate;
      const retailValuation = isService ? 0 : qty * saleRate;

      totalPurchaseValue += valuation;
      totalSaleValue += retailValuation;

      const isLowStock = !isService && qty <= (Number(it.reorderLevel) || 0);
      if (isLowStock) lowStockCount++;

      return {
        _id: it._id,
        name: it.name,
        itemType: it.itemType,
        barcode: it.barcode,
        hsnCode: it.hsnCode,
        sacCode: it.sacCode,
        uqc: it.uqc,
        category: it.category,
        purchaseRate,
        saleRate,
        gstRate: it.gstRate,
        openingStock: it.openingStock,
        currentStock: it.currentStock,
        reorderLevel: it.reorderLevel,
        valuation: Math.round(valuation * 100) / 100,
        retailValuation: Math.round(retailValuation * 100) / 100,
        isLowStock,
      };
    });

    return {
      rows,
      totalItems,
      goodsCount,
      serviceCount,
      totalPurchaseValue: Math.round(totalPurchaseValue * 100) / 100,
      totalSaleValue: Math.round(totalSaleValue * 100) / 100,
      totalStockValue: Math.round(totalPurchaseValue * 100) / 100,
      lowStockCount,
    };
  }
}

