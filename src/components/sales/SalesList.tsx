import React, { useState, useMemo } from 'react';
import {
  ReceiptText,
  Search,
  Plus,
  Eye,
  Trash2,
  Share2,
  Download,
  RotateCcw,
  ArrowRight,
  IndianRupee,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Sale, Customer, Product, Business } from '../../types';
import { formatCurrency } from '../../utils/calculations';

interface SalesListProps {
  sales: Sale[];
  customers: Customer[];
  products: Product[];
  business: Business | null;
  onNewSale: () => void;
  onViewInvoice: (sale: Sale) => void;
  onDeleteSale: (sale: Sale) => Promise<void>;
  onSalesReturn: (sale: Sale) => void;
  onRecordPayment?: (sale: Sale) => void;
  onSendReminder?: (sale: Sale) => void;
}

export const SalesList: React.FC<SalesListProps> = ({
  sales,
  customers,
  products,
  business,
  onNewSale,
  onViewInvoice,
  onDeleteSale,
  onSalesReturn,
  onRecordPayment,
  onSendReminder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<
    'all' | 'unpaid' | 'partial' | 'paid' | 'today' | 'week' | 'month'
  >('all');
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Status breakdown stats
  const unpaidSales = useMemo(
    () => sales.filter((s) => (s.paymentStatus === 'UNPAID' || s.paidAmount === 0) && s.balanceDue > 0),
    [sales]
  );
  const partialSales = useMemo(
    () => sales.filter((s) => s.paymentStatus === 'PARTIAL' || (s.paidAmount > 0 && s.balanceDue > 0)),
    [sales]
  );
  const paidSales = useMemo(
    () => sales.filter((s) => s.paymentStatus === 'PAID' || s.balanceDue <= 0),
    [sales]
  );
  const totalPendingDues = useMemo(
    () => sales.reduce((sum, s) => sum + (s.balanceDue > 0 ? s.balanceDue : 0), 0),
    [sales]
  );

  const filteredSales = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return sales.filter((s) => {
      const matchesText =
        !q ||
        s.customerName.toLowerCase().includes(q) ||
        s.invoiceNumber.toLowerCase().includes(q) ||
        s.invoiceDate.includes(q);

      if (!matchesText) return false;

      if (selectedPeriod === 'unpaid') {
        return (s.paymentStatus === 'UNPAID' || s.paidAmount === 0) && s.balanceDue > 0;
      }
      if (selectedPeriod === 'partial') {
        return s.paymentStatus === 'PARTIAL' || (s.paidAmount > 0 && s.balanceDue > 0);
      }
      if (selectedPeriod === 'paid') {
        return s.paymentStatus === 'PAID' || s.balanceDue <= 0;
      }

      if (selectedPeriod === 'all') return true;

      let sDate = new Date();
      if (s.invoiceDate.includes('/')) {
        const [d, m, y] = s.invoiceDate.split('/').map(Number);
        sDate = new Date(y, m - 1, d);
      } else {
        sDate = new Date(s.invoiceDate);
      }

      if (selectedPeriod === 'today') {
        return sDate >= today;
      }
      if (selectedPeriod === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return sDate >= weekAgo;
      }
      if (selectedPeriod === 'month') {
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return sDate >= firstOfMonth;
      }

      return true;
    });
  }, [sales, searchQuery, selectedPeriod]);

  const renderPaymentBadge = (sale: Sale) => {
    const isPaid = sale.paymentStatus === 'PAID' || sale.balanceDue <= 0;
    const isPartial =
      sale.paymentStatus === 'PARTIAL' ||
      (sale.paidAmount > 0 && sale.balanceDue > 0);

    if (isPaid) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>PAID</span>
        </span>
      );
    }

    if (isPartial) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>PARTIAL</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
        <AlertCircle className="w-3 h-3 text-rose-500" />
        <span>UNPAID</span>
      </span>
    );
  };

  const handleDelete = async (e: React.MouseEvent, sale: Sale) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `Are you sure you want to delete Invoice ${sale.invoiceNumber} for ${sale.customerName}?\n\nThis will safely return sold quantities back to stock and adjust customer balance.`
    );
    if (!confirmed) return;

    setIsDeletingId(sale.id);
    try {
      await onDeleteSale(sale);
    } catch (err) {
      console.error('Delete sale error:', err);
      alert('Failed to delete sale invoice.');
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-7xl mx-auto px-3.5 sm:px-6 pt-3">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-emerald-600" />
            <span>Sales & Tax Invoices</span>
          </h2>
          <p className="text-xs text-slate-500">
            {sales.length} total sales • A4 GST invoices, PDF download, and WhatsApp share
          </p>
        </div>

        <button
          type="button"
          onClick={onNewSale}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-md transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>NEW SALE INVOICE</span>
        </button>
      </div>

      {/* Search & Date/Status Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, invoice number, or date..."
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'unpaid', label: 'Unpaid', count: unpaidSales.length, color: 'rose' },
              { id: 'partial', label: 'Partial', count: partialSales.length, color: 'amber' },
              { id: 'paid', label: 'Paid', count: paidSales.length, color: 'emerald' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
            ] as {
              id: 'all' | 'unpaid' | 'partial' | 'paid' | 'today' | 'week' | 'month';
              label: string;
              count?: number;
              color?: 'rose' | 'amber' | 'emerald';
            }[]
          ).map((tab) => {
            const isSelected = selectedPeriod === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedPeriod(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? tab.id === 'unpaid'
                      ? 'bg-rose-600 text-white'
                      : tab.id === 'partial'
                      ? 'bg-amber-600 text-white'
                      : 'bg-emerald-600 text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? 'bg-white/90 text-slate-900'
                        : tab.color === 'rose'
                        ? 'bg-rose-100 text-rose-700'
                        : tab.color === 'amber'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pending Dues Banner when unpaid invoices exist */}
      {unpaidSales.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold">
                {unpaidSales.length} Unpaid / Partial Invoices
              </p>
              <p className="text-amber-700 text-[11px]">
                Total Outstanding Balance:{' '}
                <strong className="font-mono text-xs font-black text-rose-700">
                  {formatCurrency(totalPendingDues)}
                </strong>
              </p>
            </div>
          </div>
          <p className="text-[11px] text-amber-800 font-medium">
            💡 Tap <strong className="text-emerald-700">Reminder</strong> on any invoice to send WhatsApp / SMS alert with direct UPI pay link.
          </p>
        </div>
      )}

      {/* Sales Invoices List */}
      {filteredSales.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <ReceiptText className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No sales invoices found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {searchQuery
              ? `No invoices matching "${searchQuery}".`
              : selectedPeriod === 'unpaid'
              ? 'Great news! All sales invoices are fully paid with zero outstanding balance.'
              : 'Create a new sale invoice to generate professional A4 bills and automatically sync stock.'}
          </p>
          <button
            type="button"
            onClick={onNewSale}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Invoice</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredSales.map((sale) => (
            <div
              key={sale.id}
              onClick={() => onViewInvoice(sale)}
              className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-emerald-400 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {sale.invoiceNumber}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {sale.customerName}
                  </h4>
                  {renderPaymentBadge(sale)}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>Date: {sale.invoiceDate}</span>
                  <span>•</span>
                  <span>{sale.items?.length || 0} items</span>
                  <span>•</span>
                  <span>Mode: {sale.paymentMethod}</span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                <div className="text-left sm:text-right">
                  <p className="text-sm sm:text-base font-extrabold text-slate-900 font-mono">
                    {formatCurrency(sale.grandTotal)}
                  </p>
                  {sale.balanceDue > 0 ? (
                    <p className="text-[11px] font-bold text-rose-600">
                      Due: {formatCurrency(sale.balanceDue)}
                    </p>
                  ) : (
                    <p className="text-[11px] font-semibold text-emerald-600">
                      Settled
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                  {/* Quick-Action: Record Payment directly triggers RecordPaymentModal for reconciliation */}
                  {sale.balanceDue > 0 && onRecordPayment && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRecordPayment(sale);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs hover:shadow transition-all active:scale-[0.98] shrink-0"
                      title="Directly Record Payment to reconcile unpaid invoice"
                    >
                      <IndianRupee className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Record Payment</span>
                    </button>
                  )}

                  {sale.balanceDue > 0 && onSendReminder && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSendReminder(sale);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors shrink-0"
                      title="Send WhatsApp or SMS Payment Reminder"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Reminder</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSalesReturn(sale);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1"
                    title="Sales Return"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-500" />
                    <span className="hidden md:inline">Return</span>
                  </button>

                  <button
                    type="button"
                    disabled={isDeletingId === sale.id}
                    onClick={(e) => handleDelete(e, sale)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete Invoice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
