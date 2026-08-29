import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Truck,
  BookOpen,
  CalendarDays,
  Scale,
  Package,
  Users,
  FileSpreadsheet,
  Settings,
} from 'lucide-react';
import { useAppStore, NavigationTab } from '../store/useAppStore';

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ElementType;
  hotkey: string;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hotkey: 'Alt+D' },
    { id: 'billing', label: 'Billing & POS', icon: Receipt, hotkey: 'F1', badge: 'Fast' },
    { id: 'purchase', label: 'Purchase Bills', icon: Truck, hotkey: 'Alt+P', badge: 'Inward' },
    { id: 'vouchers', label: 'Vouchers Entry', icon: BookOpen, hotkey: 'F2' },
    { id: 'daybook', label: 'Day Book', icon: CalendarDays, hotkey: 'F3' },
    { id: 'financials', label: 'Financials & P&L', icon: Scale, hotkey: 'F4' },
    { id: 'inventory', label: 'Stock & Items', icon: Package, hotkey: 'F5' },
    { id: 'parties', label: 'Customers & Parties', icon: Users, hotkey: 'F6' },
    { id: 'gst', label: 'GST Reports & e-File', icon: FileSpreadsheet, hotkey: 'F7', badge: 'GSTR' },
    { id: 'settings', label: 'Settings & DB', icon: Settings, hotkey: 'F9' },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between py-4 select-none shrink-0">
      <div className="space-y-1 px-3">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Main Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/60'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {item.badge && (
                  <span
                    className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                      isActive ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-800 text-emerald-400 border border-emerald-900/60'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                <span className={`text-[10px] font-mono opacity-60 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                  {item.hotkey}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom shortcut reminder */}
      <div className="px-4 py-3 mx-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
        <div className="font-bold text-slate-300 flex items-center gap-1">
          <span>⚡ Power Shortcuts</span>
        </div>
        <div className="flex justify-between">
          <span>Quick Bill</span>
          <span className="font-mono text-emerald-400">F1</span>
        </div>
        <div className="flex justify-between">
          <span>Save & Print</span>
          <span className="font-mono text-emerald-400">Alt+S</span>
        </div>
        <div className="flex justify-between">
          <span>Excel Export</span>
          <span className="font-mono text-emerald-400">Alt+E</span>
        </div>
      </div>
    </aside>
  );
};
