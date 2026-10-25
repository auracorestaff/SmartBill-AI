import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Store,
  ReceiptText,
  Boxes,
  Database,
  Shield,
  Save,
  LogOut,
  Trash2,
  CheckCircle2,
  IndianRupee,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { Business } from '../../types';

interface SettingsViewProps {
  business: Business | null;
  onSaveBusiness: (updated: Business) => Promise<void>;
  onSeedDemoData: () => Promise<void>;
  onPurgeDemoData: () => Promise<void>;
  onLogout: () => void;
  userEmail?: string | null;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir'
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  business,
  onSaveBusiness,
  onSeedDemoData,
  onPurgeDemoData,
  onLogout,
  userEmail,
}) => {
  const [formData, setFormData] = useState<Business>(
    business || {
      id: 'biz_default',
      ownerUid: '',
      name: 'SmartBill Traders',
      ownerName: 'Proprietor',
      address: 'Main Market, MG Road, Mumbai',
      phone: '9876543210',
      email: userEmail || '',
      gstin: '27AABCU9603R1ZM',
      state: 'Maharashtra',
      invoicePrefix: 'INV-',
      startingInvoiceNumber: 1,
      currentInvoiceNumber: 1,
      gstEnabled: true,
      defaultGstRate: 18,
      invoiceFooter: 'Goods once sold cannot be returned without original bill.',
      paymentTerms: 'Payment due within 15 days of invoice date.',
      allowNegativeStock: false,
      lowStockThreshold: 5,
      upiId: '',
      bankName: '',
      bankAccountNumber: '',
      bankIfsc: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );

  const [activeTab, setActiveTab] = useState<'profile' | 'invoice' | 'stock' | 'demo'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (business) {
      setFormData(business);
    }
  }, [business]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 320;
        const MAX_HEIGHT = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/png', 0.85);
          setFormData((prev) => ({
            ...prev,
            logoUrl: compressedDataUrl,
          }));
          setStatusMessage('Logo loaded! Click Save Changes below to apply.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoUrl: '',
    }));
    setStatusMessage('Logo removed. Click Save Changes to apply.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);
    try {
      await onSaveBusiness({
        ...formData,
        name: formData.name.trim(),
        gstin: formData.gstin.trim().toUpperCase(),
        invoicePrefix: formData.invoicePrefix.trim() || 'INV-',
        updatedAt: new Date().toISOString(),
      });
      setStatusMessage('Settings saved successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      setStatusMessage('Error saving settings.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-4xl mx-auto px-3.5 sm:px-6 pt-3">
      {/* Top Banner */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-slate-700" />
            <span>Business Settings & Preferences</span>
          </h2>
          <p className="text-xs text-slate-500">
            Configure GST, invoice templates, stock rules, and bank details
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-white p-2 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'profile' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Business Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invoice')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'invoice' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ReceiptText className="w-4 h-4" />
          <span>Invoice & Bank</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stock')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'stock' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Stock Rules</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('demo')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
            activeTab === 'demo' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Demo Data & Sync</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Settings Form */}
      {activeTab !== 'demo' ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-5 text-xs">
          {/* TAB 1: Business Profile */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Business Profile Information
              </h3>

              {/* Business Logo Section */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative shrink-0">
                    {formData.logoUrl ? (
                      <div className="relative w-20 h-20 rounded-2xl border-2 border-slate-200 bg-white p-1.5 flex items-center justify-center overflow-hidden shadow-xs">
                        <img
                          src={formData.logoUrl}
                          alt="Business Logo"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 shadow-xs">
                        <ImageIcon className="w-7 h-7 mb-1 text-slate-300" />
                        <span className="text-[10px] font-bold">No Logo</span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900">Business Logo / Brand Mark</h4>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-sm">
                      Appears on your sales tax invoices, quotation prints, and the top app header.
                    </p>
                    <span className="inline-block mt-1 text-[10px] text-slate-400 font-medium">
                      Square PNG, JPG, or WebP (Auto-compressed for instant loading)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end shrink-0">
                  <label className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{formData.logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>

                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all"
                      title="Remove current logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Business / Shop Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Proprietor / Contact Name</label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Business Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Business Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">GSTIN (15 Digits)</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    placeholder="27ABCDE1234F1Z5"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono uppercase focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">State</label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none"
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
                <label className="block font-bold text-slate-700 mb-1">Business Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm resize-none focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Invoice & Bank */}
          {activeTab === 'invoice' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Invoice Template & Numbering
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Invoice Prefix</label>
                  <input
                    type="text"
                    value={formData.invoicePrefix}
                    onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                    placeholder="INV-"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Default GST Rate %</label>
                  <select
                    value={formData.defaultGstRate}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultGstRate: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Terms (Shown on Bills)</label>
                <input
                  type="text"
                  value={formData.paymentTerms || ''}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  placeholder="Payment due within 15 days."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Invoice Footer Note</label>
                <input
                  type="text"
                  value={formData.invoiceFooter || ''}
                  onChange={(e) => setFormData({ ...formData, invoiceFooter: e.target.value })}
                  placeholder="Thank you for shopping with us!"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none"
                />
              </div>

              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-3 border-t">
                Bank & UPI Details for Invoice Printing
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">UPI ID (VPA)</label>
                  <input
                    type="text"
                    value={formData.upiId || ''}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    placeholder="e.g. yourstore@okaxis"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={formData.bankName || ''}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="e.g. State Bank of India"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    value={formData.bankAccountNumber || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, bankAccountNumber: e.target.value })
                    }
                    placeholder="123456789012"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bank IFSC Code</label>
                  <input
                    type="text"
                    value={formData.bankIfsc || ''}
                    onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
                    placeholder="SBIN0001234"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono uppercase focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Stock Rules */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Inventory & Stock Controls
              </h3>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="allowNegative"
                    checked={formData.allowNegativeStock}
                    onChange={(e) =>
                      setFormData({ ...formData, allowNegativeStock: e.target.checked })
                    }
                    className="w-5 h-5 rounded text-blue-600 border-slate-300"
                  />
                  <div>
                    <label htmlFor="allowNegative" className="font-bold text-slate-800 text-sm">
                      Allow Sales when Stock is Zero (Negative Stock)
                    </label>
                    <p className="text-slate-500 text-xs">
                      If disabled, sales will block with an INSUFFICIENT STOCK warning whenever quantity exceeds available balance.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <label className="block font-bold text-slate-700 mb-1">
                    Global Low Stock Warning Threshold
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.lowStockThreshold}
                    onChange={(e) =>
                      setFormData({ ...formData, lowStockThreshold: Number(e.target.value) })
                    }
                    className="w-32 px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none"
                  />
                  <p className="text-slate-500 text-xs mt-1">
                    Products will display a LOW STOCK alert when available quantity falls to this level or below.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-sm shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'SAVE SETTINGS'}</span>
            </button>
          </div>
        </form>
      ) : (
        /* TAB 4: Demo Data & Sync */
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-xs space-y-6 text-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Development & Demo Data Tools</h3>
            <p className="text-slate-500 text-xs">
              Load realistic Indian sample inventory, customers, suppliers, and purchase bills for testing.
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-blue-950 text-sm flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-600" />
                <span>Load Sample Store Demo Data</span>
              </h4>
              <p className="text-blue-800 text-xs mt-0.5">
                Adds 5 grocery products, 3 customers, 3 suppliers, 2 purchases, and sample sales.
              </p>
            </div>
            <button
              type="button"
              onClick={onSeedDemoData}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs shrink-0"
            >
              Load Demo Data
            </button>
          </div>

          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-rose-950 text-sm flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Purge Sample Demo Data</span>
              </h4>
              <p className="text-rose-800 text-xs mt-0.5">
                Safely removes all demo items without touching your real business invoices or products.
              </p>
            </div>
            <button
              type="button"
              onClick={onPurgeDemoData}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs shrink-0"
            >
              Delete Demo Data
            </button>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Multi-Tenant Firestore Cloud Database</span>
            </h4>
            <p className="text-slate-600 text-xs">
              Project ID: <span className="font-mono font-bold">auracore-hotel</span>
            </p>
            <p className="text-slate-600 text-xs">
              Account: <span className="font-mono font-bold">{userEmail || 'Authenticated Session'}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
