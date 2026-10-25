import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  MessageSquare,
  ArrowDownLeft,
  ReceiptText,
  Edit2,
  Trash2,
  X,
  IndianRupee,
} from 'lucide-react';
import { Customer, Sale, Payment, Business } from '../../types';
import { formatCurrency } from '../../utils/calculations';

interface CustomerListProps {
  customers: Customer[];
  sales: Sale[];
  payments: Payment[];
  business: Business | null;
  ownerUid: string;
  onSaveCustomer: (customer: Customer) => Promise<void>;
  onDeleteCustomer: (customerId: string) => Promise<void>;
  onNewSaleForCustomer: (customer: Customer) => void;
  onReceivePaymentForCustomer: (customer: Customer) => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  sales,
  payments,
  business,
  ownerUid,
  onSaveCustomer,
  onDeleteCustomer,
  onNewSaleForCustomer,
  onReceivePaymentForCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return customers.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.gstin && c.gstin.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  // Customer Profile History
  const customerSales = useMemo(() => {
    if (!viewingCustomer) return [];
    return sales.filter((s) => s.customerId === viewingCustomer.id);
  }, [viewingCustomer, sales]);

  const customerPayments = useMemo(() => {
    if (!viewingCustomer) return [];
    return payments.filter(
      (p) => p.partyType === 'CUSTOMER' && p.partyId === viewingCustomer.id
    );
  }, [viewingCustomer, payments]);

  const totalSalesToCustomer = customerSales.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalReceivedFromCustomer = customerPayments
    .filter((p) => p.type === 'RECEIVE')
    .reduce((sum, p) => sum + p.amount, 0);

