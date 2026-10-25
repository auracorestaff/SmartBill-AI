import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  Calendar,
  Filter,
  Eye,
  Trash2,
  Camera,
  ArrowRight,
  ZoomIn,
  X,
  Plus,
} from 'lucide-react';
import { Purchase, Product, Supplier, Business } from '../../types';
import { formatCurrency } from '../../utils/calculations';

interface PurchaseListProps {
  purchases: Purchase[];
  products: Product[];
  suppliers: Supplier[];
  business: Business | null;
  onScanBill: () => void;
  onDeletePurchase: (purchase: Purchase) => Promise<void>;
  onSelectPurchase?: (purchase: Purchase) => void;
}

export const PurchaseList: React.FC<PurchaseListProps> = ({
  purchases,
  products,
  suppliers,
  business,
  onScanBill,
  onDeletePurchase,
  onSelectPurchase,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [activePurchase, setActivePurchase] = useState<Purchase | null>(null);
  const [viewOriginalImage, setViewOriginalImage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter purchases
  const filteredPurchases = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return purchases.filter((p) => {
      // Text match
      const matchesText =
        !q ||
        p.supplierName.toLowerCase().includes(q) ||
        p.invoiceNumber.toLowerCase().includes(q) ||
        p.invoiceDate.includes(q);

      if (!matchesText) return false;

      // Date period match
      if (selectedPeriod === 'all') return true;

      let pDate = new Date();
      if (p.invoiceDate.includes('/')) {
        const [d, m, y] = p.invoiceDate.split('/').map(Number);
        pDate = new Date(y, m - 1, d);
      } else {
        pDate = new Date(p.invoiceDate);
      }

      if (selectedPeriod === 'today') {
        return pDate >= today;
      }
      if (selectedPeriod === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return pDate >= weekAgo;
      }
      if (selectedPeriod === 'month') {
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return pDate >= firstOfMonth;
      }

      return true;
    });
  }, [purchases, searchQuery, selectedPeriod]);

  const handleDelete = async (purchase: Purchase) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete Purchase Bill ${purchase.invoiceNumber} from ${purchase.supplierName}? \n\nThis will automatically reverse stock increases for all items in this bill.`
    );
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await onDeletePurchase(purchase);
      setActivePurchase(null);
    } catch (err) {
      console.error('Delete purchase failed:', err);
      alert('Failed to delete purchase. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-7xl mx-auto px-3.5 sm:px-6 pt-3">
      {/* Top Header & Scan Bill CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
            <span>Purchase Bills & Stock Inward</span>
          </h2>
          <p className="text-xs text-slate-500">
            {purchases.length} total bills • Instant bill scanning & stock ledger
          </p>
        </div>

        <button
          type="button"
          onClick={onScanBill}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-md transition-all active:scale-[0.98]"
        >
          <Camera className="w-4 h-4 text-white" />
          <span>SCAN NEW PURCHASE BILL</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by supplier name, bill number, or date..."
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'today', 'week', 'month'] as const).map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedPeriod === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {period === 'all' && 'All Bills'}
              {period === 'today' && 'Today'}
              {period === 'week' && 'This Week'}
              {period === 'month' && 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {/* Purchases List */}
      {filteredPurchases.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No purchase bills found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {searchQuery
              ? `No bills matching "${searchQuery}". Try clearing search filter.`
              : 'Scan your vendor invoice or receipt to automatically update inventory stock.'}
          </p>
          <button
            type="button"
            onClick={onScanBill}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan Bill Now</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredPurchases.map((purchase) => (
            <div
              key={purchase.id}
              onClick={() => setActivePurchase(purchase)}
              className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-blue-400 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {purchase.supplierName}
                  </h4>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      purchase.paymentStatus === 'PAID'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {purchase.paymentStatus}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>Bill #{purchase.invoiceNumber}</span>
                  <span>•</span>
                  <span>{purchase.invoiceDate}</span>
                  <span>•</span>
                  <span>{purchase.items?.length || 0} items</span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                <div className="text-left sm:text-right">
                  <p className="text-sm sm:text-base font-extrabold text-slate-900 font-mono">
                    {formatCurrency(purchase.grandTotal)}
                  </p>
                  {purchase.balanceDue > 0 && (
                    <p className="text-[11px] font-semibold text-rose-600">
                      Due: {formatCurrency(purchase.balanceDue)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {purchase.originalBillImageUrl && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewOriginalImage(purchase.originalBillImageUrl || null);
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                      title="View Original Bill"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Purchase Detail Modal */}
      {activePurchase && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Purchase Bill Details</span>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                    {activePurchase.invoiceNumber}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Supplier: {activePurchase.supplierName}</p>
              </div>
              <button
                type="button"
                onClick={() => setActivePurchase(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Invoice Date</span>
                  <p className="font-semibold text-slate-800 text-xs mt-0.5">{activePurchase.invoiceDate}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Supplier GSTIN</span>
                  <p className="font-semibold text-slate-800 text-xs mt-0.5 font-mono">{activePurchase.supplierGSTIN || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Payment Status</span>
                  <p className="font-semibold text-slate-800 text-xs mt-0.5">{activePurchase.paymentStatus}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Payment Mode</span>
                  <p className="font-semibold text-slate-800 text-xs mt-0.5">{activePurchase.paymentMethod || 'CASH'}</p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2">Purchased Items & Stock Inward</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-[11px] text-slate-600 font-bold">
                      <tr>
                        <th className="p-2.5">Product</th>
                        <th className="p-2.5">Qty</th>
                        <th className="p-2.5">Rate (₹)</th>
                        <th className="p-2.5">GST</th>
                        <th className="p-2.5 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activePurchase.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-semibold text-slate-900">{item.productName}</td>
                          <td className="p-2.5 font-medium">{item.quantity} {item.unit}</td>
                          <td className="p-2.5 font-mono">{item.purchaseRate.toFixed(2)}</td>
                          <td className="p-2.5 font-mono">{item.gstRate}%</td>
                          <td className="p-2.5 font-mono font-bold text-right">{formatCurrency(item.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Subtotal:</span>
                  <span className="font-mono">{formatCurrency(activePurchase.taxableTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Tax:</span>
                  <span className="font-mono">{formatCurrency(activePurchase.totalTax)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="font-mono text-blue-700">{formatCurrency(activePurchase.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Paid Amount:</span>
                  <span className="font-mono">{formatCurrency(activePurchase.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-rose-700 font-semibold">
                  <span>Balance Due:</span>
                  <span className="font-mono">{formatCurrency(activePurchase.balanceDue)}</span>
                </div>
              </div>

              {/* Original Bill Thumbnail button */}
              {activePurchase.originalBillImageUrl && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setViewOriginalImage(activePurchase.originalBillImageUrl || null)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs hover:bg-blue-100 transition-colors"
                  >
                    <ZoomIn className="w-4 h-4" />
                    <span>VIEW ORIGINAL BILL PHOTO</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDelete(activePurchase)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold text-xs transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Reversing...' : 'Delete Bill (Safe Restock)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePurchase(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Image Viewer Modal */}
      {viewOriginalImage && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col p-4 items-center justify-center cursor-zoom-out"
          onClick={() => setViewOriginalImage(null)}
        >
          <button
            type="button"
            onClick={() => setViewOriginalImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={viewOriginalImage}
            alt="Original Purchase Bill Full Resolution"
            className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
