import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  ReceiptText,
  UserPlus,
  AlertTriangle,
  FileCheck,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { Sale, SaleItem, Customer, Product, Business } from '../../types';
import {
  calculateLineItem,
  calculateInvoiceTotals,
  formatCurrency,
  formatDateToIndian,
  round2,
} from '../../utils/calculations';
import { generateNextInvoiceNumber } from '../../services/dbService';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  products: Product[];
  business: Business | null;
  ownerUid: string;
  onSaveSale: (sale: Sale, newCustomer?: Customer) => Promise<void>;
  onInvoiceCreated: (sale: Sale) => void;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  isOpen,
  onClose,
  customers,
  products,
  business,
  ownerUid,
  onSaveSale,
  onInvoiceCreated,
}) => {
  // Selected customer or new customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustGSTIN, setNewCustGSTIN] = useState('');

  // Invoice Meta
  const [invoiceNumber, setInvoiceNumber] = useState('INV-000001');
  const [invoiceDate, setInvoiceDate] = useState(formatDateToIndian(new Date()));
  const [dueDate, setDueDate] = useState('');
  const [isInterstate, setIsInterstate] = useState(false);

  // Items
  const [items, setItems] = useState<SaleItem[]>([]);

  // Payment
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PARTIAL' | 'UNPAID'>('PAID');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load next invoice number on open
  useEffect(() => {
    async function loadNumber() {
      if (business?.id) {
        const next = await generateNextInvoiceNumber(business.id, business.invoicePrefix || 'INV-');
        setInvoiceNumber(next.invoiceNumber);
      }
    }
    loadNumber();

    // Default first line item
    if (products.length > 0) {
      const firstProd = products[0];
      const calc = calculateLineItem({
        quantity: 1,
        rate: firstProd.sellingPrice,
        gstRate: firstProd.gstRate,
        isInterstate: false,
      });
      setItems([
        {
          productId: firstProd.id,
          productName: firstProd.name,
          hsn: firstProd.hsn,
          quantity: 1,
          unit: firstProd.unit,
          sellingRate: firstProd.sellingPrice,
          discount: 0,
          taxableAmount: calc.taxableAmount,
          gstRate: firstProd.gstRate,
          cgst: calc.cgst,
          sgst: calc.sgst,
          igst: calc.igst,
          lineTotal: calc.lineTotal,
        },
      ]);
    }
  }, [business, products]);

  // Selected customer object
  const activeCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Calculate invoice totals
  const totals = useMemo(() => {
    return calculateInvoiceTotals(
      items.map((i) => ({
        quantity: i.quantity,
        rate: i.sellingRate,
        discount: i.discount,
        gstRate: i.gstRate,
      })),
      isInterstate,
      true
    );
  }, [items, isInterstate]);

  // Auto set paidAmount if PAID
  useEffect(() => {
    if (paymentStatus === 'PAID') {
      setPaidAmount(totals.grandTotal);
    } else if (paymentStatus === 'UNPAID') {
      setPaidAmount(0);
    }
  }, [totals.grandTotal, paymentStatus]);

  // Handle item updates
  const handleUpdateItem = (index: number, updates: Partial<SaleItem>) => {
    setItems((prev) => {
      const next = [...prev];
      const current = { ...next[index], ...updates };

      // If product changed, update rate & unit & HSN
      if (updates.productId) {
        const prod = products.find((p) => p.id === updates.productId);
        if (prod) {
          current.productName = prod.name;
          current.sellingRate = prod.sellingPrice;
          current.unit = prod.unit;
          current.hsn = prod.hsn;
          current.gstRate = prod.gstRate;
        }
      }

      const calc = calculateLineItem({
        quantity: current.quantity,
        rate: current.sellingRate,
        discount: current.discount,
        gstRate: current.gstRate,
        isInterstate,
      });

      current.taxableAmount = calc.taxableAmount;
      current.cgst = calc.cgst;
      current.sgst = calc.sgst;
      current.igst = calc.igst;
      current.lineTotal = calc.lineTotal;

      next[index] = current;
      return next;
    });
  };

  const handleAddItem = () => {
    if (products.length === 0) {
      alert('Please add products to your stock catalogue first.');
      return;
    }
    const prod = products[0];
    const calc = calculateLineItem({
      quantity: 1,
      rate: prod.sellingPrice,
      gstRate: prod.gstRate,
      isInterstate,
    });
    setItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.name,
        hsn: prod.hsn,
        quantity: 1,
        unit: prod.unit,
        sellingRate: prod.sellingPrice,
        discount: 0,
        taxableAmount: calc.taxableAmount,
        gstRate: prod.gstRate,
        cgst: calc.cgst,
        sgst: calc.sgst,
        igst: calc.igst,
        lineTotal: calc.lineTotal,
      },
    ]);
  };

  const handleDeleteItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Stock check validation
  const stockErrors = useMemo(() => {
    const errs: string[] = [];
    const allowNegative = business?.allowNegativeStock ?? false;

    for (const item of items) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod && item.quantity > prod.currentStock) {
        errs.push(
          `${prod.name}: Requested ${item.quantity} ${prod.unit}, but only ${prod.currentStock} available in stock.`
        );
      }
    }
    return { hasErrors: errs.length > 0 && !allowNegative, list: errs, allowNegative };
  }, [items, products, business]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isAddingNewCustomer && !selectedCustomerId && !newCustName) {
      setFormError('Please select or enter a Customer Name.');
      return;
    }

    if (items.length === 0) {
      setFormError('Please add at least one product item to create an invoice.');
      return;
    }

    if (stockErrors.hasErrors) {
      setFormError(
        `INSUFFICIENT STOCK: ${stockErrors.list.join(', ')}. Please adjust quantities or enable "Allow Negative Stock" in Settings.`
      );
      return;
    }

    setIsSubmitting(true);
    const businessId = business?.id || `biz_${ownerUid}`;
    const saleId = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let newCust: Customer | undefined;
    let customerName = activeCustomer?.name || 'Walk-in Customer';
    let customerPhone = activeCustomer?.phone || '';
    let customerAddress = activeCustomer?.address || '';
    let customerGSTIN = activeCustomer?.gstin || '';

    if (isAddingNewCustomer && newCustName.trim()) {
      customerName = newCustName.trim();
      customerPhone = newCustPhone.trim();
      customerAddress = newCustAddress.trim();
      customerGSTIN = newCustGSTIN.trim().toUpperCase();

      newCust = {
        id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        businessId,
        ownerUid,
        name: customerName,
        phone: customerPhone,
        address: customerAddress,
        gstin: customerGSTIN,
        openingBalance: 0,
        currentBalance: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const actualPaid = paymentStatus === 'PAID' ? totals.grandTotal : Math.min(paidAmount, totals.grandTotal);
    const balanceDue = round2(Math.max(0, totals.grandTotal - actualPaid));

    const saleRecord: Sale = {
      id: saleId,
      businessId,
      ownerUid,
      invoiceNumber,
      customerId: newCust ? newCust.id : activeCustomer?.id,
      customerName,
      customerPhone,
      customerAddress,
      customerGSTIN,
      invoiceDate,
      dueDate,
      items,
      isInterstate,
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      taxableTotal: totals.taxableTotal,
      totalCGST: totals.totalCGST,
      totalSGST: totals.totalSGST,
      totalIGST: totals.totalIGST,
      totalTax: totals.totalTax,
      roundOff: totals.roundOff,
      grandTotal: totals.grandTotal,
      paidAmount: actualPaid,
      balanceDue,
      paymentStatus,
      paymentMethod,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSaveSale(saleRecord, newCust);
      onClose();
      onInvoiceCreated(saleRecord);
    } catch (err) {
      console.error('Error saving sale:', err);
      setFormError('Failed to save sales invoice. Please check your data and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col justify-start p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full mx-auto overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-bold">
              <ReceiptText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Create Sales Invoice</h3>
              <p className="text-xs text-slate-400">
                Invoice No: <span className="text-emerald-400 font-mono font-bold">{invoiceNumber}</span> • Instant GST & Stock Update
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className="bg-rose-600 text-white px-4 py-2.5 flex items-center justify-between text-xs font-semibold shrink-0">
            <span>{formError}</span>
            <button
              type="button"
              onClick={() => setFormError(null)}
              className="text-white/80 hover:text-white underline ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1 text-xs">
          {/* Section 1: Customer Selection */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Customer Details
              </span>
              <button
                type="button"
                onClick={() => setIsAddingNewCustomer(!isAddingNewCustomer)}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                {isAddingNewCustomer ? 'Select Existing Customer' : '+ New Customer'}
              </button>
            </div>

            {!isAddingNewCustomer ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Customer
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="">-- Choose Customer or Walk-in --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone || 'No phone'}) - Due: {formatCurrency(c.currentBalance)}
                      </option>
                    ))}
                  </select>
                </div>

                {activeCustomer && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <p className="font-bold text-slate-900">{activeCustomer.name}</p>
                    <p className="text-slate-500 text-[11px]">Phone: {activeCustomer.phone} | GSTIN: {activeCustomer.gstin || 'None'}</p>
                    <p className="text-amber-700 text-[11px] font-semibold mt-0.5">
                      Current Outstanding Balance: {formatCurrency(activeCustomer.currentBalance)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="e.g. Ramesh Kirana"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={newCustGSTIN}
                    onChange={(e) => setNewCustGSTIN(e.target.value.toUpperCase())}
                    placeholder="27ABCDE1234F1Z5"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono uppercase focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City / Address</label>
                  <input
                    type="text"
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                    placeholder="Mumbai"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Invoice Dates & Tax mode */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Number</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold bg-slate-50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Date *</label>
              <input
                type="text"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
              <input
                type="text"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">GST Tax Type</label>
              <select
                value={isInterstate ? 'interstate' : 'intrastate'}
                onChange={(e) => setIsInterstate(e.target.value === 'interstate')}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white font-medium focus:outline-none"
              >
                <option value="intrastate">Intra-state (CGST + SGST)</option>
                <option value="interstate">Inter-state (IGST)</option>
              </select>
            </div>
          </div>

          {/* Section 3: Product Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Invoice Items ({items.length})
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-100/80 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                    <th className="py-2.5 px-3 w-10">#</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Product</th>
                    <th className="py-2.5 px-3 w-24">Qty</th>
                    <th className="py-2.5 px-3 w-28">Rate (₹)</th>
                    <th className="py-2.5 px-3 w-24">Disc (₹)</th>
                    <th className="py-2.5 px-3 w-24">GST %</th>
                    <th className="py-2.5 px-3 w-28 text-right">Total (₹)</th>
                    <th className="py-2.5 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {items.map((item, index) => {
                    const prod = products.find((p) => p.id === item.productId);
                    const isLowStock = prod ? item.quantity > prod.currentStock : false;

                    return (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-400">{index + 1}</td>

                        {/* Product Picker */}
                        <td className="py-2.5 px-3">
                          <select
                            value={item.productId}
                            onChange={(e) => handleUpdateItem(index, { productId: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold text-xs bg-white focus:outline-none"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (Stock: {p.currentStock} {p.unit} • ₹{p.sellingPrice})
                              </option>
                            ))}
                          </select>
                          {prod && (
                            <div className="mt-1 flex items-center gap-2 text-[10px]">
                              <span className={`font-semibold ${prod.currentStock > 0 ? 'text-slate-600' : 'text-rose-600'}`}>
                                Stock: {prod.currentStock} {prod.unit}
                              </span>
                              {isLowStock && (
                                <span className="text-rose-600 font-bold flex items-center gap-0.5 bg-rose-50 px-1 rounded">
                                  <AlertTriangle className="w-2.5 h-2.5" /> INSUFFICIENT STOCK
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(index, { quantity: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-center font-bold focus:outline-none"
                          />
                        </td>

                        {/* Rate */}
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.sellingRate}
                            onChange={(e) => handleUpdateItem(index, { sellingRate: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-right font-mono font-semibold focus:outline-none"
                          />
                        </td>

                        {/* Discount */}
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.discount || ''}
                            placeholder="0"
                            onChange={(e) => handleUpdateItem(index, { discount: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-right font-mono focus:outline-none"
                          />
                        </td>

                        {/* GST % */}
                        <td className="py-2.5 px-3">
                          <select
                            value={item.gstRate}
                            onChange={(e) => handleUpdateItem(index, { gstRate: Number(e.target.value) })}
                            className="w-full px-1.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium focus:outline-none"
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </select>
                        </td>

                        {/* Line Total */}
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                          {formatCurrency(item.lineTotal)}
                        </td>

                        {/* Delete row */}
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(index)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Insufficient stock banner warning */}
          {stockErrors.list.length > 0 && (
            <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              stockErrors.allowNegative ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wider">
                  {stockErrors.allowNegative ? 'Negative Stock Warning (Allowed)' : 'INSUFFICIENT STOCK'}
                </p>
                <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                  {stockErrors.list.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Bottom Totals & Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {/* Payment status & Mode */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Payment Collection
              </span>

              <div className="grid grid-cols-3 gap-2">
                {(['PAID', 'PARTIAL', 'UNPAID'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setPaymentStatus(st)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      paymentStatus === st
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {paymentStatus !== 'UNPAID' && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Received Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white font-semibold focus:outline-none"
                    >
                      <option value="UPI">UPI / QR Code</option>
                      <option value="CASH">Cash</option>
                      <option value="BANK">Bank Transfer</option>
                      <option value="CARD">Card</option>
                    </select>
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-500 pt-1">
                Balance Due from Customer:{' '}
                <span className="font-bold text-amber-700">
                  {formatCurrency(
                    Math.max(
                      0,
                      totals.grandTotal - (paymentStatus === 'PAID' ? totals.grandTotal : paidAmount)
                    )
                  )}
                </span>
              </p>
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Taxable Total:</span>
                <span className="font-mono font-semibold">{formatCurrency(totals.taxableTotal)}</span>
              </div>

              {isInterstate ? (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>IGST Total:</span>
                  <span className="font-mono font-semibold">{formatCurrency(totals.totalIGST)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>CGST Total:</span>
                    <span className="font-mono font-semibold">{formatCurrency(totals.totalCGST)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>SGST Total:</span>
                    <span className="font-mono font-semibold">{formatCurrency(totals.totalSGST)}</span>
                  </div>
                </>
              )}

              {totals.roundOff !== 0 && (
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Round Off:</span>
                  <span className="font-mono">{totals.roundOff.toFixed(2)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-300 flex items-center justify-between">
                <span className="text-sm font-extrabold text-slate-900">Invoice Grand Total:</span>
                <span className="text-lg font-black text-emerald-700 font-mono">
                  {formatCurrency(totals.grandTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Action Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <FileCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Generating Invoice...' : 'GENERATE INVOICE & UPDATE STOCK'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
