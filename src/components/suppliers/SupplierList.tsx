import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Phone,
  ArrowUpRight,
  ShoppingBag,
  Edit2,
  Trash2,
  X,
  Camera,
} from 'lucide-react';
import { Supplier, Purchase, Payment, Business } from '../../types';
import { formatCurrency } from '../../utils/calculations';

interface SupplierListProps {
  suppliers: Supplier[];
  purchases: Purchase[];
  payments: Payment[];
  business: Business | null;
  ownerUid: string;
  onSaveSupplier: (supplier: Supplier) => Promise<void>;
  onDeleteSupplier: (supplierId: string) => Promise<void>;
  onScanBillForSupplier: (supplier: Supplier) => void;
  onMakePaymentForSupplier: (supplier: Supplier) => void;
}

export const SupplierList: React.FC<SupplierListProps> = ({
  suppliers,
  purchases,
  payments,
  business,
  ownerUid,
  onSaveSupplier,
  onDeleteSupplier,
  onScanBillForSupplier,
  onMakePaymentForSupplier,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);

  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return suppliers.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        (s.gstin && s.gstin.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q))
    );
  }, [suppliers, searchQuery]);

  // Supplier History
  const supplierPurchases = useMemo(() => {
    if (!viewingSupplier) return [];
    return purchases.filter((p) => p.supplierId === viewingSupplier.id);
  }, [viewingSupplier, purchases]);

  const supplierPayments = useMemo(() => {
    if (!viewingSupplier) return [];
    return payments.filter(
      (p) => p.partyType === 'SUPPLIER' && p.partyId === viewingSupplier.id
    );
  }, [viewingSupplier, payments]);

  const totalPurchasedFromSupplier = supplierPurchases.reduce((sum, p) => sum + p.grandTotal, 0);
  const totalPaidToSupplier = supplierPayments
    .filter((p) => p.type === 'PAY')
    .reduce((sum, p) => sum + p.amount, 0);

  const handleOpenAdd = () => {
    setEditingSupplier({
      id: `sup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      businessId: business?.id || `biz_${ownerUid}`,
      ownerUid,
      name: '',
      phone: '',
      address: '',
      gstin: '',
      openingBalance: 0,
      currentBalance: 0,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !editingSupplier.name.trim()) return;

    try {
      await onSaveSupplier({
        ...editingSupplier,
        name: editingSupplier.name.trim(),
        phone: editingSupplier.phone.trim(),
        gstin: editingSupplier.gstin?.trim().toUpperCase(),
        openingBalance: Number(editingSupplier.openingBalance) || 0,
        currentBalance: Number(editingSupplier.currentBalance) || 0,
        updatedAt: new Date().toISOString(),
      });
      setIsModalOpen(false);
      setEditingSupplier(null);
    } catch (err) {
      console.error('Save supplier failed:', err);
      alert('Failed to save supplier.');
    }
  };

  const handleDelete = async (e: React.MouseEvent, sup: Supplier) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete supplier "${sup.name}"?`)) return;
    try {
      await onDeleteSupplier(sup.id);
      if (viewingSupplier?.id === sup.id) setViewingSupplier(null);
    } catch (err) {
      console.error('Delete supplier error:', err);
      alert('Failed to delete supplier.');
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-7xl mx-auto px-3.5 sm:px-6 pt-3">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-purple-600" />
            <span>Suppliers & Payables</span>
          </h2>
          <p className="text-xs text-slate-500">
            {suppliers.length} vendors & distributors • Auto-matched during purchase bill scanning
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>ADD SUPPLIER</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search supplier name, phone, or GSTIN..."
          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm focus:ring-2 focus:ring-purple-600 focus:outline-none"
        />
      </div>

      {/* Supplier Grid */}
      {filteredSuppliers.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
            <Truck className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No suppliers found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {searchQuery
              ? `No suppliers match "${searchQuery}".`
              : 'Add your vendors or scan purchase bills to automatically detect and register suppliers.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Supplier</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSuppliers.map((sup) => {
            const hasPayable = sup.currentBalance > 0;
            return (
              <div
                key={sup.id}
                onClick={() => setViewingSupplier(sup)}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-purple-400 cursor-pointer transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">{sup.name}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{sup.phone || 'No phone'}</span>
                      </p>
                    </div>

                    <span
                      className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shrink-0 ${
                        hasPayable
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {hasPayable ? `Payable: ${formatCurrency(sup.currentBalance)}` : 'Cleared'}
                    </span>
                  </div>

                  {sup.address && (
                    <p className="text-[11px] text-slate-500 mt-2 truncate">{sup.address}</p>
                  )}
                  {sup.gstin && (
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">GSTIN: {sup.gstin}</p>
                  )}
                </div>

                {/* Card Quick Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onScanBillForSupplier(sup);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] hover:bg-blue-100 flex items-center gap-1"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Scan Bill</span>
                    </button>
                    {hasPayable && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMakePaymentForSupplier(sup);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold text-[11px] hover:bg-rose-100 flex items-center gap-1"
                      >
                        <ArrowUpRight className="w-3 h-3" />
                        <span>Pay ₹</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-slate-400">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSupplier(sup);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg hover:text-purple-600 hover:bg-slate-100"
                      title="Edit Supplier"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, sup)}
                      className="p-1.5 rounded-lg hover:text-rose-600 hover:bg-rose-50"
                      title="Delete Supplier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && editingSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingSupplier.id.startsWith('sup_') && !editingSupplier.name
                  ? 'Add New Supplier'
                  : 'Edit Supplier'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Supplier / Firm Name *</label>
                <input
                  type="text"
                  required
                  value={editingSupplier.name}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                  placeholder="e.g. Gupta Wholesale Distributors"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={editingSupplier.phone}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Supplier GSTIN (15 Digits)</label>
                <input
                  type="text"
                  maxLength={15}
                  value={editingSupplier.gstin || ''}
                  onChange={(e) =>
                    setEditingSupplier({ ...editingSupplier, gstin: e.target.value.toUpperCase() })
                  }
                  placeholder="27ABCDE1234F1Z5"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address / Market Location</label>
                <input
                  type="text"
                  value={editingSupplier.address || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
                  placeholder="APMC Market, Vashi"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Opening Payable Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingSupplier.openingBalance || ''}
                  onChange={(e) =>
                    setEditingSupplier({
                      ...editingSupplier,
                      openingBalance: Number(e.target.value),
                      currentBalance: Number(e.target.value),
                    })
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Profile Modal */}
      {viewingSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col text-xs">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">{viewingSupplier.name}</h3>
                <p className="text-xs text-slate-400">Supplier Ledger & Purchases</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingSupplier(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Purchased</span>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {formatCurrency(totalPurchasedFromSupplier)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Paid</span>
                  <p className="font-extrabold text-emerald-600 text-sm mt-0.5">
                    {formatCurrency(totalPaidToSupplier)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Payable Balance</span>
                  <p className="font-extrabold text-rose-600 text-sm mt-0.5">
                    {formatCurrency(viewingSupplier.currentBalance)}
                  </p>
                </div>
              </div>

              {/* Purchase Bills History */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2">Purchase Bills ({supplierPurchases.length})</h4>
                {supplierPurchases.length === 0 ? (
                  <p className="text-slate-400 text-center py-4 bg-slate-50 rounded-xl border">No purchase bills recorded.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                        <tr>
                          <th className="p-2">Bill #</th>
                          <th className="p-2">Date</th>
                          <th className="p-2">Grand Total</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {supplierPurchases.map((p) => (
                          <tr key={p.id}>
                            <td className="p-2 font-mono font-semibold">{p.invoiceNumber}</td>
                            <td className="p-2">{p.invoiceDate}</td>
                            <td className="p-2 font-bold font-mono">{formatCurrency(p.grandTotal)}</td>
                            <td className="p-2 font-semibold">{p.paymentStatus}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Payment Vouchers History */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2">Payment Vouchers Made ({supplierPayments.length})</h4>
                {supplierPayments.length === 0 ? (
                  <p className="text-slate-400 text-center py-4 bg-slate-50 rounded-xl border">No payment records yet.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                        <tr>
                          <th className="p-2">Date</th>
                          <th className="p-2">Method</th>
                          <th className="p-2">Ref #</th>
                          <th className="p-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {supplierPayments.map((p) => (
                          <tr key={p.id}>
                            <td className="p-2">{p.date}</td>
                            <td className="p-2">{p.paymentMethod}</td>
                            <td className="p-2 font-mono text-slate-500">{p.referenceNumber || '-'}</td>
                            <td className="p-2 font-bold text-rose-600 font-mono text-right">
                              {formatCurrency(p.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onScanBillForSupplier(viewingSupplier);
                    setViewingSupplier(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold"
                >
                  SCAN BILL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onMakePaymentForSupplier(viewingSupplier);
                    setViewingSupplier(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-bold"
                >
                  MAKE PAYMENT
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewingSupplier(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 text-slate-800 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
