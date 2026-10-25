import React, { useState } from 'react';
import { X, RotateCcw, AlertTriangle } from 'lucide-react';
import { Sale, Purchase, Product, Customer, Supplier, Business } from '../../types';
import { formatCurrency, round2 } from '../../utils/calculations';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'SALE_RETURN' | 'PURCHASE_RETURN';
  targetSale?: Sale;
  targetPurchase?: Purchase;
  allProducts: Product[];
  customer?: Customer;
  supplier?: Supplier;
  business: Business | null;
  ownerUid: string;
  onProcessSaleReturn: (params: {
    businessId: string;
    ownerUid: string;
    sale: Sale;
    returnedItems: Array<{ productId: string; productName: string; quantity: number; rate: number }>;
    refundAmount: number;
    customer?: Customer;
    allProducts: Product[];
  }) => Promise<void>;
  onProcessPurchaseReturn: (params: {
    businessId: string;
    ownerUid: string;
    purchase: Purchase;
    returnedItems: Array<{ productId: string; productName: string; quantity: number; rate: number }>;
    creditAmount: number;
    supplier?: Supplier;
    allProducts: Product[];
  }) => Promise<void>;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  isOpen,
  onClose,
  type,
  targetSale,
  targetPurchase,
  allProducts,
  customer,
  supplier,
  business,
  ownerUid,
  onProcessSaleReturn,
  onProcessPurchaseReturn,
}) => {
  const isSaleReturn = type === 'SALE_RETURN';
  const docItems = isSaleReturn ? targetSale?.items || [] : targetPurchase?.items || [];

  // Track return quantities for each item
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({});
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleQtyChange = (index: number, val: number, maxQty: number, rate: number) => {
    const safeQty = Math.max(0, Math.min(val, maxQty));
    const next = { ...returnQtys, [index]: safeQty };
    setReturnQtys(next);

    // Recalculate suggested refund/credit amount
    let total = 0;
    docItems.forEach((item, i) => {
      const q = next[i] || 0;
      const r = (item as any).sellingRate || (item as any).purchaseRate || 0;
      total += q * r;
    });
    setRefundAmount(round2(total));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const itemsToReturn: Array<{ productId: string; productName: string; quantity: number; rate: number }> = [];

    docItems.forEach((item, i) => {
      const q = returnQtys[i] || 0;
      if (q > 0 && item.productId) {
        const rate = (item as any).sellingRate || (item as any).purchaseRate || 0;
        itemsToReturn.push({
          productId: item.productId,
          productName: item.productName,
          quantity: q,
          rate,
        });
      }
    });

    if (itemsToReturn.length === 0) {
      setFormError('Please enter return quantities for at least one item.');
      return;
    }

    setIsProcessing(true);
    const businessId = business?.id || `biz_${ownerUid}`;

    try {
      if (isSaleReturn && targetSale) {
        await onProcessSaleReturn({
          businessId,
          ownerUid,
          sale: targetSale,
          returnedItems: itemsToReturn,
          refundAmount,
          customer,
          allProducts,
        });
      } else if (!isSaleReturn && targetPurchase) {
        await onProcessPurchaseReturn({
          businessId,
          ownerUid,
          purchase: targetPurchase,
          returnedItems: itemsToReturn,
          creditAmount: refundAmount,
          supplier,
          allProducts,
        });
      }
      onClose();
    } catch (err) {
      console.error('Process return failed:', err);
      setFormError('Failed to process return. Please check your data and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <RotateCcw className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {isSaleReturn ? 'Process Sales Return' : 'Process Purchase Return'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isSaleReturn
                  ? `Invoice ${targetSale?.invoiceNumber} (${targetSale?.customerName})`
                  : `Bill ${targetPurchase?.invoiceNumber} (${targetPurchase?.supplierName})`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-xs">
              {formError}
            </div>
          )}

          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              {isSaleReturn
                ? 'Returning items will automatically increase your product stock and optionally reduce the customer balance.'
                : 'Returning purchased items will automatically decrease stock and deduct from supplier payable.'}
            </p>
          </div>

          {/* Items return table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                <tr>
                  <th className="p-2.5">Item</th>
                  <th className="p-2.5">Original Qty</th>
                  <th className="p-2.5">Return Qty</th>
                  <th className="p-2.5 text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docItems.map((item, idx) => {
                  const rate = (item as any).sellingRate || (item as any).purchaseRate || 0;
                  return (
                    <tr key={idx}>
                      <td className="p-2.5 font-semibold text-slate-800">{item.productName}</td>
                      <td className="p-2.5 font-medium">{item.quantity} {item.unit}</td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          step="any"
                          value={returnQtys[idx] || ''}
                          placeholder="0"
                          onChange={(e) =>
                            handleQtyChange(idx, Number(e.target.value), item.quantity, rate)
                          }
                          className="w-20 px-2 py-1 border border-slate-300 rounded font-bold text-center focus:outline-none"
                        />
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold">
                        {formatCurrency(rate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {isSaleReturn ? 'Refund / Balance Credit Amount (₹)' : 'Supplier Debit / Credit Amount (₹)'}
            </label>
            <input
              type="number"
              step="0.01"
              value={refundAmount}
              onChange={(e) => setRefundAmount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold font-mono text-sm focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'CONFIRM RETURN & SYNC STOCK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
