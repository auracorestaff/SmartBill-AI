import React, { useState } from 'react';
import { Store, Building2, Check, ArrowRight, Shield, IndianRupee } from 'lucide-react';
import { Business } from '../../types';

interface BusinessSetupWizardProps {
  ownerUid: string;
  initialEmail?: string;
  onSave: (business: Business) => Promise<void>;
  onSkip: () => void;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir'
];

export const BusinessSetupWizard: React.FC<BusinessSetupWizardProps> = ({
  ownerUid,
  initialEmail = '',
  onSave,
  onSkip,
}) => {
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [gstin, setGstin] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');
  const [startingInvoiceNumber, setStartingInvoiceNumber] = useState(1);
  const [gstEnabled, setGstEnabled] = useState(true);
  const [defaultGstRate, setDefaultGstRate] = useState(18);
  const [invoiceFooter, setInvoiceFooter] = useState('Thank you for your business! Goods once sold are not returnable.');
  const [paymentTerms, setPaymentTerms] = useState('Payment due within 15 days of invoice date.');
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter your business name.');
      return;
    }

    setIsSubmitting(true);
    const business: Business = {
      id: `biz_${ownerUid}`,
      ownerUid,
      name: name.trim(),
      ownerName: ownerName.trim() || 'Business Owner',
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      gstin: gstin.trim().toUpperCase(),
      state,
      invoicePrefix: invoicePrefix.trim() || 'INV-',
      startingInvoiceNumber: Number(startingInvoiceNumber) || 1,
      currentInvoiceNumber: Number(startingInvoiceNumber) || 1,
      gstEnabled,
      defaultGstRate: Number(defaultGstRate) || 18,
      invoiceFooter,
      paymentTerms,
      allowNegativeStock,
      lowStockThreshold: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSave(business);
    } catch (err) {
      console.error('Failed to save business setup:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-800 p-6 text-white text-center">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-xs border border-white/20">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black">Welcome to SmartBill AI</h2>
          <p className="text-blue-100 text-xs sm:text-sm mt-1">
            Let's setup your business profile to generate professional GST invoices and automate stock.
          </p>
        </div>

        {/* Setup Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              1. Basic Business Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mahadev Traders & Kirana"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Owner / Contact Person
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Business Phone (for Invoices)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  State
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Business Address
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop No. 5, Main Market, MG Road, Pune, Maharashtra - 411001"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none resize-none"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              2. GST & Invoice Configuration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  GSTIN (15 Digits, Optional if non-GST)
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="27ABCDE1234F1Z5"
                  maxLength={15}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default GST Rate %
                </label>
                <select
                  value={defaultGstRate}
                  onChange={(e) => setDefaultGstRate(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
                >
                  <option value={0}>0% (Exempt)</option>
                  <option value={5}>5% (Essential Goods)</option>
                  <option value={12}>12% (Standard)</option>
                  <option value={18}>18% (Most Goods & Services)</option>
                  <option value={28}>28% (Luxury / Aerated)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Invoice Number Prefix
                </label>
                <input
                  type="text"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  placeholder="INV-"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Starting Invoice Number
                </label>
                <input
                  type="number"
                  min={1}
                  value={startingInvoiceNumber}
                  onChange={(e) => setStartingInvoiceNumber(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Preview: <span className="font-semibold text-blue-700">{invoicePrefix}{String(startingInvoiceNumber).padStart(6, '0')}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="allowNeg"
                checked={allowNegativeStock}
                onChange={(e) => setAllowNegativeStock(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <label htmlFor="allowNeg" className="text-xs text-slate-700">
                Allow sales even when stock is zero (Negative stock allowed)
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onSkip}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Skip for Now (Setup Later)
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Saving...' : 'Save & Launch Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
