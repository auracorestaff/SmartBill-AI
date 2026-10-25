import React, { useState, useEffect } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Customer, Supplier, Payment, Business } from '../../types';
import { formatCurrency, formatDateToIndian } from '../../utils/calculations';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType: 'RECEIVE' | 'PAY';
  customers: Customer[];
  suppliers: Supplier[];
  initialPartyId?: string;
  business: Business | null;
  ownerUid: string;
  onSavePayment: (payment: Payment, partyObj?: Customer | Supplier) => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  defaultType,
  customers,
  suppliers,
  initialPartyId,
  business,
  ownerUid,
  onSavePayment,
}) => {
  const [type, setType] = useState<'RECEIVE' | 'PAY'>(defaultType);
  const [partyId, setPartyId] = useState<string>(initialPartyId || '');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(formatDateToIndian(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CASH' | 'BANK' | 'CARD' | 'OTHER'>('UPI');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setType(defaultType);
    if (initialPartyId) {
      setPartyId(initialPartyId);
    } else {
      if (defaultType === 'RECEIVE' && customers.length > 0) {
        setPartyId(customers[0].id);
      } else if (defaultType === 'PAY' && suppliers.length > 0) {
        setPartyId(suppliers[0].id);
      }
    }
    setFormError(null);
  }, [defaultType, initialPartyId, customers, suppliers]);

  const selectedParty = type === 'RECEIVE'
    ? customers.find((c) => c.id === partyId)
    : suppliers.find((s) => s.id === partyId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!partyId) {
      setFormError('Please select a customer or supplier.');
      return;
    }
    if (amount <= 0) {
      setFormError('Please enter an amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    const businessId = business?.id || `biz_${ownerUid}`;
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const payment: Payment = {
      id: paymentId,
      businessId,
      ownerUid,
      partyType: type === 'RECEIVE' ? 'CUSTOMER' : 'SUPPLIER',
      partyId,
      partyName: selectedParty?.name || 'Party',
      type,
      amount: Number(amount),
      date,
      paymentMethod,
      referenceNumber: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSavePayment(payment, selectedParty);
      onClose();
    } catch (err) {
      console.error('Save payment error:', err);
      setFormError('Failed to record payment voucher. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
        <div className={`p-4 text-white flex items-center justify-between ${
          type === 'RECEIVE' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              {type === 'RECEIVE' ? <ArrowDownLeft className="w-5 h-5 text-white" /> : <ArrowUpRight className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {type === 'RECEIVE' ? 'Receive Payment from Customer' : 'Make Payment to Supplier'}
              </h3>
              <p className="text-[11px] text-white/80">Auto-updates outstanding balance</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-white/80 hover:text-white"
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

          {/* Toggle Type */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setType('RECEIVE');
                setPartyId(customers[0]?.id || '');
              }}
              className={`py-1.5 rounded-lg font-bold text-xs transition-colors ${
                type === 'RECEIVE' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Receive from Customer
            </button>
            <button
              type="button"
              onClick={() => {
                setType('PAY');
                setPartyId(suppliers[0]?.id || '');
              }}
              className={`py-1.5 rounded-lg font-bold text-xs transition-colors ${
                type === 'PAY' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Pay to Supplier
            </button>
          </div>

          {/* Party Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {type === 'RECEIVE' ? 'Select Customer *' : 'Select Supplier *'}
            </label>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold bg-white focus:outline-none"
            >
              <option value="">-- Choose Party --</option>
              {type === 'RECEIVE'
                ? customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Due: {formatCurrency(c.currentBalance)})
                    </option>
                  ))
                : suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Payable: {formatCurrency(s.currentBalance)})
                    </option>
                  ))}
            </select>

            {selectedParty && (
              <div className="mt-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] flex justify-between">
                <span className="text-slate-500">Current Outstanding Balance:</span>
                <span className={`font-bold font-mono ${type === 'RECEIVE' ? 'text-amber-700' : 'text-rose-700'}`}>
                  {formatCurrency(selectedParty.currentBalance)}
                </span>
              </div>
            )}
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold font-mono text-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Date *</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['UPI', 'CASH', 'BANK', 'CARD'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMethod(mode)}
                  className={`py-2 rounded-xl font-bold text-xs border transition-colors ${
                    paymentMethod === mode
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Reference Number & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Ref / UTR / Cheque #</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. UPI-9847184"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional remarks"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
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
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-xl font-bold text-white shadow-xs transition-all disabled:opacity-50 ${
                type === 'RECEIVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isSubmitting ? 'Recording...' : 'RECORD PAYMENT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
