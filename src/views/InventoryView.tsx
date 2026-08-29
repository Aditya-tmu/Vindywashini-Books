import React from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  DollarSign,
  Tag,
  HelpCircle,
  Briefcase,
  Layers,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../services/api';
import { Item } from '../types';
import { GST_UQC_UNITS, GST_RATES } from '../config/constants';
import { HelpDrawer } from '../components/HelpDrawer';

export const InventoryView: React.FC = () => {
  const { activeCompany, showToast } = useAppStore();

  const [items, setItems] = React.useState<Item[]>([]);
  const [stockSummary, setStockSummary] = React.useState<any>(null);
  const [search, setSearch] = React.useState<string>('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('');
  const [typeFilter, setTypeFilter] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = React.useState<boolean>(false);

  // Modal State
  const [showModal, setShowModal] = React.useState<boolean>(false);
  const [editingItem, setEditingItem] = React.useState<Item | null>(null);
  const [formData, setFormData] = React.useState({
    name: '',
    itemType: 'Goods' as 'Goods' | 'Service',
    sku: '',
    barcode: '',
    description: '',
    hsnCode: '9983',
    sacCode: '',
    uqc: 'PCS',
    purchaseRate: 0,
    saleRate: 0,
    gstRate: 18,
    openingStock: 0,
    reorderLevel: 5,
    category: 'General',
  });

  const loadItems = async () => {
    if (!activeCompany) return;
    try {
      setLoading(true);
      const [itemList, summary] = await Promise.all([
        api.getItems(activeCompany._id, search || undefined, categoryFilter || undefined),
        api.getStockSummary(activeCompany._id),
      ]);
      setItems(Array.isArray(itemList) ? itemList : []);
      setStockSummary(summary);
    } catch (err: any) {
      console.warn('Error loading items:', err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadItems();
  }, [activeCompany, search, categoryFilter]);

  const openCreateModal = (defaultType: 'Goods' | 'Service' = 'Goods') => {
    setEditingItem(null);
    setFormData({
      name: '',
      itemType: defaultType,
      sku: '',
      barcode: '',
      description: '',
      hsnCode: defaultType === 'Service' ? '997114' : '2523',
      sacCode: defaultType === 'Service' ? '997114' : '',
      uqc: defaultType === 'Service' ? 'OTH' : 'PCS',
      purchaseRate: 0,
      saleRate: 0,
      gstRate: 18,
      openingStock: 0,
      reorderLevel: 5,
      category: defaultType === 'Service' ? 'Services' : 'General',
    });
    setShowModal(true);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      itemType: item.itemType || 'Goods',
      sku: item.sku || '',
      barcode: item.barcode || '',
      description: item.description || '',
      hsnCode: item.hsnCode,
      sacCode: item.sacCode || (item.itemType === 'Service' ? item.hsnCode : ''),
      uqc: item.uqc,
      purchaseRate: item.purchaseRate,
      saleRate: item.saleRate,
      gstRate: item.gstRate,
      openingStock: item.openingStock,
      reorderLevel: item.reorderLevel,
      category: item.category || 'General',
    });
    setShowModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    if (!formData.name.trim()) {
      showToast('Item name is required', 'error');
      return;
    }

    try {
      const payload: any = {
        ...formData,
        hsnCode: formData.itemType === 'Service' ? (formData.sacCode || formData.hsnCode || '9983') : formData.hsnCode,
        purchaseRate: Number(formData.purchaseRate) || 0,
        saleRate: Number(formData.saleRate) || 0,
        gstRate: Number(formData.gstRate) || 0,
        reorderLevel: formData.itemType === 'Service' ? 0 : Number(formData.reorderLevel) || 0,
        openingStock: formData.itemType === 'Service' ? 0 : Number(formData.openingStock) || 0,
        companyId: activeCompany._id,
      };

      if (editingItem) {
        await api.updateItem(editingItem._id, payload);
        showToast(`${formData.itemType} "${formData.name}" updated successfully!`, 'success');
      } else {
        await api.createItem(payload);
        showToast(`New ${formData.itemType} "${formData.name}" added to catalog!`, 'success');
      }

      setShowModal(false);
      loadItems();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete item "${name}"?`)) return;
    try {
      await api.deleteItem(id);
      showToast(`Item "${name}" deleted successfully`, 'success');
      loadItems();
    } catch (err: any) {
      showToast(err.response?.data?.error || err.message, 'error');
    }
  };

  const filteredItems = items.filter((item) => {
    if (typeFilter && (item.itemType || 'Goods') !== typeFilter) return false;
    return true;
  });

  const totalPurchaseValue =
    stockSummary?.totalPurchaseValue ??
    stockSummary?.totalStockValue ??
    items.reduce(
      (acc, it) =>
        acc + (it.itemType !== 'Service' ? (Number(it.currentStock) || 0) * (Number(it.purchaseRate) || 0) : 0),
      0
    );

  const totalSaleValue =
    stockSummary?.totalSaleValue ??
    items.reduce(
      (acc, it) =>
        acc + (it.itemType !== 'Service' ? (Number(it.currentStock) || 0) * (Number(it.saleRate) || 0) : 0),
      0
    );

  return (

    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-4rem)]">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-100 flex items-center gap-2">
              <span>Item & Services Catalog</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                HSN & SAC
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Manage inventory goods with stock tracking and billable services with SAC codes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsHelpOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition"
            title="Open Inventory & Service Guide"
          >
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>Help</span>
          </button>

          <button
            onClick={() => openCreateModal('Service')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-950 hover:bg-sky-900 text-sky-300 hover:text-white font-bold text-xs border border-sky-800 shadow transition active:scale-95"
          >
            <Briefcase className="w-4 h-4 text-sky-400" />
            <span>+ Add Service</span>
          </button>

          <button
            onClick={() => openCreateModal('Goods')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/80 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Goods / Product</span>
          </button>
        </div>
      </div>

      {/* Stock Summary Statistics Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Catalog Items</span>
          <div className="text-xl font-black text-slate-100 mt-1">{items.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {items.filter((i) => i.itemType === 'Service').length} Services · {items.filter((i) => i.itemType !== 'Service').length} Physical Goods
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">Inventory Valuation (Cost)</span>
          <div className="text-xl font-black text-emerald-400 font-mono mt-1">
            ₹{totalPurchaseValue.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">At purchase cost rate</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
          <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider block">Inventory Valuation (Retail)</span>
          <div className="text-xl font-black text-sky-400 font-mono mt-1">
            ₹{totalSaleValue.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">At selling price</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow">
          <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider block">Low Stock Alerts</span>
          <div className="text-xl font-black text-rose-400 font-mono mt-1">
            {items.filter((i) => i.itemType !== 'Service' && (Number(i.currentStock) || 0) <= (Number(i.reorderLevel) || 0)).length} Items
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Below reorder safety threshold</div>
        </div>
      </div>

      {/* Items Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        {/* Table Filters & Search */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, HSN/SAC, barcode..."
                className="bg-slate-800 text-slate-200 text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 w-64 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700"
            >
              <option value="">All Types (Goods & Services)</option>
              <option value="Goods">Physical Goods Only</option>
              <option value="Service">Services Only</option>
            </select>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Showing <b className="text-slate-200">{filteredItems.length}</b> items
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">Item / Service Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-center">HSN / SAC</th>
                <th className="py-2.5 px-3 text-center">Unit</th>
                <th className="py-2.5 px-3 text-right">Purchase (₹)</th>
                <th className="py-2.5 px-3 text-right">Sale Rate (₹)</th>
                <th className="py-2.5 px-3 text-center">GST %</th>
                <th className="py-2.5 px-3 text-right">Current Stock</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">Stock Value (₹)</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredItems.map((item) => {
                const isService = item.itemType === 'Service';
                const qty = Number(item.currentStock) || 0;
                const purchaseRate = Number(item.purchaseRate) || 0;
                const valuation = isService ? 0 : qty * purchaseRate;
                const isLow = !isService && qty <= (Number(item.reorderLevel) || 0);

                return (
                  <tr key={item._id} className="hover:bg-slate-850/40 transition">
                    <td className="py-2.5 px-3 font-semibold text-slate-100">
                      <div className="flex items-center gap-2">
                        <span>{item.name}</span>
                        {isLow && (
                          <span className="p-1 rounded bg-rose-950 text-rose-400 text-[10px] font-bold" title="Stock below reorder level">
                            <AlertTriangle className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                          isService
                            ? 'bg-sky-950 text-sky-300 border border-sky-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {isService ? 'Service' : 'Goods'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{item.category || 'General'}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                      {item.sacCode || item.hsnCode}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-emerald-400">{item.uqc}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      ₹{purchaseRate.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                      ₹{(Number(item.saleRate) || 0).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-emerald-400 border border-slate-700 font-mono">
                        {item.gstRate}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {isService ? (
                        <span className="text-slate-500 text-[10px] font-normal uppercase">N/A (Service)</span>
                      ) : (
                        <span className={isLow ? 'text-rose-400 font-black' : 'text-slate-100'}>
                          {qty} {item.uqc}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-400">
                      {isService ? (
                        <span className="text-slate-500 text-[10px] font-normal">—</span>
                      ) : (
                        `₹${valuation.toFixed(2)}`
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 text-slate-400 hover:text-white transition"
                          title="Edit item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item._id, item.name)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition"
                          title="Delete item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 text-xs">
                    No items found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredItems.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-800 bg-slate-950 font-bold text-xs">
                  <td colSpan={9} className="py-3 px-3 text-right text-slate-400 uppercase text-[10px]">
                    Total Filtered Stock Valuation (Cost):
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-emerald-400 text-sm">
                    ₹{filteredItems.reduce((acc, it) => acc + (it.itemType !== 'Service' ? (Number(it.currentStock) || 0) * (Number(it.purchaseRate) || 0) : 0), 0).toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>


      {/* Item Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>
                  {editingItem ? `Edit ${formData.itemType}` : `Add New ${formData.itemType}`}
                </span>
              </h3>

              {/* Type Switcher */}
              <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      itemType: 'Goods',
                      hsnCode: formData.hsnCode || '2523',
                      uqc: 'PCS',
                    })
                  }
                  className={`px-3 py-1 rounded transition ${
                    formData.itemType === 'Goods'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Goods (Stock)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      itemType: 'Service',
                      sacCode: formData.sacCode || '997114',
                      uqc: 'OTH',
                    })
                  }
                  className={`px-3 py-1 rounded transition ${
                    formData.itemType === 'Service'
                      ? 'bg-sky-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Service (SAC)
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">
                  {formData.itemType === 'Service' ? 'Service Name / Fee Title *' : 'Product / Item Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={
                    formData.itemType === 'Service'
                      ? 'e.g. POS Machine Monthly Rental / Bank MDR Charges / Freight'
                      : 'e.g. UltraTech Cement (50kg)'
                  }
                  className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">
                    {formData.itemType === 'Service' ? 'SAC Code *' : 'HSN Code *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.itemType === 'Service' ? formData.sacCode || formData.hsnCode : formData.hsnCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hsnCode: e.target.value,
                        sacCode: e.target.value,
                      })
                    }
                    placeholder={formData.itemType === 'Service' ? '997114' : '2523'}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">UQC Unit *</label>
                  <select
                    value={formData.uqc}
                    onChange={(e) => setFormData({ ...formData, uqc: e.target.value })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono font-bold"
                  >
                    {GST_UQC_UNITS.map((u) => (
                      <option key={u.code} value={u.code}>
                        {u.code} - {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">GST Rate (%) *</label>
                  <select
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: Number(e.target.value) })}
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono font-bold"
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
                  <label className="text-xs font-semibold text-slate-400">
                    {formData.itemType === 'Service' ? 'Default Purchase / Expense Rate (₹)' : 'Purchase Rate (₹)'}
                  </label>
                  <input
                    type="number"
                    value={formData.purchaseRate || ''}
                    onChange={(e) => setFormData({ ...formData, purchaseRate: Number(e.target.value) })}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">
                    {formData.itemType === 'Service' ? 'Default Billing / Charge Rate (₹)' : 'Sale Rate / MRP (₹) *'}
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.saleRate || ''}
                    onChange={(e) => setFormData({ ...formData, saleRate: Number(e.target.value) })}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Physical Stock Fields (Hidden if Service) */}
              {formData.itemType === 'Goods' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Opening Stock Count</label>
                    <input
                      type="number"
                      disabled={Boolean(editingItem)}
                      value={formData.openingStock || ''}
                      onChange={(e) => setFormData({ ...formData, openingStock: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Reorder Alert Level</label>
                    <input
                      type="number"
                      value={formData.reorderLevel || ''}
                      onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })}
                      placeholder="5"
                      className="w-full bg-slate-800 text-slate-100 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-sky-950/40 border border-sky-800/60 text-xs text-sky-300">
                  💡 <b>Service Item:</b> Stock quantity tracking is disabled. Billing and purchase entries will record revenue/expenses and GST without changing physical inventory count.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition"
                >
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contextual Help Drawer */}
      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        initialTopicId="inventory"
      />
    </div>
  );
};