  const handleOpenAdd = () => {
    setEditingCustomer({
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      businessId: business?.id || `biz_${ownerUid}`,
      ownerUid,
      name: '',
      phone: '',
      whatsappNumber: '',
      address: '',
      gstin: '',
      openingBalance: 0,
      currentBalance: 0,
      creditLimit: 0,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editingCustomer.name.trim()) return;

    try {
      await onSaveCustomer({
        ...editingCustomer,
        name: editingCustomer.name.trim(),
        phone: editingCustomer.phone.trim(),
        whatsappNumber: editingCustomer.whatsappNumber?.trim() || editingCustomer.phone.trim(),
        gstin: editingCustomer.gstin?.trim().toUpperCase(),
        openingBalance: Number(editingCustomer.openingBalance) || 0,
        currentBalance: Number(editingCustomer.currentBalance) || 0,
        updatedAt: new Date().toISOString(),
      });
      setIsModalOpen(false);
      setEditingCustomer(null);
    } catch (err) {
      console.error('Save customer failed:', err);
      alert('Failed to save customer.');
    }
  };

  const handleDelete = async (e: React.MouseEvent, cust: Customer) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete customer "${cust.name}"?`)) return;
    try {
      await onDeleteCustomer(cust.id);
      if (viewingCustomer?.id === cust.id) setViewingCustomer(null);
    } catch (err) {
      console.error('Delete customer error:', err);
      alert('Failed to delete customer.');
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-7xl mx-auto px-3.5 sm:px-6 pt-3">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Customers & Receivables</span>
          </h2>
          <p className="text-xs text-slate-500">
            {customers.length} registered customers • Track sales, balances, and WhatsApp sharing
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>ADD CUSTOMER</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by customer name, phone number, or GSTIN..."
          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
        />
      </div>

      {/* Customer Cards Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No customers found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {searchQuery
              ? `No customers match "${searchQuery}".`
              : 'Add customers to record sales invoices and receive balance payments.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Customer</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCustomers.map((cust) => {
            const hasDue = cust.currentBalance > 0;
            return (
              <div
                key={cust.id}
                onClick={() => setViewingCustomer(cust)}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-indigo-400 cursor-pointer transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">
                        {cust.name}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{cust.phone || 'No phone'}</span>
                      </p>
                    </div>

                    <span
                      className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shrink-0 ${
                        hasDue
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {hasDue ? `Due: ${formatCurrency(cust.currentBalance)}` : 'Cleared'}
                    </span>
                  </div>

                  {cust.address && (
                    <p className="text-[11px] text-slate-500 mt-2 truncate">{cust.address}</p>
                  )}
                  {cust.gstin && (
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">GSTIN: {cust.gstin}</p>
                  )}
                </div>

                {/* Card Quick Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNewSaleForCustomer(cust);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[11px] hover:bg-emerald-100"
                    >
                      + Sale
                    </button>
                    {hasDue && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReceivePaymentForCustomer(cust);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] hover:bg-blue-100"
                      >
                        Receive ₹
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-slate-400">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCustomer(cust);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg hover:text-indigo-600 hover:bg-slate-100"
                      title="Edit Customer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, cust)}
                      className="p-1.5 rounded-lg hover:text-rose-600 hover:bg-rose-50"
                      title="Delete Customer"
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

      {/* Add / Edit Customer Modal */}
      {isModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingCustomer.id.startsWith('cust_') && !editingCustomer.name
                  ? 'Add New Customer'
                  : 'Edit Customer'}
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
                <label className="block font-bold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  placeholder="e.g. Ramesh Kirana Store"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editingCustomer.phone}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">WhatsApp Number</label>
                  <input
                    type="tel"
                    value={editingCustomer.whatsappNumber || ''}
                    onChange={(e) =>
                      setEditingCustomer({ ...editingCustomer, whatsappNumber: e.target.value })
                    }
                    placeholder="9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  maxLength={15}
                  value={editingCustomer.gstin || ''}
                  onChange={(e) =>
                    setEditingCustomer({ ...editingCustomer, gstin: e.target.value.toUpperCase() })
                  }
                  placeholder="27ABCDE1234F1Z5"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono uppercase focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address / Location</label>
                <input
                  type="text"
                  value={editingCustomer.address || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  placeholder="Market Yard, Pune"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingCustomer.openingBalance || ''}
                    onChange={(e) =>
                      setEditingCustomer({
                        ...editingCustomer,
                        openingBalance: Number(e.target.value),
                        currentBalance: Number(e.target.value),
                      })
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingCustomer.creditLimit || ''}
                    onChange={(e) =>
                      setEditingCustomer({ ...editingCustomer, creditLimit: Number(e.target.value) })
                    }
                    placeholder="50000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono focus:outline-none"
                  />
                </div>
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
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Profile View Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col text-xs">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">{viewingCustomer.name}</h3>
                <p className="text-xs text-slate-400">Customer Profile & Invoices</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Sales</span>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {formatCurrency(totalSalesToCustomer)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Received</span>
                  <p className="font-extrabold text-emerald-600 text-sm mt-0.5">
                    {formatCurrency(totalReceivedFromCustomer)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Outstanding Balance</span>
                  <p className="font-extrabold text-amber-700 text-sm mt-0.5">
                    {formatCurrency(viewingCustomer.currentBalance)}
                  </p>
                </div>
              </div>

              {/* Invoice History */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2">Invoice History ({customerSales.length})</h4>
                {customerSales.length === 0 ? (
                  <p className="text-slate-400 text-center py-4 bg-slate-50 rounded-xl border">No invoices yet.</p>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                        <tr>
                          <th className="p-2">Invoice #</th>
                          <th className="p-2">Date</th>
                          <th className="p-2">Total</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {customerSales.map((s) => (
                          <tr key={s.id}>
                            <td className="p-2 font-mono font-semibold">{s.invoiceNumber}</td>
                            <td className="p-2">{s.invoiceDate}</td>
                            <td className="p-2 font-bold font-mono">{formatCurrency(s.grandTotal)}</td>
                            <td className="p-2 font-semibold">{s.paymentStatus}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Payment History */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2">Payment Receipts ({customerPayments.length})</h4>
                {customerPayments.length === 0 ? (
                  <p className="text-slate-400 text-center py-4 bg-slate-50 rounded-xl border">No payments recorded.</p>
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
                        {customerPayments.map((p) => (
                          <tr key={p.id}>
                            <td className="p-2">{p.date}</td>
                            <td className="p-2">{p.paymentMethod}</td>
                            <td className="p-2 font-mono text-slate-500">{p.referenceNumber || '-'}</td>
                            <td className="p-2 font-bold text-emerald-600 font-mono text-right">
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
                    onNewSaleForCustomer(viewingCustomer);
                    setViewingCustomer(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold"
                >
                  NEW SALE
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onReceivePaymentForCustomer(viewingCustomer);
                    setViewingCustomer(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold"
                >
                  RECEIVE PAYMENT
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
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
