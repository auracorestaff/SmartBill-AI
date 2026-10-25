import React from 'react';
import { Product } from '../../types';
import { AlertTriangle, X, ShoppingBag, ArrowRight } from 'lucide-react';

interface LowStockAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  lowStockThreshold: number;
  onNavigateToProducts: () => void;
  onScanPurchaseBill: () => void;
}

export const LowStockAlertModal: React.FC<LowStockAlertModalProps> = ({
  isOpen,
  onClose,
  products,
  lowStockThreshold,
  onNavigateToProducts,
  onScanPurchaseBill,
}) => {
  if (!isOpen) return null;

  const lowStockItems = products.filter(
    (p) => p.currentStock <= (p.minimumStock !== undefined ? p.minimumStock : lowStockThreshold)
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col justify-start p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full mx-auto overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-amber-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Low Stock Inventory Alert</h3>
              <p className="text-amber-100 text-xs">
                {lowStockItems.length} product(s) have reached or fallen below their reorder threshold.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-amber-700 hover:bg-amber-800 flex items-center justify-center text-amber-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {lowStockItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              🎉 All inventory items are sufficiently stocked! No items are currently low in stock.
            </div>
          ) : (
            <div className="space-y-2.5">
              {lowStockItems.map((prod) => {
                const threshold = prod.minimumStock !== undefined ? prod.minimumStock : lowStockThreshold;
                const isOutOfStock = prod.currentStock <= 0;

                return (
                  <div
                    key={prod.id}
                    className={`rounded-2xl p-3.5 border flex items-center justify-between gap-3 ${
                      isOutOfStock ? 'bg-rose-50/80 border-rose-200' : 'bg-amber-50/70 border-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          isOutOfStock ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                        }`}
                      >
                        📦
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{prod.name}</h4>
                        <p className="text-xs text-slate-600">
                          Current Stock: <strong className={isOutOfStock ? 'text-rose-700 font-extrabold' : 'text-amber-800 font-bold'}>{prod.currentStock} {prod.unit}</strong>{' '}
                          (Min Threshold: {threshold} {prod.unit})
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                        isOutOfStock ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-900'
                      }`}
                    >
                      {isOutOfStock ? 'Out of Stock' : 'Low Stock'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigateToProducts();
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-1.5"
          >
            <span>Manage Products</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onScanPurchaseBill();
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Scan Bill to Restock Inventory</span>
          </button>
        </div>
      </div>
    </div>
  );
};
