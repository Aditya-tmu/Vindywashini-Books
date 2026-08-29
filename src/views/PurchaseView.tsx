import React from 'react';
import {
  Truck,
  Plus,
  Trash2,
  Printer,
  Search,
  Folder,
  CheckCircle2,
  Edit3,
  RefreshCw,
  X,
  Hash,
  HelpCircle,
  Briefcase,
  Layers,
  CreditCard,
  Building2,
  DollarSign,
  Calendar,
  AlertTriangle,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import { Item, Party, PurchaseBill } from '../types';
import { INDIAN_STATES, GST_RATES, GST_UQC_UNITS } from '../config/constants';
import { PrintPurchaseModal } from '../components/PrintPurchaseModal';
import { HelpDrawer } from '../components/HelpDrawer';

interface PurchaseLineItem {
  itemId?: string;
  name: string;
  itemType?: 'Goods' | 'Service';
  hsnCode: string;
  uqc: string;
  quantity: number;
  purchaseRate: number;
  discountPercent: number;
  discountAmount: number;
  taxableValue: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  total: number;
}

export const PurchaseView: React.FC = () => {
  const { activeCompany, showToast } = useAppStore();

  const [parties, setParties] = React.useState<Party[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [itemSearchQuery, setItemSearchQuery] = React.useState<string>('');

  // Purchase Form State
  const [supplierId, setSupplierId] = React.useState<string>('');
  const [supplierName, setSupplierName] = React.useState<string>('');
  const [supplierGstin, setSupplierGstin] = React.useState<string>('');
  const [supplierPhone, setSupplierPhone] = React.useState<string>('');
  const [supplierEmail, setSupplierEmail] = React.useState<string>('');
  const [supplierAddress, setSupplierAddress] = React.useState<string>('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = React.useState<string>('');
  const [supplierInvoiceDate, setSupplierInvoiceDate] = React.useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [customBillNumber, setCustomBillNumber] = React.useState<string>('PUR/0001');
  const [entryDate, setEntryDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [placeOfSupply, setPlaceOfSupply] = React.useState<string>('10-Bihar');
  const [paymentMode, setPaymentMode] = React.useState<'Cash' | 'Credit' | 'Bank' | 'UPI'>('Credit');
  const [notes, setNotes] = React.useState<string>('');
  const [lineItems, setLineItems] = React.useState<PurchaseLineItem[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Modals
  const [savedPurchase, setSavedPurchase] = React.useState<PurchaseBill | null>(null);
  const [showPrintModal, setShowPrintModal] = React.useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = React.useState<boolean>(false);
  const [purchasesList, setPurchasesList] = React.useState<PurchaseBill[]>([]);
  const [registerLoading, setRegisterLoading] = React.useState<boolean>(false);
  const [registerSearch, setRegisterSearch] = React.useState<string>('');
  const [registerSortField, setRegisterSortField] = React.useState<'date' | 'billNumber' | 'supplierInvoiceNumber' | 'supplierName' | 'grandTotal' | 'paymentStatus'>('date');
  const [registerSortOrder, setRegisterSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [isHelpOpen, setIsHelpOpen] = React.useState<boolean>(false);


  // Quick Supplier Modal State
  const [showQuickSupplierModal, setShowQuickSupplierModal] = React.useState<boolean>(false);
  const [quickSupplierName, setQuickSupplierName] = React.useState<string>('');
  const [quickSupplierGstin, setQuickSupplierGstin] = React.useState<string>('');
  const [quickSupplierPhone, setQuickSupplierPhone] = React.useState<string>('');

  // Inline New Item Modal State
  const [showQuickItemModal, setShowQuickItemModal] = React.useState<boolean>(false);
  const [quickItemType, setQuickItemType] = React.useState<'Goods' | 'Service'>('Goods');
  const [quickItemName, setQuickItemName] = React.useState<string>('');
  const [quickItemHsn, setQuickItemHsn] = React.useState<string>('2523');
  const [quickItemGst, setQuickItemGst] = React.useState<number>(18);
  const [quickItemPurchaseRate, setQuickItemPurchaseRate] = React.useState<number>(0);
  const [quickItemSaleRate, setQuickItemSaleRate] = React.useState<number>(0);
  const [quickItemUqc, setQuickItemUqc] = React.useState<string>('PCS');

  // Quick Bank Charges Modal State
  const [showBankChargesModal, setShowBankChargesModal] = React.useState<boolean>(false);
  const [bankProviderName, setBankProviderName] = React.useState<string>('State Bank of India (Merchant Services)');
  const [bankProviderGstin, setBankProviderGstin] = React.useState<string>('');
  const [bankInvoiceNo, setBankInvoiceNo] = React.useState<string>('POS/GST/' + new Date().getMonth());
  const [bankMdrTaxable, setBankMdrTaxable] = React.useState<number>(500);
  const [bankGstRate, setBankGstRate] = React.useState<number>(18);

  const companyStateCode = activeCompany?.address?.stateCode || '10';

  const loadData = async () => {
    if (!activeCompany) return;
    try {
      const [pList, iList, purList] = await Promise.all([
        api.getParties(activeCompany._id),
        api.getItems(activeCompany._id),
        api.getPurchases(activeCompany._id),
      ]);
      setParties(Array.isArray(pList) ? pList : []);
      setItems(Array.isArray(iList) ? iList : []);
      const safePurList = Array.isArray(purList) ? purList : [];
      setPurchasesList(safePurList);

      // Auto generate next PUR voucher number
      const count = safePurList.length + 1;
      setCustomBillNumber(`PUR/${String(count).padStart(4, '0')}`);
      setPlaceOfSupply(`${companyStateCode}-${activeCompany.address?.state || 'Bihar'}`);
    } catch (err: any) {
      console.warn('Error loading purchase data:', err.message);
    }
  };

  React.useEffect(() => {
    loadData();
  }, [activeCompany]);

  // Tax calculation
  let customerStateCode = '10';
  if (placeOfSupply) {
    const parts = placeOfSupply.split('-');
    if (parts.length > 0 && parts[0].trim().length === 2) {
      customerStateCode = parts[0].trim();
    }
  } else if (supplierGstin && supplierGstin.length >= 2) {
    customerStateCode = supplierGstin.substring(0, 2);
  }
  const isInterState = companyStateCode !== customerStateCode;

  // Supplier selection
  const handleSelectSupplier = (partyId: string) => {
    setSupplierId(partyId);
    const found = parties.find((p) => p._id === partyId);
    if (found) {
      setSupplierName(found.name);
      setSupplierGstin(found.gstin || '');
      setSupplierPhone(found.phone || '');
      setSupplierEmail(found.email || '');
      setSupplierAddress(
        `${found.billingAddress?.line1 || ''} ${found.billingAddress?.city || ''} ${
          found.billingAddress?.state || ''
        }`.trim()
      );
      if (found.gstin && found.gstin.length >= 2) {
        const stateCode = found.gstin.substring(0, 2);
        const stateObj = INDIAN_STATES[stateCode];
        if (stateObj) {
          setPlaceOfSupply(`${stateCode}-${stateObj.name}`);
        }
      }
    }
  };

  // Add Item to Purchase Bill
  const addItemToBill = (item: Item) => {
    const isService = item.itemType === 'Service';
    const rate = Number(item.purchaseRate) || Number(item.saleRate) || 0;
    const qty = 1;
    const taxable = qty * rate;
    const gstRate = Number(item.gstRate) || 0;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterState) {
      igst = Math.round(((taxable * gstRate) / 100) * 100) / 100;
    } else {
      cgst = Math.round(((taxable * (gstRate / 2)) / 100) * 100) / 100;
      sgst = Math.round(((taxable * (gstRate / 2)) / 100) * 100) / 100;
    }

    const total = taxable + cgst + sgst + igst;

    setLineItems([
      ...lineItems,
      {
        itemId: item._id,
        name: item.name,
        itemType: item.itemType || 'Goods',
        hsnCode: isService ? item.sacCode || item.hsnCode : item.hsnCode,
        uqc: item.uqc || 'PCS',
        quantity: qty,
        purchaseRate: rate,
        discountPercent: 0,
        discountAmount: 0,
        taxableValue: taxable,
        gstRate,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        cessAmount: 0,
        total,
      },
    ]);
    setItemSearchQuery('');
  };

  const addBlankItem = () => {
    setLineItems([
      ...lineItems,
      {
        name: '',
        itemType: 'Goods',
        hsnCode: '2523',
        uqc: 'PCS',
        quantity: 1,
        purchaseRate: 0,
        discountPercent: 0,
        discountAmount: 0,
        taxableValue: 0,
        gstRate: 18,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        cessAmount: 0,
        total: 0,
      },
    ]);
  };

  const updateLineItem = (index: number, field: keyof PurchaseLineItem, val: any) => {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: val };

    const qty = Number(item.quantity) || 0;
    const rate = Number(item.purchaseRate) || 0;
    const gross = qty * rate;

    let disc = Number(item.discountAmount) || 0;
    if (field === 'discountPercent') {
      disc = (gross * Number(val)) / 100;
      item.discountAmount = disc;
    }

    const taxable = Math.max(0, gross - disc);
    item.taxableValue = taxable;

    const gstRate = Number(item.gstRate) || 0;

    if (isInterState) {
      item.igstAmount = Math.round(((taxable * gstRate) / 100) * 100) / 100;
      item.cgstAmount = 0;
      item.sgstAmount = 0;
    } else {
      item.cgstAmount = Math.round(((taxable * (gstRate / 2)) / 100) * 100) / 100;
      item.sgstAmount = Math.round(((taxable * (gstRate / 2)) / 100) * 100) / 100;
      item.igstAmount = 0;
    }

    item.total = taxable + item.cgstAmount + item.sgstAmount + item.igstAmount + (Number(item.cessAmount) || 0);
    updated[index] = item;
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Totals
  const totalTaxable = lineItems.reduce((acc, curr) => acc + curr.taxableValue, 0);
  const totalCgst = lineItems.reduce((acc, curr) => acc + curr.cgstAmount, 0);
  const totalSgst = lineItems.reduce((acc, curr) => acc + curr.sgstAmount, 0);
  const totalIgst = lineItems.reduce((acc, curr) => acc + curr.igstAmount, 0);
  const unroundedTotal = totalTaxable + totalCgst + totalSgst + totalIgst;
  const grandTotal = Math.round(unroundedTotal);
  const roundOff = Math.round((grandTotal - unroundedTotal) * 100) / 100;

  // Filtered items in search picker
  const filteredItems = items.filter(
    (it) =>
      it.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
      it.hsnCode.includes(itemSearchQuery) ||
      (it.barcode && it.barcode.includes(itemSearchQuery))
  );

  // Suppliers filter
  const suppliers = parties.filter((p) => p.type === 'Supplier' || p.type === 'Both');

  // Handle Quick Add Supplier
  const handleSaveQuickSupplier = async () => {
    if (!activeCompany) return;
    if (!quickSupplierName.trim()) {
      showToast('Supplier name is required', 'error');
      return;
    }
    try {
      const created = await api.createParty({
        name: quickSupplierName.trim(),
        type: 'Supplier',
        gstin: quickSupplierGstin.trim().toUpperCase(),
        phone: quickSupplierPhone.trim(),
        companyId: activeCompany._id,
      });
      setParties([...parties, created]);
      handleSelectSupplier(created._id);
      setShowQuickSupplierModal(false);
      setQuickSupplierName('');
      setQuickSupplierGstin('');
      setQuickSupplierPhone('');
      showToast(`Supplier ${created.name} added!`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    }
  };

  // Handle Inline Quick Item Add
  const handleSaveQuickItem = async () => {
    if (!activeCompany) return;
    if (!quickItemName.trim()) {
      showToast('Item/Service name is required', 'error');
      return;
    }
    try {
      const created = await api.createItem({
        name: quickItemName.trim(),
        itemType: quickItemType,
        hsnCode: quickItemHsn.trim(),
        sacCode: quickItemType === 'Service' ? quickItemHsn.trim() : undefined,
        uqc: quickItemUqc,
        gstRate: Number(quickItemGst),
        purchaseRate: Number(quickItemPurchaseRate),
        saleRate: Number(quickItemSaleRate),
        companyId: activeCompany._id,
      });

      setItems([...items, created]);
      addItemToBill(created);
      setShowQuickItemModal(false);
      setQuickItemName('');
      setQuickItemPurchaseRate(0);
      setQuickItemSaleRate(0);
      showToast(`Added and inserted "${created.name}"!`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    }
  };

  // Handle Quick Bank Charges Entry
  const handleSaveBankCharges = async () => {
    if (!activeCompany) return;
    if (bankMdrTaxable <= 0) {
      showToast('MDR fee / Taxable amount must be greater than zero.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const halfRate = bankGstRate / 2;
      const cgst = Math.round(((bankMdrTaxable * (halfRate / 100))) * 100) / 100;
      const sgst = Math.round(((bankMdrTaxable * (halfRate / 100))) * 100) / 100;
      const totalTax = cgst + sgst;
      const totalAmount = bankMdrTaxable + totalTax;

      const res = await api.createPurchase({
        companyId: activeCompany._id,
        billNumber: customBillNumber,
        supplierInvoiceNumber: bankInvoiceNo || `BANK-GST-${Date.now().toString().slice(-4)}`,
        supplierInvoiceDate: supplierInvoiceDate,
        date: entryDate,
        supplierName: bankProviderName,
        supplierGstin: bankProviderGstin || 'URP',
        placeOfSupply: `${companyStateCode}-${activeCompany.address?.state || 'Bihar'}`,
        paymentMode: 'Bank',
        paymentStatus: 'Paid',
        paidAmount: totalAmount,
        notes: 'Bank MDR charges & POS monthly swipe fee reconciliation (SAC 997114)',
        items: [
          {
            name: 'Bank MDR Processing Fee / POS Rental',
            itemType: 'Service',
            hsnCode: '997114',
            uqc: 'OTH',
            quantity: 1,
            purchaseRate: bankMdrTaxable,
            taxableValue: bankMdrTaxable,
            gstRate: bankGstRate,
            cgstAmount: cgst,
            sgstAmount: sgst,
            igstAmount: 0,
            total: totalAmount,
          },
        ],
      });

      showToast(`Bank GST & MDR charges entry posted successfully! (₹${totalAmount.toFixed(2)})`, 'success');
      setShowBankChargesModal(false);
      resetBill();
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Purchase Bill
  const handleSavePurchaseBill = async (isDraft: boolean = false) => {
    if (!activeCompany) return;
    if (!supplierName.trim()) {
      showToast('Please specify a supplier name or select a registered vendor.', 'error');
      return;
    }
    if (!supplierInvoiceNumber.trim()) {
      showToast("Please enter the vendor's Supplier Invoice Number.", 'error');
      return;
    }
    if (lineItems.length === 0) {
      showToast('Please add at least one line item to the purchase bill.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.createPurchase({
        companyId: activeCompany._id,
        billNumber: customBillNumber.trim(),
        supplierInvoiceNumber: supplierInvoiceNumber.trim(),
        supplierInvoiceDate,
        date: entryDate,
        supplierId: supplierId || undefined,
        supplierName: supplierName.trim(),
        supplierGstin: supplierGstin.trim().toUpperCase(),
        supplierPhone,
        supplierEmail,
        placeOfSupply,
        paymentMode,
        paymentStatus: paymentMode === 'Credit' ? 'Unpaid' : 'Paid',
        paidAmount: paymentMode === 'Credit' ? 0 : grandTotal,
        notes,
        isDraft,
        items: lineItems,
      });

      showToast(
        isDraft
          ? `Purchase bill #${customBillNumber} saved as Draft.`
          : `Purchase Bill #${customBillNumber} saved and stock updated successfully!`,
        'success'
      );

      setSavedPurchase(res.data);
      setShowPrintModal(true);
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetBill = () => {
    setSupplierId('');
    setSupplierName('');
    setSupplierGstin('');
    setSupplierPhone('');
    setSupplierEmail('');
    setSupplierAddress('');
    setSupplierInvoiceNumber('');
    setLineItems([]);
    setNotes('');
    setSavedPurchase(null);
    setShowPrintModal(false);

    if (activeCompany) {
      const count = purchasesList.length + 1;
      setCustomBillNumber(`PUR/${String(count).padStart(4, '0')}`);
    }
  };

  const loadRegisterData = async () => {
    if (!activeCompany) return;
    try {
      setRegisterLoading(true);
      const list = await api.getPurchases(activeCompany._id, registerSearch || undefined);
      setPurchasesList(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.warn('Error loading purchase register:', err);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleDeletePurchase = async (id: string, billNo: string) => {
    if (!confirm(`Are you sure you want to delete purchase bill #${billNo}? Stock additions and accounting vouchers will be reverted.`))
      return;
    try {
      await api.deletePurchase(id);
      showToast(`Purchase bill #${billNo} deleted and reversed.`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-4rem)]">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-100 flex items-center gap-2">
              <span>Purchase Bill & Inward Supplies</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                ITC & Stock In
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Tax split: {isInterState ? 'Inter-State (Input IGST 100%)' : 'Intra-State (Input CGST 50% + SGST 50%)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Bank Charges Entry Shortcut */}
          <button
            onClick={() => setShowBankChargesModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950 hover:bg-sky-900 text-sky-300 hover:text-white text-xs font-bold border border-sky-800 shadow transition active:scale-95"
            title="Quickly record bank MDR & POS machine GST invoices (SAC 997114)"
          >
            <CreditCard className="w-3.5 h-3.5 text-sky-400" />
            <span>Bank & POS Charges</span>
          </button>

          {/* Purchase Register Button */}
          <button
            onClick={() => {
              setShowRegisterModal(true);
              loadRegisterData();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Folder className="w-3.5 h-3.5 text-indigo-400" />
            <span>Purchase Register</span>
          </button>

          {/* Help Button */}
          <button
            onClick={() => setIsHelpOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition"
            title="Open Purchase Guide"
          >
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>Help</span>
          </button>
        </div>
      </div>

      {/* Main Form Grid: Left Supplier Info (1 Col) & Right Items / Totals (2 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Supplier & Invoice Metadata */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span>Supplier & Invoice Details</span>
            </h2>
            <button
              onClick={() => setShowQuickSupplierModal(true)}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Quick Add</span>
            </button>
          </div>

          {/* Supplier Picker */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400">Select Vendor / Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => handleSelectSupplier(e.target.value)}
              className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Choose Existing Supplier --</option>
              {suppliers.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} {p.gstin ? `(${p.gstin})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Supplier Name *</label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="Vendor Name"
                className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Supplier GSTIN</label>
              <input
                type="text"
                value={supplierGstin}
                onChange={(e) => setSupplierGstin(e.target.value.toUpperCase())}
                placeholder="10AAAAA0000A1Z5"
                className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono uppercase focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Supplier Invoice Number & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-indigo-300">Supplier Invoice # *</label>
              <input
                type="text"
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                placeholder="INV-9821"
                className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-indigo-300">Supplier Inv Date *</label>
              <input
                type="date"
                value={supplierInvoiceDate}
                onChange={(e) => setSupplierInvoiceDate(e.target.value)}
                className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Internal Bill Voucher Number & Entry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Internal Bill #</label>
              <input
                type="text"
                value={customBillNumber}
                onChange={(e) => setCustomBillNumber(e.target.value)}
                placeholder="PUR/0001"
                className="w-full bg-slate-800 text-indigo-400 font-mono font-bold text-xs px-3 py-2 rounded-lg border border-slate-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Stock Entry Date</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
              />
            </div>
          </div>

          {/* Place of Supply */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400">Supplier State / Place of Supply</label>
            <select
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
              className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700"
            >
              {Object.entries(INDIAN_STATES).map(([code, st]) => (
                <option key={code} value={`${code}-${st.name}`}>
                  {code} - {st.name} {code === companyStateCode ? '(Intra-State)' : '(Inter-State)'}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Mode */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-[11px] font-bold text-slate-300 block">Payment Mode</label>
            <div className="grid grid-cols-4 gap-2">
              {(['Credit', 'Cash', 'Bank', 'UPI'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2 rounded-lg text-xs font-bold transition border ${
                    paymentMode === mode
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Items Search, Table, Summary */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Item Search & Add Bar */}
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    placeholder="Search product / service by name, HSN/SAC code..."
                    className="w-full bg-slate-800 text-slate-100 text-xs pl-9 pr-4 py-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={() => setShowQuickItemModal(true)}
                  className="flex items-center gap-1 px-3 py-2.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-300 hover:text-white text-xs font-bold border border-indigo-800 transition"
                  title="Create a new item in product master"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ New Item</span>
                </button>

                <button
                  onClick={addBlankItem}
                  className="flex items-center gap-1 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                >
                  <span>Custom Line</span>
                </button>
              </div>

              {/* Live search dropdown results */}
              {itemSearchQuery && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-850 border border-slate-700 rounded-lg shadow-2xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-800">
                  {filteredItems.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => addItemToBill(item)}
                      className="p-2.5 hover:bg-indigo-950/40 cursor-pointer flex justify-between items-center text-xs transition"
                    >
                      <div>
                        <div className="font-bold text-slate-100 flex items-center gap-1.5">
                          <span>{item.name}</span>
                          {item.itemType === 'Service' && (
                            <span className="px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800 text-[9px] font-bold uppercase">
                              Service
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.itemType === 'Service' ? 'SAC: ' + (item.sacCode || item.hsnCode) : 'HSN: ' + item.hsnCode} | GST: {item.gstRate}% | {item.itemType === 'Service' ? 'Service Fee' : `Current Stock: ${item.currentStock} ${item.uqc}`}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-indigo-400 font-extrabold">₹{(item.purchaseRate || item.saleRate).toFixed(2)}</div>
                        <div className="text-[10px] text-slate-500">per {item.uqc}</div>
                      </div>
                    </div>
                  ))}

                  {filteredItems.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-500">
                      No items found. Click "+ New Item" to create it.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto border border-slate-800 rounded-lg max-h-[360px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-850 text-slate-400 uppercase text-[10px] font-bold tracking-wider z-10">
                  <tr className="border-b border-slate-800">
                    <th className="p-2.5 text-center w-8">#</th>
                    <th className="p-2.5">Item / Service Description</th>
                    <th className="p-2.5 text-center w-20">HSN/SAC</th>
                    <th className="p-2.5 text-right w-20">Qty</th>
                    <th className="p-2.5 text-right w-24">Purchase Rate</th>
                    <th className="p-2.5 text-right w-20">Disc %</th>
                    <th className="p-2.5 text-right w-24">Taxable</th>
                    <th className="p-2.5 text-center w-16">GST%</th>
                    <th className="p-2.5 text-right w-24">Total (₹)</th>
                    <th className="p-2.5 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {lineItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/50 transition">
                      <td className="p-2.5 text-center text-slate-500">{idx + 1}</td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateLineItem(idx, 'name', e.target.value)}
                          placeholder="Item name"
                          className="w-full bg-slate-800 text-slate-100 text-xs px-2 py-1 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.hsnCode}
                          onChange={(e) => updateLineItem(idx, 'hsnCode', e.target.value)}
                          className="w-full bg-slate-800 text-slate-100 text-center font-mono text-xs px-1.5 py-1 rounded border border-slate-700"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(idx, 'quantity', Number(e.target.value))}
                          min="1"
                          className="w-full bg-slate-800 text-slate-100 text-right font-mono text-xs px-1.5 py-1 rounded border border-slate-700"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.purchaseRate || ''}
                          onChange={(e) => updateLineItem(idx, 'purchaseRate', Number(e.target.value))}
                          step="0.01"
                          className="w-full bg-slate-800 text-slate-100 text-right font-mono text-xs px-1.5 py-1 rounded border border-slate-700 font-bold"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.discountPercent || ''}
                          onChange={(e) => updateLineItem(idx, 'discountPercent', Number(e.target.value))}
                          className="w-full bg-slate-800 text-slate-100 text-right font-mono text-xs px-1.5 py-1 rounded border border-slate-700"
                        />
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold text-slate-200">
                        ₹{item.taxableValue.toFixed(2)}
                      </td>
                      <td className="p-2">
                        <select
                          value={item.gstRate}
                          onChange={(e) => updateLineItem(idx, 'gstRate', Number(e.target.value))}
                          className="w-full bg-slate-800 text-slate-100 text-center font-mono text-xs px-1 py-1 rounded border border-slate-700"
                        >
                          {GST_RATES.map((r) => (
                            <option key={r} value={r}>
                              {r}%
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-indigo-400">
                        ₹{item.total.toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => removeLineItem(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {lineItems.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-slate-500 text-xs">
                        No purchase line items added. Search items above or click "+ New Item" to insert inward stock!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Totals & Action Bar */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex flex-wrap gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Taxable Value</span>
                  <span className="text-slate-200 font-bold">₹{totalTaxable.toFixed(2)}</span>
                </div>
                {isInterState ? (
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Input IGST</span>
                    <span className="text-indigo-400 font-bold">₹{totalIgst.toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Input CGST</span>
                      <span className="text-indigo-400 font-bold">₹{totalCgst.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Input SGST</span>
                      <span className="text-indigo-400 font-bold">₹{totalSgst.toFixed(2)}</span>
                    </div>
                  </>
                )}
                {roundOff !== 0 && (
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Round Off</span>
                    <span className="text-slate-400 font-bold">₹{roundOff.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-indigo-400 block tracking-wider">
                  Grand Total Payable
                </span>
                <span className="text-2xl font-black font-mono text-slate-100">
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Save & Actions */}
            <div className="flex justify-between items-center gap-3">
              <button
                onClick={resetBill}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs border border-slate-700 transition"
              >
                Clear / Reset
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSavePurchaseBill(true)}
                  disabled={isSubmitting || lineItems.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 font-bold text-xs border border-slate-700 transition disabled:opacity-50"
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Save Draft</span>
                </button>

                <button
                  onClick={() => handleSavePurchaseBill(false)}
                  disabled={isSubmitting || lineItems.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-950/80 transition active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Save & Post Purchase Bill'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Supplier Modal */}
      {showQuickSupplierModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span>Quick Add Supplier</span>
            </h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Supplier / Vendor Name *</label>
                <input
                  type="text"
                  value={quickSupplierName}
                  onChange={(e) => setQuickSupplierName(e.target.value)}
                  placeholder="e.g. UltraTech Cement Wholesalers"
                  className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Supplier GSTIN</label>
                <input
                  type="text"
                  value={quickSupplierGstin}
                  onChange={(e) => setQuickSupplierGstin(e.target.value.toUpperCase())}
                  placeholder="10AAAAA0000A1Z5"
                  className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Phone</label>
                <input
                  type="text"
                  value={quickSupplierPhone}
                  onChange={(e) => setQuickSupplierPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowQuickSupplierModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuickSupplier}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Save Supplier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Quick Add Item Modal */}
      {showQuickItemModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Add Item to Master & Insert in Bill</span>
              </h3>

              <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setQuickItemType('Goods')}
                  className={`px-3 py-1 rounded transition ${
                    quickItemType === 'Goods' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  Goods
                </button>
                <button
                  type="button"
                  onClick={() => setQuickItemType('Service')}
                  className={`px-3 py-1 rounded transition ${
                    quickItemType === 'Service' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  Service
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">
                  {quickItemType === 'Service' ? 'Service Name *' : 'Product Name *'}
                </label>
                <input
                  type="text"
                  value={quickItemName}
                  onChange={(e) => setQuickItemName(e.target.value)}
                  placeholder={quickItemType === 'Service' ? 'e.g. Inward Freight Charges' : 'e.g. Asian Paints Royale 20L'}
                  className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">
                    {quickItemType === 'Service' ? 'SAC Code *' : 'HSN Code *'}
                  </label>
                  <input
                    type="text"
                    value={quickItemHsn}
                    onChange={(e) => setQuickItemHsn(e.target.value)}
                    placeholder={quickItemType === 'Service' ? '997114' : '2523'}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">UQC Unit</label>
                  <select
                    value={quickItemUqc}
                    onChange={(e) => setQuickItemUqc(e.target.value)}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                  >
                    {GST_UQC_UNITS.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">GST Rate (%)</label>
                  <select
                    value={quickItemGst}
                    onChange={(e) => setQuickItemGst(Number(e.target.value))}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                  >
                    {GST_RATES.map((r) => (
                      <option key={r} value={r}>
                        {r}%
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Purchase Rate (₹)</label>
                  <input
                    type="number"
                    value={quickItemPurchaseRate || ''}
                    onChange={(e) => setQuickItemPurchaseRate(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Sale Rate / MRP (₹)</label>
                  <input
                    type="number"
                    value={quickItemSaleRate || ''}
                    onChange={(e) => setQuickItemSaleRate(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowQuickItemModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuickItem}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Add & Select Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Bank & POS Charges Modal */}
      {showBankChargesModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
              <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Bank MDR & POS Charges Entry (SAC 997114)
                </h3>
                <p className="text-xs text-slate-400">
                  Claim Input Tax Credit (ITC) for bank processing & swipe machine rental
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Bank / Provider Ledger Account</label>
                <input
                  type="text"
                  value={bankProviderName}
                  onChange={(e) => setBankProviderName(e.target.value)}
                  placeholder="e.g. State Bank of India / Razorpay / Pine Labs"
                  className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Bank Tax Invoice #</label>
                  <input
                    type="text"
                    value={bankInvoiceNo}
                    onChange={(e) => setBankInvoiceNo(e.target.value)}
                    placeholder="MDR-APR-2026"
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Bank GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={bankProviderGstin}
                    onChange={(e) => setBankProviderGstin(e.target.value.toUpperCase())}
                    placeholder="10AAACS4654H1ZF"
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Taxable Fee Amount (₹) *</label>
                  <input
                    type="number"
                    value={bankMdrTaxable || ''}
                    onChange={(e) => setBankMdrTaxable(Number(e.target.value))}
                    placeholder="500.00"
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">GST Rate (%)</label>
                  <input
                    type="text"
                    readOnly
                    value="18% (9% CGST + 9% SGST)"
                    className="w-full bg-slate-800 text-emerald-400 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Input CGST (9%):</span>
                  <span className="font-mono text-slate-200">₹{(bankMdrTaxable * 0.09).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Input SGST (9%):</span>
                  <span className="font-mono text-slate-200">₹{(bankMdrTaxable * 0.09).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-100 border-t border-slate-800 pt-1">
                  <span>Total Deducted by Bank:</span>
                  <span className="font-mono text-sky-400">₹{(bankMdrTaxable * 1.18).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowBankChargesModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBankCharges}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg"
              >
                {isSubmitting ? 'Posting...' : 'Post Bank Charges Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-850 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-100">Purchase Bills Register</h3>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={registerSearch}
                    onChange={(e) => setRegisterSearch(e.target.value)}
                    placeholder="Search supplier, bill #..."
                    className="bg-slate-800 text-slate-100 text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none"
                  />
                </div>
                <button
                  onClick={loadRegisterData}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowRegisterModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {registerLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Loading purchase bills...</span>
                </div>
              ) : purchasesList.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No purchase records found. Record a purchase bill to populate this register!
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold text-[10px] uppercase">
                      <th className="py-2.5 px-3">
                        <button
                          onClick={() => {
                            if (registerSortField === 'date') {
                              setRegisterSortOrder(registerSortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setRegisterSortField('date');
                              setRegisterSortOrder('desc');
                            }
                          }}
                          className="flex items-center gap-1 hover:text-slate-200"
                        >
                          <span>Date</span>
                          {registerSortField === 'date' ? (
                            registerSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3">
                        <button
                          onClick={() => {
                            if (registerSortField === 'billNumber') {
                              setRegisterSortOrder(registerSortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setRegisterSortField('billNumber');
                              setRegisterSortOrder('asc');
                            }
                          }}
                          className="flex items-center gap-1 hover:text-slate-200"
                        >
                          <span>Bill #</span>
                          {registerSortField === 'billNumber' ? (
                            registerSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3">
                        <button
                          onClick={() => {
                            if (registerSortField === 'supplierInvoiceNumber') {
                              setRegisterSortOrder(registerSortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setRegisterSortField('supplierInvoiceNumber');
                              setRegisterSortOrder('asc');
                            }
                          }}
                          className="flex items-center gap-1 hover:text-slate-200"
                        >
                          <span>Supplier Inv #</span>
                          {registerSortField === 'supplierInvoiceNumber' ? (
                            registerSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3">
                        <button
                          onClick={() => {
                            if (registerSortField === 'supplierName') {
                              setRegisterSortOrder(registerSortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setRegisterSortField('supplierName');
                              setRegisterSortOrder('asc');
                            }
                          }}
                          className="flex items-center gap-1 hover:text-slate-200"
                        >
                          <span>Supplier</span>
                          {registerSortField === 'supplierName' ? (
                            registerSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3">Items</th>
                      <th className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            if (registerSortField === 'grandTotal') {
                              setRegisterSortOrder(registerSortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setRegisterSortField('grandTotal');
                              setRegisterSortOrder('desc');
                            }
                          }}
                          className="flex items-center gap-1 justify-end w-full hover:text-slate-200"
                        >
                          <span>Grand Total</span>
                          {registerSortField === 'grandTotal' ? (
                            registerSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            if (registerSortField === 'paymentStatus') {
                              setRegisterSortOrder(registerSortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setRegisterSortField('paymentStatus');
                              setRegisterSortOrder('asc');
                            }
                          }}
                          className="flex items-center gap-1 justify-center w-full hover:text-slate-200"
                        >
                          <span>Status</span>
                          {registerSortField === 'paymentStatus' ? (
                            registerSortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {[...purchasesList]
                      .sort((a, b) => {
                        let res = 0;
                        if (registerSortField === 'billNumber') {
                          res = a.billNumber.localeCompare(b.billNumber, undefined, { numeric: true, sensitivity: 'base' });
                        } else if (registerSortField === 'supplierInvoiceNumber') {
                          res = (a.supplierInvoiceNumber || '').localeCompare(b.supplierInvoiceNumber || '', undefined, {
                            numeric: true,
                            sensitivity: 'base',
                          });
                        } else if (registerSortField === 'date') {
                          res = new Date(a.date).getTime() - new Date(b.date).getTime();
                        } else if (registerSortField === 'supplierName') {
                          res = (a.supplierName || '').localeCompare(b.supplierName || '');
                        } else if (registerSortField === 'grandTotal') {
                          res = Number(a.grandTotal || 0) - Number(b.grandTotal || 0);
                        } else if (registerSortField === 'paymentStatus') {
                          res = (a.paymentStatus || '').localeCompare(b.paymentStatus || '');
                        }
                        return registerSortOrder === 'asc' ? res : -res;
                      })
                      .map((p) => {
                        const isCancelled = p.paymentStatus === 'Cancelled';
                        return (
                          <tr
                            key={p._id}
                            className={`hover:bg-slate-850/50 transition ${isCancelled ? 'bg-rose-950/20 opacity-75' : ''}`}
                          >
                            <td className="py-2.5 px-3 font-mono text-slate-400">
                              {p.date ? new Date(p.date).toLocaleDateString('en-IN') : '—'}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">
                              {p.billNumber}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-300">
                              {p.supplierInvoiceNumber}
                            </td>
                            <td className="py-2.5 px-3 text-slate-200 font-semibold">
                              {p.supplierName}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                              {p.items?.length || 0} items
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                              ₹{Number(p.grandTotal || 0).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isCancelled ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-950 text-rose-300 border border-rose-800">
                                  CANCELLED
                                </span>
                              ) : (
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    p.paymentStatus === 'Paid'
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                      : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                  }`}
                                >
                                  {p.paymentStatus || 'Unpaid'}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setSavedPurchase(p);
                                    setShowRegisterModal(false);
                                    setShowPrintModal(true);
                                  }}
                                  className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition flex items-center gap-1"
                                  title="Print Purchase Record"
                                >
                                  <Printer className="w-3 h-3" />
                                  <span>Print</span>
                                </button>
                                <button
                                  onClick={() => handleDeletePurchase(p._id, p.billNumber)}
                                  className="p-1 rounded bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-700 transition"
                                  title="Delete purchase bill"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Print Purchase Modal */}
      {showPrintModal && savedPurchase && (
        <PrintPurchaseModal
          purchase={savedPurchase}
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          onNewBill={resetBill}
        />
      )}

      {/* Contextual Help Drawer */}
      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        initialTopicId="purchase"
      />
    </div>
  );
};
