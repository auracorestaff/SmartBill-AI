import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  ReceiptText,
  Boxes,
  MoreHorizontal,
  Users,
  Truck,
  BarChart3,
  Settings as SettingsIcon,
  Tag,
  FileText,
} from 'lucide-react';

export type TabType =
  | 'dashboard'
  | 'purchases'
  | 'sales'
  | 'products'
  | 'customers'
  | 'suppliers'
  | 'vendor-prices'
  | 'quotations'
  | 'reports'
  | 'settings';

interface BottomNavProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  isMoreOpen: boolean;
  setIsMoreOpen: (open: boolean) => void;
  lowStockCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onChangeTab,
  isMoreOpen,
  setIsMoreOpen,
  lowStockCount = 0,
}) => {
  const isMoreSectionActive = ['customers', 'suppliers', 'vendor-prices', 'quotations', 'reports', 'settings'].includes(currentTab);

  return (
    <>
      {/* "More" Sheet Overlay for mobile */}
      {isMoreOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          onClick={() => setIsMoreOpen(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 max-w-lg mx-auto bg-white rounded-t-2xl shadow-xl border-t border-slate-200 p-4 transition-transform"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
              More Business Sections
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => {
                  onChangeTab('customers');
                  setIsMoreOpen(false);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  currentTab === 'customers'
                    ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                    : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-1.5">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-xs">Customers</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onChangeTab('suppliers');
                  setIsMoreOpen(false);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  currentTab === 'suppliers'
                    ? 'bg-purple-50 border-purple-200 text-purple-700 font-semibold'
                    : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mb-1.5">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="text-xs">Suppliers</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onChangeTab('vendor-prices');
                  setIsMoreOpen(false);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  currentTab === 'vendor-prices'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold'
                    : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mb-1.5">
                  <Tag className="w-5 h-5" />
                </div>
                <span className="text-xs text-center leading-tight">Vendor Prices</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onChangeTab('quotations');
                  setIsMoreOpen(false);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  currentTab === 'quotations'
                    ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                    : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-1.5">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-xs text-center leading-tight">Quotations</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onChangeTab('reports');
                  setIsMoreOpen(false);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  currentTab === 'reports'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold'
                    : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1.5">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-xs">Reports</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onChangeTab('settings');
                  setIsMoreOpen(false);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  currentTab === 'settings'
                    ? 'bg-amber-50 border-amber-200 text-amber-700 font-semibold'
                    : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-1.5">
                  <SettingsIcon className="w-5 h-5" />
                </div>
                <span className="text-xs">Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 safe-area-bottom shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-5 h-16">
          {/* Home / Dashboard */}
          <button
            type="button"
            onClick={() => {
              onChangeTab('dashboard');
              setIsMoreOpen(false);
            }}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              currentTab === 'dashboard' ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-1" />
            <span className="text-[11px]">Home</span>
          </button>

          {/* Purchase */}
          <button
            type="button"
            onClick={() => {
              onChangeTab('purchases');
              setIsMoreOpen(false);
            }}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              currentTab === 'purchases' ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag className="w-5 h-5 mb-1" />
            <span className="text-[11px]">Purchase</span>
          </button>

          {/* Sales */}
          <button
            type="button"
            onClick={() => {
              onChangeTab('sales');
              setIsMoreOpen(false);
            }}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              currentTab === 'sales' ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ReceiptText className="w-5 h-5 mb-1" />
            <span className="text-[11px]">Sales</span>
          </button>

          {/* Stock / Products */}
          <button
            type="button"
            onClick={() => {
              onChangeTab('products');
              setIsMoreOpen(false);
            }}
            className={`relative flex flex-col items-center justify-center py-1 transition-colors ${
              currentTab === 'products' ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <Boxes className="w-5 h-5 mb-1" />
              {lowStockCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white leading-tight">
                  {lowStockCount}
                </span>
              )}
            </div>
            <span className="text-[11px]">Stock</span>
          </button>

          {/* More */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              isMoreSectionActive || isMoreOpen ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MoreHorizontal className="w-5 h-5 mb-1" />
            <span className="text-[11px]">More</span>
          </button>
        </div>
      </nav>
    </>
  );
};
