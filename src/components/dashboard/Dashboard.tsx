import React, { useState, useMemo } from 'react';
import {
  Camera,
  ReceiptText,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  PackagePlus,
  AlertTriangle,
  TrendingUp,
  ShoppingBag,
  Clock,
  DollarSign,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { Product, Purchase, Sale, Payment, Business } from '../../types';
import { formatCurrency, round2 } from '../../utils/calculations';

interface DashboardProps {
  business: Business | null;
  products: Product[];
  purchases: Purchase[];
  sales: Sale[];
  payments: Payment[];
  onScanPurchaseBill: () => void;
  onNewSale: () => void;
  onReceivePayment: () => void;
  onMakePayment: () => void;
  onAddProduct: () => void;
  onViewSale: (sale: Sale) => void;
  onViewPurchase: (purchase: Purchase) => void;
  onViewProduct: (product: Product) => void;
}

type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'all';

export const Dashboard: React.FC<DashboardProps> = ({
  business,
  products,
  purchases,
  sales,
  payments,
  onScanPurchaseBill,
  onNewSale,
  onReceivePayment,
  onMakePayment,
  onAddProduct,
  onViewSale,
  onViewPurchase,
  onViewProduct,
}) => {
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');

  // Filter items by selected range
  const filteredData = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const parseInvoiceDate = (dateStr: string) => {
      // Expects DD/MM/YYYY or YYYY-MM-DD
      if (dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/').map(Number);
        return new Date(y, m - 1, d);
      }
      return new Date(dateStr);
    };

    const isInRange = (dStr: string) => {
      const date = parseInvoiceDate(dStr);
      if (isNaN(date.getTime())) return true;

      switch (dateFilter) {
        case 'today':
          return date.getTime() >= today.getTime() && date.getTime() < today.getTime() + 86400000;
        case 'yesterday':
          return date.getTime() >= yesterday.getTime() && date.getTime() < today.getTime();
        case 'week': {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return date >= sevenDaysAgo;
        }
        case 'month': {
          const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          return date >= firstOfMonth;
        }
        case 'last_month': {
          const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
          return date >= firstOfLastMonth && date <= endOfLastMonth;
        }
        case 'all':
        default:
          return true;
      }
    };

    const filteredSales = sales.filter((s) => isInRange(s.invoiceDate));
    const filteredPurchases = purchases.filter((p) => isInRange(p.invoiceDate));
    const filteredPayments = payments.filter((p) => isInRange(p.date));

    // Summary calculations
    const totalSalesAmount = filteredSales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
    const totalPurchaseAmount = filteredPurchases.reduce((sum, p) => sum + (p.grandTotal || 0), 0);
    const totalCollections = filteredPayments
      .filter((p) => p.type === 'RECEIVE')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // Global receivables & payables
    const totalReceivables = sales.reduce((sum, s) => sum + (s.balanceDue || 0), 0);
    const totalPayables = purchases.reduce((sum, p) => sum + (p.balanceDue || 0), 0);

    // Stock value & Low stock count
    let totalStockValue = 0;
    const lowStockItems: Product[] = [];
    const minThreshold = business?.lowStockThreshold ?? 5;

    for (const p of products) {
      const val = round2(p.currentStock * (p.purchasePrice || p.sellingPrice || 0));
      totalStockValue = round2(totalStockValue + Math.max(0, val));

      const threshold = p.minimumStock !== undefined ? p.minimumStock : minThreshold;
      if (p.currentStock <= threshold) {
        lowStockItems.push(p);
      }
    }

    // Profit estimate = (Filtered Sales Taxable Total) - (Cost of Goods estimated from purchase prices)
    let estimatedCost = 0;
    for (const s of filteredSales) {
      for (const item of s.items) {
        const prod = products.find((p) => p.id === item.productId);
        const unitCost = prod?.purchasePrice || (item.sellingRate * 0.7);
        estimatedCost += unitCost * item.quantity;
      }
    }
    const estimatedProfit = round2(totalSalesAmount - estimatedCost);

    return {
      sales: filteredSales,
      purchases: filteredPurchases,
      payments: filteredPayments,
      totalSalesAmount: round2(totalSalesAmount),
      totalPurchaseAmount: round2(totalPurchaseAmount),
      totalCollections: round2(totalCollections),
      totalReceivables: round2(totalReceivables),
      totalPayables: round2(totalPayables),
      totalStockValue: round2(totalStockValue),
      lowStockItems,
      estimatedProfit,
    };
  }, [sales, purchases, payments, products, dateFilter, business]);

  return (
    <div className="space-y-5 pb-24 max-w-7xl mx-auto px-3.5 sm:px-6 pt-3">
      {/* 1. Big Quick Action Buttons */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-xs border border-slate-200/80">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Quick Actions
          </span>
          <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            1-Tap Operations
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {/* SCAN PURCHASE BILL (Primary Highlight) */}
          <button
            type="button"
            onClick={onScanPurchaseBill}
            className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-3.5 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-2 backdrop-blur-xs group-hover:scale-105 transition-transform">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-center leading-tight">
              SCAN PURCHASE BILL
            </span>
            <span className="text-[10px] text-blue-200 mt-0.5 font-medium">
              Auto-Extract & Sync
            </span>
          </button>

          {/* NEW SALE */}
          <button
            type="button"
            onClick={onNewSale}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 active:scale-[0.98] transition-all hover:bg-emerald-100/60"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-1.5 shadow-xs">
              <ReceiptText className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs tracking-tight">NEW SALE</span>
            <span className="text-[10px] text-emerald-700 font-medium">Create Bill</span>
          </button>

          {/* RECEIVE PAYMENT */}
          <button
            type="button"
            onClick={onReceivePayment}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-900 active:scale-[0.98] transition-all hover:bg-cyan-100/60"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center mb-1.5 shadow-xs">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs tracking-tight">RECEIVE ₹</span>
            <span className="text-[10px] text-cyan-700 font-medium">From Customer</span>
          </button>

          {/* MAKE PAYMENT */}
          <button
            type="button"
            onClick={onMakePayment}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 active:scale-[0.98] transition-all hover:bg-rose-100/60"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center mb-1.5 shadow-xs">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs tracking-tight">PAY ₹</span>
            <span className="text-[10px] text-rose-700 font-medium">To Supplier</span>
          </button>

          {/* ADD PRODUCT */}
          <button
            type="button"
            onClick={onAddProduct}
            className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 active:scale-[0.98] transition-all hover:bg-indigo-100/60"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-1.5 shadow-xs">
              <PackagePlus className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs tracking-tight">ADD PRODUCT</span>
            <span className="text-[10px] text-indigo-700 font-medium">New Stock Item</span>
          </button>
        </div>
      </div>

      {/* 2. Date Filter Pills */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 shrink-0">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500">Period:</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {(['today', 'yesterday', 'week', 'month', 'last_month', 'all'] as DateFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setDateFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                dateFilter === f
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f === 'today' && 'Today'}
              {f === 'yesterday' && 'Yesterday'}
              {f === 'week' && 'This Week'}
              {f === 'month' && 'This Month'}
              {f === 'last_month' && 'Last Month'}
              {f === 'all' && 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Core Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Sales */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sales</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {formatCurrency(filteredData.totalSalesAmount)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {filteredData.sales.length} bill{filteredData.sales.length !== 1 ? 's' : ''} generated
          </p>
        </div>

        {/* Total Purchases */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Purchases</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {formatCurrency(filteredData.totalPurchaseAmount)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {filteredData.purchases.length} bill{filteredData.purchases.length !== 1 ? 's' : ''} recorded
          </p>
        </div>

        {/* Receivables (To Collect) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Receivables</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-extrabold text-amber-600 tracking-tight">
            {formatCurrency(filteredData.totalReceivables)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Pending from customers</p>
        </div>

        {/* Payables (To Pay) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Payables</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-extrabold text-rose-600 tracking-tight">
            {formatCurrency(filteredData.totalPayables)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Due to suppliers</p>
        </div>
      </div>

      {/* 4. Secondary Row: Stock Value & Profit Estimate */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Current Stock Value
            </span>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              {formatCurrency(filteredData.totalStockValue)}
            </p>
            <p className="text-[11px] text-slate-500">{products.length} registered products</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Collections (Inflow)
            </span>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">
              {formatCurrency(filteredData.totalCollections)}
            </p>
            <p className="text-[11px] text-slate-500">Total received in period</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Estimated Profit
            </span>
            <p className={`text-xl font-bold mt-0.5 ${filteredData.estimatedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(filteredData.estimatedProfit)}
            </p>
            <p className="text-[11px] text-slate-500">Sales minus item purchase cost</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 5. Low Stock Alert Banner */}
      {filteredData.lowStockItems.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                Low Stock Alert ({filteredData.lowStockItems.length} items need re-order)
              </h4>
              <p className="text-xs text-amber-800">
                {filteredData.lowStockItems.slice(0, 3).map((p) => `${p.name} (${p.currentStock} ${p.unit})`).join(', ')}
                {filteredData.lowStockItems.length > 3 ? ` +${filteredData.lowStockItems.length - 3} more` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onScanPurchaseBill}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 shadow-xs"
          >
            Scan Purchase Bill to Restock
          </button>
        </div>
      )}

      {/* 6. Recent Activities: Sales & Purchases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Sales */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ReceiptText className="w-4 h-4 text-emerald-600" />
              <span>Recent Sales</span>
            </h3>
            <button
              type="button"
              onClick={onNewSale}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              + New Sale
            </button>
          </div>

          {sales.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No sales recorded yet. Click "NEW SALE" to create your first customer invoice.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sales.slice(0, 5).map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => onViewSale(sale)}
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 px-2 rounded-xl transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {sale.customerName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{sale.invoiceNumber}</span>
                      <span>•</span>
                      <span>{sale.invoiceDate}</span>
                    </div>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(sale.grandTotal)}
                    </p>
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        sale.paymentStatus === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {sale.paymentStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Purchases */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              <span>Recent Purchases</span>
            </h3>
            <button
              type="button"
              onClick={onScanPurchaseBill}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              + Scan Bill
            </button>
          </div>

          {purchases.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No purchase bills scanned yet. Click "SCAN PURCHASE BILL" to take a photo of your vendor bill!
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {purchases.slice(0, 5).map((pur) => (
                <div
                  key={pur.id}
                  onClick={() => onViewPurchase(pur)}
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 px-2 rounded-xl transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {pur.supplierName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{pur.invoiceNumber || 'Bill'}</span>
                      <span>•</span>
                      <span>{pur.invoiceDate}</span>
                    </div>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(pur.grandTotal)}
                    </p>
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        pur.paymentStatus === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {pur.paymentStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
