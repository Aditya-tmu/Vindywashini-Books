import React from 'react';
import {
  Receipt,
  Plus,
  Trash2,
  Printer,
  Mail,
  MessageSquare,
  Search,
  ExternalLink,
  Folder,
  Copy,
  Check,
  CheckCircle2,
  CreditCard,
  Building2,
  QrCode,
  Sparkles,
  FileText,
  Edit3,
  RefreshCw,
  X,
  Hash,
  HelpCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileDown,
  Save,
  Cloud,
} from 'lucide-react';


import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import { Item, Party, Invoice } from '../types';
import { INDIAN_STATES } from '../config/constants';
import { PrintInvoiceModal } from '../components/PrintInvoiceModal';
import { HelpDrawer } from '../components/HelpDrawer';

interface LineItem {
  itemId?: string;
  name: string;
  hsnCode: string;
  uqc: string;
  quantity: number;
  rate: number;
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

export const BillingView: React.FC = () => {
  const {
    activeCompany,
    settings,
    showToast,
    fetchCompanies,
    editingInvoiceId: storeEditingInvoiceId,
    setEditingInvoiceId: setStoreEditingInvoiceId,
  } = useAppStore();

  // Master gate: Check if Supabase Storage is configured & enabled
  const isStorageConfigured = Boolean(settings?.storage?.enabled);
  const storagePrefKey = activeCompany ? `saral_cloud_upload_pref_${activeCompany._id}` : 'saral_cloud_upload_pref';
  const [uploadToCloud, setUploadToCloud] = React.useState<boolean>(() => {
    const saved = localStorage.getItem(storagePrefKey);
    return saved !== null ? saved === 'true' : true;
  });

  React.useEffect(() => {
    if (activeCompany) {
      const saved = localStorage.getItem(`saral_cloud_upload_pref_${activeCompany._id}`);
      if (saved !== null) {
        setUploadToCloud(saved === 'true');
      }
    }
  }, [activeCompany?._id]);

  const handleToggleCloudUpload = (checked: boolean) => {
    setUploadToCloud(checked);
    if (activeCompany) {
      localStorage.setItem(`saral_cloud_upload_pref_${activeCompany._id}`, String(checked));
    } else {
      localStorage.setItem('saral_cloud_upload_pref', String(checked));
    }
  };

  // Mode: 'Standard' or 'POS'
  const [billingMode, setBillingMode] = React.useState<'Standard' | 'POS'>('Standard');


  // Custom Invoice Number & Edit Mode
  const [customInvoiceNumber, setCustomInvoiceNumber] = React.useState<string>('');
  const [editingInvoiceId, setEditingInvoiceId] = React.useState<string | null>(null);
  const [isRefreshingSeq, setIsRefreshingSeq] = React.useState<boolean>(false);

  // Customer info
  const [parties, setParties] = React.useState<Party[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>('');
  const [customerName, setCustomerName] = React.useState<string>('Walk-in Customer');
  const [customerGstin, setCustomerGstin] = React.useState<string>('');
  const [customerPhone, setCustomerPhone] = React.useState<string>('');
  const [customerEmail, setCustomerEmail] = React.useState<string>('');
  const [customerAddress, setCustomerAddress] = React.useState<string>('');
  const [placeOfSupply, setPlaceOfSupply] = React.useState<string>('10-Bihar');

  // Items
  const [inventoryItems, setInventoryItems] = React.useState<Item[]>([]);
  const [lineItems, setLineItems] = React.useState<LineItem[]>([]);
  const [itemSearchQuery, setItemSearchQuery] = React.useState<string>('');

  // Payment & Config
  const [paymentMode, setPaymentMode] = React.useState<'Cash' | 'Credit' | 'Bank' | 'UPI'>('Cash');
  const [paidAmount, setPaidAmount] = React.useState<number>(0);
  const [templateChoice, setTemplateChoice] = React.useState<'POS-58' | 'POS-80' | 'A5' | 'A4'>('A4');
  const [notes, setNotes] = React.useState<string>('');

  // After save state (Print & Delivery modal)
  const [savedInvoice, setSavedInvoice] = React.useState<Invoice | null>(null);
  const [showDeliveryModal, setShowDeliveryModal] = React.useState<boolean>(false);
  const [emailSending, setEmailSending] = React.useState<boolean>(false);
  const [whatsappSending, setWhatsappSending] = React.useState<boolean>(false);
  const [waFallbackUrl, setWaFallbackUrl] = React.useState<string>('');
  const [copiedGreeting, setCopiedGreeting] = React.useState<boolean>(false);
  const [isSavingOnly, setIsSavingOnly] = React.useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Past invoices history state

  const [showHistoryModal, setShowHistoryModal] = React.useState(false);
  const [invoicesList, setInvoicesList] = React.useState<Invoice[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historySearch, setHistorySearch] = React.useState('');
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);

  // History Sorting
  const [historySortField, setHistorySortField] = React.useState<'date' | 'invoiceNumber' | 'customerName' | 'grandTotal' | 'paymentStatus'>('date');
  const [historySortOrder, setHistorySortOrder] = React.useState<'asc' | 'desc'>('desc');

  // Quick party add modal
  const [showQuickPartyModal, setShowQuickPartyModal] = React.useState(false);
  const [quickPartyName, setQuickPartyName] = React.useState('');
  const [quickPartyGstin, setQuickPartyGstin] = React.useState('');
  const [quickPartyPhone, setQuickPartyPhone] = React.useState('');


  const refreshNextInvoiceNumber = async () => {
    if (!activeCompany) return;
    try {
      setIsRefreshingSeq(true);
      const res = await api.getNextInvoiceNumber(activeCompany._id);
      if (res && res.formattedInvoiceNumber) {
        setCustomInvoiceNumber(res.formattedInvoiceNumber);
      }
    } catch {
      const prefix = activeCompany.invoicePrefix || 'INV/';
      const seq = activeCompany.invoiceNumberSeq || 1;
      const suffix = activeCompany.invoiceSuffix || '';
      setCustomInvoiceNumber(`${prefix}${String(seq).padStart(4, '0')}${suffix}`);
    } finally {
      setIsRefreshingSeq(false);
    }
  };

  const loadInvoiceHistory = async (query?: string) => {
    if (!activeCompany) return;
    try {
      setHistoryLoading(true);
      const list = await api.getInvoices(activeCompany._id, query !== undefined ? query : historySearch);
      setInvoicesList(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.warn('Error loading past invoices:', err.message);
      setInvoicesList([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadData = async () => {
    if (!activeCompany) return;
    try {
      const [pList, iList] = await Promise.all([
        api.getParties(activeCompany._id, 'Customer'),
        api.getItems(activeCompany._id),
      ]);
      setParties(pList);
      setInventoryItems(iList);
      setTemplateChoice(activeCompany.defaultTemplate || 'A4');
      setPlaceOfSupply(`${activeCompany.address.stateCode}-${activeCompany.address.state}`);

      if (!editingInvoiceId) {
        await refreshNextInvoiceNumber();
      }
    } catch (err: any) {
      console.error('Error loading billing dependencies:', err);
    }
  };

  React.useEffect(() => {
    loadData();
  }, [activeCompany]);

  // Jump to edit invoice when triggered externally (e.g. from Party history modal)
  React.useEffect(() => {
    if (storeEditingInvoiceId && activeCompany) {
      (async () => {
        try {
          const inv = await api.getInvoiceById(storeEditingInvoiceId);
          if (inv) {
            handleEditPastInvoice(inv);
          }
        } catch (e: any) {
          console.error('Error jumping to edit invoice:', e);
        } finally {
          setStoreEditingInvoiceId(null);
        }
      })();
    }
  }, [storeEditingInvoiceId, activeCompany]);

  // When customer changes


  const handleSelectCustomer = (partyId: string) => {
    setSelectedCustomerId(partyId);
    if (!partyId) {
      setCustomerName('Walk-in Customer');
      setCustomerGstin('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerAddress('');
      setPlaceOfSupply(activeCompany ? `${activeCompany.address.stateCode}-${activeCompany.address.state}` : '10-Bihar');
      return;
    }

    const found = parties.find((p) => p._id === partyId);
    if (found) {
      setCustomerName(found.name);
      setCustomerGstin(found.gstin || '');
      setCustomerPhone(found.phone || '');
      setCustomerEmail(found.email || '');
      setCustomerAddress(found.billingAddress?.line1 || '');
      setPlaceOfSupply(found.placeOfSupply || `${found.billingAddress?.stateCode || '10'}-${found.billingAddress?.state || 'Bihar'}`);
    }
  };

  // Determine Inter-state vs Intra-state
  const companyStateCode = activeCompany?.address.stateCode || '10';
  const customerStateCode = placeOfSupply ? placeOfSupply.split('-')[0] : '10';
  const isInterState = companyStateCode !== customerStateCode;

  // Add line item from inventory
  const addItemToBill = (item: Item) => {
    const qty = 1;
    const rate = item.saleRate || 0;
    const taxable = qty * rate;
    const gstRate = item.gstRate || 0;

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
        hsnCode: item.hsnCode || '9983',
        uqc: item.uqc || 'PCS',
        quantity: qty,
        rate,
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

  // Add blank manual item
  const addBlankItem = () => {
    setLineItems([
      ...lineItems,
      {
        name: '',
        hsnCode: '9983',
        uqc: 'PCS',
        quantity: 1,
        rate: 0,
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

  // Update line item
  const updateLineItem = (index: number, field: keyof LineItem, val: any) => {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: val };

    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
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

    item.total = taxable + (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0) + (Number(item.cessAmount) || 0);
    updated[index] = item;
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Totals calculation
  const totalTaxable = lineItems.reduce((acc, it) => acc + (it.taxableValue || 0), 0);
  const totalCgst = lineItems.reduce((acc, it) => acc + (it.cgstAmount || 0), 0);
  const totalSgst = lineItems.reduce((acc, it) => acc + (it.sgstAmount || 0), 0);
  const totalIgst = lineItems.reduce((acc, it) => acc + (it.igstAmount || 0), 0);
  const totalCess = lineItems.reduce((acc, it) => acc + (it.cessAmount || 0), 0);

  const rawGrandTotal = totalTaxable + totalCgst + totalSgst + totalIgst + totalCess;
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = Math.round((roundedGrandTotal - rawGrandTotal) * 100) / 100;

  // Filter items search
  const filteredItems = inventoryItems.filter(
    (it) =>
      itemSearchQuery &&
      (it.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        it.barcode?.includes(itemSearchQuery) ||
        it.hsnCode.includes(itemSearchQuery))
  );

  // Save Only (Save invoice & download PDF directly without opening print modal)
  const handleSaveOnly = async () => {
    if (!activeCompany) return;
    if (lineItems.length === 0) {
      showToast('Please add at least one line item to the bill.', 'error');
      return;
    }

    try {
      setIsSavingOnly(true);
      const invoicePayload: any = {
        companyId: activeCompany._id,
        invoiceNumber: customInvoiceNumber.trim() || undefined,
        customerId: selectedCustomerId || undefined,
        customerName: customerName.trim(),
        customerGstin: customerGstin.trim().toUpperCase(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        billingAddress: {
          line1: customerAddress,
          city: activeCompany.address.city,
          state: placeOfSupply.split('-')[1] || activeCompany.address.state,
          stateCode: customerStateCode,
        },
        placeOfSupply,
        items: lineItems,
        paymentMode,
        paidAmount: paymentMode === 'Cash' ? roundedGrandTotal : paidAmount,
        templateUsed: templateChoice,
        notes,
        uploadToCloud: Boolean(isStorageConfigured && uploadToCloud),
      };

      let res;
      if (editingInvoiceId) {
        res = await api.updateInvoice(editingInvoiceId, invoicePayload);
        showToast(`Invoice #${res.data.invoiceNumber} updated successfully!`, 'success');
      } else {
        res = await api.createInvoice(invoicePayload);
        showToast(`Invoice #${res.data.invoiceNumber} saved successfully!`, 'success');
      }

      if (res.success && res.data) {
        // Reset form for next invoice
        setEditingInvoiceId(null);
        setLineItems([]);
        setSelectedCustomerId('');
        setCustomerName('Walk-in Customer');
        setCustomerGstin('');
        setCustomerPhone('');
        setCustomerEmail('');
        setCustomerAddress('');
        setNotes('');
        setPaidAmount(0);

        await fetchCompanies();
        await refreshNextInvoiceNumber();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    } finally {
      setIsSavingOnly(false);
    }
  };


  // Save and Print
  const handleSaveAndPrint = async () => {
    if (!activeCompany) return;
    if (lineItems.length === 0) {
      showToast('Please add at least one line item to the bill.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const invoicePayload: any = {
        companyId: activeCompany._id,
        invoiceNumber: customInvoiceNumber.trim() || undefined,
        customerId: selectedCustomerId || undefined,
        customerName: customerName.trim(),
        customerGstin: customerGstin.trim().toUpperCase(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        billingAddress: {
          line1: customerAddress,
          city: activeCompany.address.city,
          state: placeOfSupply.split('-')[1] || activeCompany.address.state,
          stateCode: customerStateCode,
        },
        placeOfSupply,
        items: lineItems,
        paymentMode,
        paidAmount: paymentMode === 'Cash' ? roundedGrandTotal : paidAmount,
        templateUsed: templateChoice,
        notes,
        uploadToCloud: Boolean(isStorageConfigured && uploadToCloud),
      };

      let res;
      if (editingInvoiceId) {
        res = await api.updateInvoice(editingInvoiceId, invoicePayload);
        showToast(`Invoice #${res.data.invoiceNumber} updated successfully!`, 'success');
      } else {
        res = await api.createInvoice(invoicePayload);
        showToast(`Invoice #${res.data.invoiceNumber} created and saved successfully!`, 'success');
      }


      if (res.success) {
        setSavedInvoice(res.data);
        setShowDeliveryModal(true);

        // Fetch fresh company profile to sync invoiceNumberSeq in store and compute next sequence
        await fetchCompanies();
        await refreshNextInvoiceNumber();

        // Pre-generate wa.me link for zero-setup instant fallback
        if (customerPhone) {
          const defaultGreeting = `Dear ${customerName}, thank you for shopping with ${activeCompany.tradeName || activeCompany.legalName}! Please find your invoice #${res.data.invoiceNumber} dated ${new Date(res.data.date).toLocaleDateString('en-IN')} attached. Total: ₹${roundedGrandTotal.toFixed(2)}. We appreciate your business!`;
          const waUrl = `https://wa.me/91${customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(defaultGreeting)}`;
          setWaFallbackUrl(waUrl);
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Global shortcuts: Alt+S (Save & Print) and Ctrl+S (Save Invoice)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (lineItems.length > 0 && !isSubmitting && !isSavingOnly) {
          handleSaveAndPrint();
        }
      } else if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (lineItems.length > 0 && !isSubmitting && !isSavingOnly) {
          handleSaveOnly();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lineItems, activeCompany, customInvoiceNumber, selectedCustomerId, customerName, customerGstin, customerPhone, customerEmail, customerAddress, placeOfSupply, paymentMode, roundedGrandTotal, paidAmount, templateChoice, notes, editingInvoiceId, isSavingOnly, isSubmitting]);



  // Edit an existing past invoice
  const handleEditPastInvoice = (inv: Invoice) => {
    setEditingInvoiceId(inv._id);
    setSelectedCustomerId(inv.customerId || '');
    setCustomerName(inv.customerName || 'Walk-in Customer');
    setCustomerGstin(inv.customerGstin || '');
    setCustomerPhone(inv.customerPhone || '');
    setCustomerEmail(inv.customerEmail || '');
    setCustomerAddress(inv.billingAddress?.line1 || '');
    setPlaceOfSupply(inv.placeOfSupply || (activeCompany ? `${activeCompany.address.stateCode}-${activeCompany.address.state}` : '10-Bihar'));
    setCustomInvoiceNumber(inv.invoiceNumber || '');
    setLineItems(
      (inv.items || []).map((it) => ({
        itemId: it.itemId || '',
        name: it.name,
        hsnCode: it.hsnCode || '9983',
        quantity: it.quantity || 1,
        uqc: it.uqc || 'PCS',
        rate: it.rate || 0,
        discountPercent: it.discountPercent || 0,
        discountAmount: it.discountAmount || 0,
        taxableValue: it.taxableValue || 0,
        gstRate: it.gstRate || 0,
        cgstAmount: it.cgstAmount || 0,
        sgstAmount: it.sgstAmount || 0,
        igstAmount: it.igstAmount || 0,
        cessAmount: it.cessAmount || 0,
        total: it.total || 0,
      }))
    );
    setPaymentMode((inv.paymentMode as any) || 'Cash');
    setPaidAmount(inv.paidAmount || 0);
    setTemplateChoice((inv.templateUsed as any) || 'A4');
    setNotes(inv.notes || '');
    setShowHistoryModal(false);
    showToast(`Loaded invoice #${inv.invoiceNumber} for editing.`, 'info');
  };

  // Delete an existing past invoice
  const handleDeletePastInvoice = async (inv: Invoice) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete Invoice #${inv.invoiceNumber}? This will also reverse all accounting ledger entries.`
      )
    ) {
      return;
    }
    try {
      await api.deleteInvoice(inv._id);
      showToast(`Invoice #${inv.invoiceNumber} deleted successfully!`, 'success');
      await loadInvoiceHistory();
      if (editingInvoiceId === inv._id) {
        await resetBill();
      }
    } catch (err: any) {
      showToast('Error deleting invoice: ' + err.message, 'error');
    }
  };

  // Quick Party Create
  const handleQuickCreateParty = async () => {
    if (!quickPartyName.trim() || !activeCompany) return;
    try {
      const created = await api.createParty({
        name: quickPartyName.trim(),
        type: 'Customer',
        gstin: quickPartyGstin.trim().toUpperCase(),
        phone: quickPartyPhone.trim(),
        placeOfSupply,
        companyId: activeCompany._id,
      });

      setParties([...parties, created]);
      handleSelectCustomer(created._id);
      setShowQuickPartyModal(false);
      setQuickPartyName('');
      setQuickPartyGstin('');
      setQuickPartyPhone('');
      showToast(`Customer ${created.name} added and selected!`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    }
  };

  // Reset bill
  const resetBill = async () => {
    setEditingInvoiceId(null);
    setSelectedCustomerId('');
    setCustomerName('Walk-in Customer');
    setCustomerGstin('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setLineItems([]);
    setSavedInvoice(null);
    setShowDeliveryModal(false);
    setPaidAmount(0);

    await refreshNextInvoiceNumber();
  };

  // Email action
  const handleSendEmail = async () => {
    if (!savedInvoice || !activeCompany) return;
    try {
      setEmailSending(true);
      await api.sendEmail(savedInvoice._id, activeCompany._id, customerEmail);
      showToast(`Invoice emailed successfully to ${customerEmail || savedInvoice.customerEmail}!`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    } finally {
      setEmailSending(false);
    }
  };

  // WhatsApp Cloud API send
  const handleSendWhatsAppApi = async () => {
    if (!savedInvoice || !activeCompany) return;
    try {
      setWhatsappSending(true);
      await api.sendWhatsApp(savedInvoice._id, activeCompany._id, customerPhone, undefined, false);
      showToast(`WhatsApp message sent successfully via Meta Cloud API!`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    } finally {
      setWhatsappSending(false);
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-4rem)]">
      {/* Top Controls Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-100 flex items-center gap-2">
              <span>Billing & POS Terminal</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                GST Ready
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Tax split logic: {isInterState ? 'Inter-State (IGST 100%)' : 'Intra-State (CGST 50% + SGST 50%)'}
            </p>
          </div>
        </div>

        {/* Mode & Template Pickers */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => {
                setBillingMode('Standard');
                setTemplateChoice('A4');
              }}
              className={`px-3 py-1 rounded transition ${
                billingMode === 'Standard' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Standard A4/A5
            </button>
            <button
              onClick={() => {
                setBillingMode('POS');
                setTemplateChoice('POS-80');
              }}
              className={`px-3 py-1 rounded transition ${
                billingMode === 'POS' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              POS Thermal
            </button>
          </div>

          {/* Editable Invoice Number */}
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
            <Hash className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[10px] uppercase font-bold text-slate-400">Inv #:</span>
            <input
              type="text"
              value={customInvoiceNumber}
              onChange={(e) => setCustomInvoiceNumber(e.target.value)}
              placeholder="INV/0001/25-26"
              className="bg-transparent text-emerald-400 font-mono font-bold text-xs w-32 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1"
              title="Edit Invoice Number"
            />
            <button
              type="button"
              onClick={refreshNextInvoiceNumber}
              disabled={isRefreshingSeq}
              className="text-slate-400 hover:text-emerald-400 transition p-0.5"
              title="Refresh / Compute Next Sequential Number"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshingSeq ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>

          <select
            value={templateChoice}
            onChange={(e: any) => setTemplateChoice(e.target.value)}
            className="bg-slate-800 text-slate-100 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700"
          >
            <option value="A4">A4 Tax Invoice (Full)</option>
            <option value="A5">A5 Compact (Half Page)</option>
            <option value="POS-80">POS 80mm Thermal</option>
            <option value="POS-58">POS 58mm Thermal</option>
          </select>

          <button
            onClick={() => {
              setShowHistoryModal(true);
              loadInvoiceHistory();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Folder className="w-3.5 h-3.5 text-emerald-400" />
            <span>Past Invoices</span>
          </button>

          <button
            onClick={() => setIsHelpOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition"
            title="Open Invoicing & POS Guide"
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>Help</span>
          </button>
        </div>
      </div>

      {/* Editing Existing Invoice Alert Banner */}
      {editingInvoiceId && (
        <div className="bg-amber-950/80 border border-amber-500/50 p-3 rounded-xl flex items-center justify-between gap-3 text-amber-200 text-xs shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-amber-400" />
            <span>
              <b>Editing Mode:</b> Modifying Invoice <b>#{customInvoiceNumber}</b>. Saving will update the existing invoice records and accounting entries.
            </span>
          </div>
          <button
            onClick={resetBill}
            className="px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 text-[11px] font-bold border border-slate-700 transition flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel Edit & New Bill</span>
          </button>
        </div>
      )}

      {/* Two Column Layout: Billing Info & Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer & Invoice Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Customer Details</span>
            </h2>

            <button
              onClick={() => setShowQuickPartyModal(true)}
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Quick Add</span>
            </button>
          </div>

          {/* Customer Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400">Select Existing Party</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => handleSelectCustomer(e.target.value)}
              className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">-- Walk-in / Unregistered Customer --</option>
              {parties.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} {p.gstin ? `(${p.gstin})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Customer Name *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Walk-in Customer"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Mobile (WhatsApp) *</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="9876543210"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">GSTIN (B2B)</label>
              <input
                type="text"
                value={customerGstin}
                onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="10AAAAA0000A1Z5"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Email (PDF send)</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="customer@email.com"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400">Place of Supply (State)</label>
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

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400">Billing Address</label>
            <textarea
              rows={2}
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700"
              placeholder="Road, Area, City, Pincode"
            />
          </div>

          {/* Payment Mode Selection */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-[11px] font-bold text-slate-300 block">Payment Mode</label>
            <div className="grid grid-cols-4 gap-2">
              {(['Cash', 'UPI', 'Bank', 'Credit'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2 rounded-lg text-xs font-bold transition border ${
                    paymentMode === mode
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Item Search, Table, Totals */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Item Search / Barcode Input */}
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    placeholder="Search item by name, barcode, or HSN code..."
                    className="w-full bg-slate-800 text-slate-100 text-xs pl-9 pr-4 py-2.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <button
                  onClick={addBlankItem}
                  className="flex items-center gap-1 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Custom Line</span>
                </button>
              </div>

              {/* Search dropdown results */}
              {itemSearchQuery && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-850 border border-slate-700 rounded-lg shadow-2xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-800">
                  {filteredItems.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => addItemToBill(item)}
                      className="p-2.5 hover:bg-emerald-950/40 cursor-pointer flex justify-between items-center text-xs transition"
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
                          {item.itemType === 'Service' ? 'SAC: ' + (item.sacCode || item.hsnCode) : 'HSN: ' + item.hsnCode} | GST: {item.gstRate}% | {item.itemType === 'Service' ? 'Service Fee' : `Stock: ${item.currentStock} ${item.uqc}`}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-emerald-400 font-extrabold">₹{item.saleRate.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-500">per {item.uqc}</div>
                      </div>
                    </div>
                  ))}

                  {filteredItems.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-500">
                      No matching items found. Click "Add Custom Line" to insert manually.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto max-h-[340px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] bg-slate-950/40 sticky top-0">
                    <th className="py-2 px-2 w-8">#</th>
                    <th className="py-2 px-2">Item Description</th>
                    <th className="py-2 px-2 text-center w-20">HSN</th>
                    <th className="py-2 px-2 text-right w-20">Qty</th>
                    <th className="py-2 px-2 text-right w-24">Rate (₹)</th>
                    <th className="py-2 px-2 text-right w-16">Disc%</th>
                    <th className="py-2 px-2 text-right w-20">GST%</th>
                    <th className="py-2 px-2 text-right w-24">Total (₹)</th>
                    <th className="py-2 px-2 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {lineItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/40 transition">
                      <td className="py-2 px-2 text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateLineItem(idx, 'name', e.target.value)}
                          className="w-full bg-transparent text-slate-100 text-xs font-semibold focus:outline-none border-b border-transparent focus:border-emerald-500"
                          placeholder="Item name..."
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <input
                          type="text"
                          value={item.hsnCode}
                          onChange={(e) => updateLineItem(idx, 'hsnCode', e.target.value)}
                          className="w-full bg-transparent text-slate-400 text-center text-xs font-mono focus:outline-none border-b border-transparent focus:border-emerald-500"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                          className="w-full bg-slate-800 text-slate-100 text-right text-xs font-mono font-bold px-1.5 py-1 rounded border border-slate-700"
                          min="1"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateLineItem(idx, 'rate', e.target.value)}
                          className="w-full bg-slate-800 text-slate-100 text-right text-xs font-mono font-bold px-1.5 py-1 rounded border border-slate-700"
                          min="0"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          value={item.discountPercent}
                          onChange={(e) => updateLineItem(idx, 'discountPercent', e.target.value)}
                          className="w-full bg-transparent text-slate-400 text-right text-xs font-mono focus:outline-none border-b border-transparent focus:border-emerald-500"
                          min="0"
                          max="100"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <select
                          value={item.gstRate}
                          onChange={(e) => updateLineItem(idx, 'gstRate', Number(e.target.value))}
                          className="bg-slate-800 text-slate-200 text-xs font-mono py-1 rounded border border-slate-700"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-bold text-slate-100">
                        ₹{item.total.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => removeLineItem(idx)}
                          className="text-slate-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {lineItems.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                        Search and select items above or click "Add Custom Line" to start billing!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Totals & Actions Banner */}
          <div className="pt-4 border-t border-slate-800 flex flex-col md:flex-row justify-between items-end gap-4">
            {/* Tax breakdown summary */}
            <div className="text-xs text-slate-400 space-y-1">
              <div>
                Taxable Subtotal: <span className="font-mono font-bold text-slate-200">₹{totalTaxable.toFixed(2)}</span>
              </div>
              {isInterState ? (
                <div>
                  IGST Total: <span className="font-mono font-bold text-slate-200">₹{totalIgst.toFixed(2)}</span>
                </div>
              ) : (
                <div className="flex gap-4">
                  <span>
                    CGST: <span className="font-mono font-bold text-slate-200">₹{totalCgst.toFixed(2)}</span>
                  </span>
                  <span>
                    SGST: <span className="font-mono font-bold text-slate-200">₹{totalSgst.toFixed(2)}</span>
                  </span>
                </div>
              )}
              {roundOff !== 0 && (
                <div>
                  Round Off: <span className="font-mono font-bold text-slate-200">₹{roundOff.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Grand Total & Action Buttons */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
              {/* Opt-in Cloud Storage Upload Checkbox */}
              {isStorageConfigured ? (
                <label className="flex items-center gap-2 cursor-pointer select-none group bg-slate-900/90 hover:bg-slate-850 px-3 py-3 rounded-xl border border-slate-800 hover:border-slate-700 transition shadow-md">
                  <input
                    type="checkbox"
                    checked={uploadToCloud}
                    onChange={(e) => handleToggleCloudUpload(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-700 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                  />
                  <div className="flex items-center gap-1.5 text-xs text-slate-300 group-hover:text-white">
                    <Cloud className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="font-semibold text-xs whitespace-nowrap">Save to Cloud & Link</span>
                  </div>
                </label>
              ) : null}

              <div className="text-right mr-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Grand Total</span>
                <span className="text-3xl font-black font-mono text-emerald-400">
                  ₹{roundedGrandTotal.toFixed(2)}
                </span>
              </div>

              {/* Save Invoice (Save only to database, no print dialog, no PDF download) */}
              <button
                type="button"
                onClick={handleSaveOnly}
                disabled={lineItems.length === 0 || isSavingOnly || isSubmitting}
                className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-750 hover:border-emerald-500/50 disabled:opacity-50 text-slate-200 hover:text-white font-bold text-sm shadow-lg active:scale-95 transition cursor-pointer"
                title="Save invoice to database without opening print dialog (Ctrl+S)"
              >
                {isSavingOnly ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                ) : (
                  <Save className="w-4 h-4 text-emerald-400" />
                )}
                <span>Save Invoice</span>
              </button>


              {/* Save & Print (Save and open print modal) */}
              <button
                type="button"
                onClick={handleSaveAndPrint}
                disabled={lineItems.length === 0 || isSavingOnly || isSubmitting}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-sm shadow-xl shadow-emerald-950/80 active:scale-95 transition cursor-pointer"
                title="Save invoice & open print dialog (Alt+S)"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Printer className="w-4 h-4 text-white" />
                )}
                <span>Save & Print (Alt+S)</span>
              </button>
            </div>




          </div>
        </div>
      </div>

      {/* Quick Party Add Modal */}
      {showQuickPartyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100">Add New Customer</h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Customer / Business Name *</label>
                <input
                  type="text"
                  value={quickPartyName}
                  onChange={(e) => setQuickPartyName(e.target.value)}
                  className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded border border-slate-700"
                  placeholder="e.g. Ramesh Hardware"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">GSTIN (Optional for B2B)</label>
                <input
                  type="text"
                  value={quickPartyGstin}
                  onChange={(e) => setQuickPartyGstin(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded border border-slate-700 font-mono"
                  placeholder="10ABCDE1234F1Z5"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Mobile Number</label>
                <input
                  type="text"
                  value={quickPartyPhone}
                  onChange={(e) => setQuickPartyPhone(e.target.value)}
                  className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded border border-slate-700 font-mono"
                  placeholder="9876543210"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowQuickPartyModal(false)}
                className="px-4 py-2 rounded bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickCreateParty}
                className="px-4 py-2 rounded bg-emerald-600 text-white text-xs font-bold"
              >
                Save Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Past Invoices Explorer Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-850 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Past Invoices & Sales Register</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-800 flex gap-3 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    loadInvoiceHistory(e.target.value);
                  }}
                  placeholder="Search invoice #, customer, mobile, GSTIN..."
                  className="w-full bg-slate-800 text-slate-100 text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>
              <div className="text-slate-400 text-xs font-mono">
                {invoicesList.length} Invoices Recorded
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {historyLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Loading invoices...</span>
                </div>
              ) : invoicesList.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No invoices found. Generate a new bill to see it here!
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold text-[10px] uppercase">
                      <th className="py-2.5 px-3">
                        <button
                          onClick={() => {
                            if (historySortField === 'date') {
                              setHistorySortOrder(historySortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setHistorySortField('date');
                              setHistorySortOrder('desc');
                            }
                          }}
                          className="flex items-center gap-1 hover:text-slate-200"
                        >
                          <span>Date</span>
                          {historySortField === 'date' ? (
                            historySortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3">
                        <button
                          onClick={() => {
                            if (historySortField === 'invoiceNumber') {
                              setHistorySortOrder(historySortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setHistorySortField('invoiceNumber');
                              setHistorySortOrder('asc');
                            }
                          }}
                          className="flex items-center gap-1 hover:text-slate-200"
                        >
                          <span>Invoice #</span>
                          {historySortField === 'invoiceNumber' ? (
                            historySortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3">
                        <button
                          onClick={() => {
                            if (historySortField === 'customerName') {
                              setHistorySortOrder(historySortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setHistorySortField('customerName');
                              setHistorySortOrder('asc');
                            }
                          }}
                          className="flex items-center gap-1 hover:text-slate-200"
                        >
                          <span>Customer</span>
                          {historySortField === 'customerName' ? (
                            historySortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3">Items</th>
                      <th className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            if (historySortField === 'grandTotal') {
                              setHistorySortOrder(historySortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setHistorySortField('grandTotal');
                              setHistorySortOrder('desc');
                            }
                          }}
                          className="flex items-center gap-1 justify-end w-full hover:text-slate-200"
                        >
                          <span>Grand Total</span>
                          {historySortField === 'grandTotal' ? (
                            historySortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            if (historySortField === 'paymentStatus') {
                              setHistorySortOrder(historySortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setHistorySortField('paymentStatus');
                              setHistorySortOrder('asc');
                            }
                          }}
                          className="flex items-center gap-1 justify-center w-full hover:text-slate-200"
                        >
                          <span>Status</span>
                          {historySortField === 'paymentStatus' ? (
                            historySortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-400" /> : <ArrowDown className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {[...invoicesList]
                      .sort((a, b) => {
                        let res = 0;
                        if (historySortField === 'invoiceNumber') {
                          res = a.invoiceNumber.localeCompare(b.invoiceNumber, undefined, { numeric: true, sensitivity: 'base' });
                        } else if (historySortField === 'date') {
                          res = new Date(a.date).getTime() - new Date(b.date).getTime();
                        } else if (historySortField === 'customerName') {
                          res = (a.customerName || '').localeCompare(b.customerName || '');
                        } else if (historySortField === 'grandTotal') {
                          res = Number(a.grandTotal || 0) - Number(b.grandTotal || 0);
                        } else if (historySortField === 'paymentStatus') {
                          res = (a.paymentStatus || '').localeCompare(b.paymentStatus || '');
                        }
                        return historySortOrder === 'asc' ? res : -res;
                      })
                      .map((inv) => {
                        const isCancelled = inv.paymentStatus === 'Cancelled';
                        return (
                          <tr
                            key={inv._id}
                            className={`hover:bg-slate-850/50 transition ${isCancelled ? 'bg-rose-950/20 opacity-75' : ''}`}
                          >
                            <td className="py-2.5 px-3 font-mono text-slate-400">
                              {inv.date ? new Date(inv.date).toLocaleDateString('en-IN') : '—'}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-2.5 px-3 text-slate-200 font-semibold">
                              {inv.customerName || 'Walk-in Customer'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                              {inv.items?.length || 0} items
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                              ₹{Number(inv.grandTotal || 0).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isCancelled ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-950 text-rose-300 border border-rose-800">
                                  CANCELLED
                                </span>
                              ) : (
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    inv.paymentStatus === 'Paid'
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                      : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                  }`}
                                >
                                  {inv.paymentStatus || 'Paid'}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setSavedInvoice(inv);
                                    setShowHistoryModal(false);
                                    setShowDeliveryModal(true);
                                  }}
                                  className="px-2.5 py-1 rounded bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-[10px] transition flex items-center gap-1"
                                  title="Print / Save as PDF"
                                >
                                  <Printer className="w-3 h-3" />
                                  <span>Print</span>
                                </button>

                                <button
                                  onClick={() => handleEditPastInvoice(inv)}
                                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white font-bold text-[10px] border border-slate-700 transition flex items-center gap-1"
                                  title="Edit this invoice"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  onClick={() => handleDeletePastInvoice(inv)}
                                  className="p-1 rounded bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-700 transition"
                                  title="Delete this invoice"
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


      {/* Invoice Delivery & Print Hub Modal */}
      {showDeliveryModal && savedInvoice && (
        <PrintInvoiceModal
          invoice={savedInvoice}
          isOpen={showDeliveryModal}
          onClose={() => setShowDeliveryModal(false)}
          onNewBill={resetBill}
        />
      )}

      {/* Contextual Help Drawer */}
      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        initialTopicId="billing"
      />
    </div>
  );
};
