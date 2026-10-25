import React, { useState, useMemo } from 'react';
import { Search, X, Package, Users, Truck, ShoppingBag, ReceiptText, ArrowRight } from 'lucide-react';
import { Product, Customer, Supplier, Purchase, Sale } from '../../types';
import { formatCurrency } from '../../utils/calculations';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  purchases: Purchase[];
  sales: Sale[];
  onSelectItem: (type: 'product' | 'customer' | 'supplier' | 'purchase' | 'sale', id: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  products,
  customers,
  suppliers,
  purchases,
  sales,
  onSelectItem,
}) => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { products: [], customers: [], suppliers: [], purchases: [], sales: [] };

    return {
      products: products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.sku && p.sku.toLowerCase().includes(q)) ||
            (p.barcode && p.barcode.toLowerCase().includes(q)) ||
            (p.hsn && p.hsn.toLowerCase().includes(q))
        )
        .slice(0, 5),

      customers: customers
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.phone.includes(q) ||
            (c.gstin && c.gstin.toLowerCase().includes(q))
        )
        .slice(0, 4),

      suppliers: suppliers
        .filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.phone.includes(q) ||
            (s.gstin && s.gstin.toLowerCase().includes(q))
        )
        .slice(0, 4),

      sales: sales
        .filter(
          (s) =>
            s.invoiceNumber.toLowerCase().includes(q) ||
            s.customerName.toLowerCase().includes(q) ||
            s.invoiceDate.includes(q)
        )
        .slice(0, 4),

      purchases: purchases
        .filter(
          (p) =>
            p.invoiceNumber.toLowerCase().includes(q) ||
            p.supplierName.toLowerCase().includes(q) ||
            p.invoiceDate.includes(q)
        )
        .slice(0, 4),
    };
  }, [query, products, customers, suppliers, purchases, sales]);

  if (!isOpen) return null;

  const totalResults =
    results.products.length +
    results.customers.length +
    results.suppliers.length +
    results.sales.length +
    results.purchases.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-start p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full mx-auto overflow-hidden border border-slate-200 mt-6 sm:mt-12 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-slate-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, customers, suppliers, bills, invoices..."
            className="w-full text-sm sm:text-base outline-hidden text-slate-900 placeholder:text-slate-400 font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            Esc
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[70vh] overflow-y-auto p-3 space-y-4">
          {!query.trim() ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Type product name, barcode, customer, supplier, or invoice number to search.
            </div>
          ) : totalResults === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm font-medium">
              No matching records found for "{query}"
            </div>
          ) : (
            <>
              {/* Products */}
              {results.products.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                    <Package className="w-3.5 h-3.5 text-blue-500" />
                    <span>Products ({results.products.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.products.map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => {
                          onSelectItem('product', prod.id);
                          onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">{prod.name}</p>
                          <p className="text-xs text-slate-500">
                            Stock: <span className="font-medium text-slate-700">{prod.currentStock} {prod.unit}</span> • Price: <span className="font-semibold text-emerald-600">{formatCurrency(prod.sellingPrice)}</span>
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customers */}
              {results.customers.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Customers ({results.customers.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.customers.map((cust) => (
                      <div
                        key={cust.id}
                        onClick={() => {
                          onSelectItem('customer', cust.id);
                          onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">{cust.name}</p>
                          <p className="text-xs text-slate-500">
                            Phone: {cust.phone} • Balance Due: <span className="font-semibold text-amber-600">{formatCurrency(cust.currentBalance)}</span>
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suppliers */}
              {results.suppliers.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                    <Truck className="w-3.5 h-3.5 text-purple-500" />
                    <span>Suppliers ({results.suppliers.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.suppliers.map((sup) => (
                      <div
                        key={sup.id}
                        onClick={() => {
                          onSelectItem('supplier', sup.id);
                          onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">{sup.name}</p>
                          <p className="text-xs text-slate-500">
                            Phone: {sup.phone} • Payable: <span className="font-semibold text-rose-600">{formatCurrency(sup.currentBalance)}</span>
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sales Invoices */}
              {results.sales.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                    <ReceiptText className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Sales Invoices ({results.sales.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.sales.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          onSelectItem('sale', s.id);
                          onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {s.invoiceNumber} - <span className="font-normal text-slate-600">{s.customerName}</span>
                          </p>
                          <p className="text-xs text-slate-500">
                            {s.invoiceDate} • Amount: <span className="font-bold text-slate-800">{formatCurrency(s.grandTotal)}</span>
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          s.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {s.paymentStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Purchases */}
              {results.purchases.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                    <span>Purchase Bills ({results.purchases.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.purchases.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          onSelectItem('purchase', p.id);
                          onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {p.invoiceNumber} - <span className="font-normal text-slate-600">{p.supplierName}</span>
                          </p>
                          <p className="text-xs text-slate-500">
                            {p.invoiceDate} • Total: <span className="font-bold text-slate-800">{formatCurrency(p.grandTotal)}</span>
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {p.paymentStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
