import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, IndianRupee, Calendar, CreditCard, Banknote, Building2, FileText } from 'lucide-react';
import { Sale, Customer } from '../../types';
import { formatCurrency, formatDateToIndian } from '../../utils/calculations';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  customer?: Customer | null;
  onConfirmPayment: (
    sale: Sale,
    amountPaid: number,
    paymentMethod: string,
    date: string,
    referenceNumber?: string,
    notes?: string
  ) => Promise<void>;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  sale,
  customer,
  onConfirmPayment,
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(formatDateToIndian(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE'>('UPI');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (sale) {
      setAmount(sale.balanceDue > 0 ? sale.balanceDue : sale.grandTotal);
      setDate(formatDateToIndian(new Date()));
      setPaymentMethod('UPI');
      setReferenceNumber('');
      setNotes(`Payment received for Invoice #${sale.invoiceNumber}`);
      setErrorMessage(null);
    }
  }, [sale]);

  if (!isOpen || !sale) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (amount <= 0) {
      setErrorMessage('Please enter an amount greater than 0.');
      return;
    }

    if (amount > sale.balanceDue) {
      const confirmOverpay = window.confirm(
        `The amount entered (₹${amount}) is greater than the remaining balance due (₹${sale.balanceDue}). Do you wish to proceed?`
      );
      if (!confirmOverpay) return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmPayment(sale, Number(amount), paymentMethod, date, referenceNumber.trim(), notes.trim());
      onClose();
    } catch (err) {
      console.error('Failed to record payment:', err);
      setErrorMessage('Failed to save payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-auto overflow-hidden border border-slate-200 my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold">
              <IndianRupee className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">Record Payment Received</h3>
              <p className="text-xs text-emerald-100">
                Invoice <span className="font-mono font-semibold">#{sale.invoiceNumber}</span> • {sale.customerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-emerald-100 hover:text-white hover:bg-emerald-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Balance Summary Banner */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-2 text-center">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Bill</span>
            <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
              {formatCurrency(sale.grandTotal)}
            </span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-emerald-600 block">Paid So Far</span>
            <span className="text-xs sm:text-sm font-bold text-emerald-700 font-mono">
              {formatCurrency(sale.paidAmount)}
            </span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border-2 border-rose-300 bg-rose-50/50">
            <span className="text-[10px] uppercase font-bold text-rose-600 block">Balance Due</span>
            <span className="text-xs sm:text-sm font-black text-rose-700 font-mono">
              {formatCurrency(sale.balanceDue)}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
              {errorMessage}
            </div>
          )}

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Payment Amount Received (₹) *</label>
              <button
                type="button"
                onClick={() => setAmount(sale.balanceDue)}
                className="text-[11px] font-bold text-emerald-700 hover:underline"
              >
                Pay Full Due ({formatCurrency(sale.balanceDue)})
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 text-base font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Payment Mode *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'UPI', label: 'UPI / QR', icon: CreditCard },
                { id: 'CASH', label: 'Cash', icon: Banknote },
                { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2 },
                { id: 'CHEQUE', label: 'Cheque', icon: FileText },
              ].map((m) => {
                const IconComponent = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 font-bold transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="text-[11px]">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Date</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Transaction Ref / UTR (Optional)</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. UPI Ref / Cheque No"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Remarks / Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid in full via GPay"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
            />
          </div>

          {/* Customer balance update hint */}
          {customer && (
            <p className="text-[11px] text-slate-500 bg-blue-50 p-2.5 rounded-xl border border-blue-100">
              ℹ️ Customer <strong>{customer.name}</strong> ledger will automatically update: balance reduced by <strong>₹{amount || 0}</strong>.
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Updating...' : `Confirm ₹${amount || 0} Received`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
