import React from 'react';
import {
  Camera,
  Search,
  Wifi,
  WifiOff,
  User as UserIcon,
  Building2,
  FileText,
  Bell,
} from 'lucide-react';
import { Business } from '../../types';

interface HeaderProps {
  business: Business | null;
  isOnline: boolean;
  onOpenScanner: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  lowStockCount?: number;
  onOpenLowStockModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  business,
  isOnline,
  onOpenScanner,
  onOpenSearch,
  onOpenSettings,
  onOpenProfile,
  lowStockCount = 0,
  onOpenLowStockModal,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 py-2.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5">
        {/* Business Brand & Name */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {business?.logoUrl ? (
            <img
              src={business.logoUrl}
              alt={business?.name || 'Business Logo'}
              className="w-9 h-9 rounded-xl object-contain bg-white border border-slate-200 shadow-xs shrink-0 p-0.5"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
              {business?.name ? business.name.charAt(0).toUpperCase() : 'S'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold text-slate-900 truncate leading-tight">
                {business?.name || 'SmartBill AI'}
              </h1>
              {business?.gstEnabled && (
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  GST
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="truncate">{business?.ownerName || 'Business Workspace'}</span>
              <span className="text-slate-300">•</span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                  isOnline ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {isOnline ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="hidden xs:inline">Synced</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-amber-500" />
                    <span>Offline</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Low Stock Alert Bell */}
          {lowStockCount > 0 && onOpenLowStockModal && (
            <button
              type="button"
              onClick={onOpenLowStockModal}
              className="relative p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 active:bg-amber-200 transition-colors"
              title={`${lowStockCount} items low in stock`}
              aria-label="Low Stock Alerts"
            >
              <Bell className="w-4 h-4 animate-bounce" />
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-600 text-white leading-tight">
                {lowStockCount}
              </span>
            </button>
          )}

          {/* Quick Search */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            title="Global Search"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Quick Scan Bill Button */}
          <button
            type="button"
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-xs active:scale-95 transition-all"
            title="Scan Purchase Bill"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Scan Bill</span>
          </button>

          {/* User / Settings Profile */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            title="Account & Settings"
          >
            <UserIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
