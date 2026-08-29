import React from 'react';
import { useAppStore } from './store/useAppStore';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';

// Views
import { DashboardView } from './views/DashboardView';
import { BillingView } from './views/BillingView';
import { PurchaseView } from './views/PurchaseView';
import { VouchersView } from './views/VouchersView';
import { DayBookView } from './views/DayBookView';
import { FinancialStatementsView } from './views/FinancialStatementsView';
import { InventoryView } from './views/InventoryView';
import { PartiesView } from './views/PartiesView';
import { GstFilingView } from './views/GstFilingView';
import { SettingsView } from './views/SettingsView';
import { CompanyManagerModal } from './views/CompanyManagerModal';
import { UpdateNotification } from './components/UpdateNotification';

import { ErrorBoundary } from './components/ErrorBoundary';

export const App: React.FC = () => {
  const { activeTab, setActiveTab, fetchCompanies, fetchDbStatus } = useAppStore();

  React.useEffect(() => {
    fetchCompanies();
    fetchDbStatus();

    // Heartbeat to poll database status periodically
    const dbPollInterval = setInterval(() => {
      fetchDbStatus();
    }, 8000);

    // Global keyboard shortcut listeners (F1 to F9, Alt+key)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Function keys
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveTab('billing');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('vouchers');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('daybook');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('financials');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setActiveTab('inventory');
      } else if (e.key === 'F6') {
        e.preventDefault();
        setActiveTab('parties');
      } else if (e.key === 'F7') {
        e.preventDefault();
        setActiveTab('gst');
      } else if (e.key === 'F9') {
        e.preventDefault();
        setActiveTab('settings');
      }

      // Alt key combinations
      if (e.altKey) {
        if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          setActiveTab('dashboard');
        } else if (e.key.toLowerCase() === 'b') {
          e.preventDefault();
          setActiveTab('billing');
        } else if (e.key.toLowerCase() === 'p') {
          e.preventDefault();
          setActiveTab('purchase');
        } else if (e.key.toLowerCase() === 'v') {
          e.preventDefault();
          setActiveTab('vouchers');
        } else if (e.key.toLowerCase() === 'g') {
          e.preventDefault();
          setActiveTab('gst');
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          setActiveTab('settings');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearInterval(dbPollInterval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <ErrorBoundary fallbackTitle="Application encountered an unexpected error">
      <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
        {/* Top Navbar */}
        <Navbar />

        {/* Main Workspace Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <Sidebar />

          {/* Dynamic Center View */}
          <main className="flex-1 bg-slate-950 overflow-hidden relative">
            <ErrorBoundary fallbackTitle={`Error rendering ${activeTab} view`}>
              {activeTab === 'dashboard' && <DashboardView />}
              {activeTab === 'billing' && <BillingView />}
              {activeTab === 'purchase' && <PurchaseView />}
              {activeTab === 'vouchers' && <VouchersView />}
              {activeTab === 'daybook' && <DayBookView />}
              {activeTab === 'financials' && <FinancialStatementsView />}
              {activeTab === 'inventory' && <InventoryView />}
              {activeTab === 'parties' && <PartiesView />}
              {activeTab === 'gst' && <GstFilingView />}
              {activeTab === 'settings' && <SettingsView />}
            </ErrorBoundary>
          </main>
        </div>

        {/* Modals & Toasts */}
        <CompanyManagerModal />
        <Toast />
        <UpdateNotification />
      </div>
    </ErrorBoundary>
  );
};
export default App;
