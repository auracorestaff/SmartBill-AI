import React, { useState, useMemo } from 'react';
import { Quotation, QuotationItem, Customer, Supplier, Product, Business } from '../../types';
import { FileText, Plus, Search, Calendar, Building2, Users, Printer, Share2, CheckCircle2, Clock, XCircle, ArrowRight, Camera, Trash2, Edit3, Eye, FileCheck } from 'lucide-react';
import { extractBillWithAI, compressImage } from '../../services/aiService';
import { round2 } from '../../utils/calculations';

interface QuotationsViewProps {
  quotations: Quotation[];
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
  business: Business | null;
  ownerUid: string;
  onSaveQuotation: (quotation: Quotation) => Promise<void>;
  onDeleteQuotation: (quotationId: string) => Promise<void>;
  onConvertToSale?: (quotation: Quotation) => void;
  onConvertToPurchase?: (quotation: Quotation) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const QuotationsView: React.FC<QuotationsViewProps> = ({
  quotations,
  customers,
  suppliers,
  products,
  business,
  ownerUid,
  onSaveQuotation,
  onDeleteQuotation,
  onConvertToSale,
  onConvertToPurchase,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'CUSTOMER' | 'VENDOR'>('CUSTOMER');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quotationType, setQuotationType] = useState<'CUSTOMER' | 'VENDOR'>('CUSTOMER');
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);
  const [viewingQuote, setViewingQuote] = useState<Quotation | null>(null);

  // Form states
  const [partyName, setPartyName] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [partyId, setPartyId] = useState('');
  const [quotationNumber, setQuotationNumber] = useState('');
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [isInterstate, setIsInterstate] = useState(false);
  const [notes, setNotes] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Filtered quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const matchesTab = q.type === activeTab;
      const matchesSearch =
        q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.notes && q.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
      return matchesTab && matchesSearch && matchesStatus;
    });
  }, [quotations, activeTab, searchQuery, statusFilter]);

  // Calculated totals
  const calculatedTotals = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let taxableTotal = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      const rate = Number(item.rate) || 0;
      const disc = Number(item.discount) || 0;
      const lineTaxable = round2(qty * rate - disc);
      const gst = Number(item.gstRate) || 0;

      subtotal += round2(qty * rate);
      totalDiscount += disc;
      taxableTotal += lineTaxable;

      if (isInterstate) {
        const igst = round2(lineTaxable * (gst / 100));
        totalIGST += igst;
      } else {
        const cgst = round2(lineTaxable * (gst / 200));
        const sgst = round2(lineTaxable * (gst / 200));
        totalCGST += cgst;
        totalSGST += sgst;
      }
    }

    const totalTax = round2(totalCGST + totalSGST + totalIGST);
    const grandTotal = round2(taxableTotal + totalTax);

    return {
      subtotal: round2(subtotal),
      totalDiscount: round2(totalDiscount),
      taxableTotal: round2(taxableTotal),
      totalCGST: round2(totalCGST),
      totalSGST: round2(totalSGST),
      totalIGST: round2(totalIGST),
      totalTax,
      grandTotal,
    };
  }, [items, isInterstate]);

  const openNewModal = (type: 'CUSTOMER' | 'VENDOR') => {
    setQuotationType(type);
    setEditingQuote(null);
    setPartyName('');
    setPartyPhone('');
    setPartyId('');
    setQuotationNumber(`QT-${Date.now().toString().slice(-6)}`);
    setQuotationDate(new Date().toISOString().split('T')[0]);
    setExpiryDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setItems([
      {
        productName: '',
        quantity: 1,
        unit: 'PCS',
        rate: 0,
        discount: 0,
        taxableAmount: 0,
        gstRate: 18,
        cgst: 0,
        sgst: 0,
        igst: 0,
        lineTotal: 0,
      },
    ]);
    setIsInterstate(false);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        productName: '',
        quantity: 1,
        unit: 'PCS',
        rate: 0,
        discount: 0,
        taxableAmount: 0,
        gstRate: 18,
        cgst: 0,
        sgst: 0,
        igst: 0,
        lineTotal: 0,
      },
    ]);
  };

  const handleUpdateItem = (index: number, field: keyof QuotationItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectProduct = (index: number, productName: string) => {
    const prod = products.find((p) => p.name.toLowerCase() === productName.toLowerCase());
    if (prod) {
      setItems((prev) => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          productId: prod.id,
          productName: prod.name,
          hsn: prod.hsn || '',
          unit: prod.unit || 'PCS',
          rate: quotationType === 'CUSTOMER' ? prod.sellingPrice : prod.purchasePrice,
          gstRate: prod.gstRate,
        };
        return copy;
      });
    } else {
      handleUpdateItem(index, 'productName', productName);
    }
  };

  const handleSelectCustomer = (custId: string) => {
    setPartyId(custId);
    const cust = customers.find((c) => c.id === custId);
    if (cust) {
      setPartyName(cust.name);
      setPartyPhone(cust.phone || '');
    }
  };

  const handleSelectSupplier = (supId: string) => {
    setPartyId(supId);
    const sup = suppliers.find((s) => s.id === supId);
    if (sup) {
      setPartyName(sup.name);
      setPartyPhone(sup.phone || '');
    }
  };

  // Scan Vendor Quotation with AI
  const handleScanVendorQuoteImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const compressed = await compressImage(file, 1600, 0.85);
      const extracted = await extractBillWithAI(compressed.base64, compressed.mimeType);
      if (extracted) {
        if (extracted.supplierName) {
          let cleanName = extracted.supplierName
            .replace(/^[#*•\-_¢§£$%@!~`+=\\|\[\]{};:"'<>?\/0-9\s]+/, '')
            .trim();
          cleanName = cleanName.replace(/^[a-z0-9]{1,3}\s+(?=[A-Z])/i, '').trim();
          cleanName = cleanName.replace(/["'”]+$/, '').trim();
          setPartyName(cleanName || extracted.supplierName);
        }
        if (extracted.supplierPhone) setPartyPhone(extracted.supplierPhone);
        if (extracted.invoiceNumber) setQuotationNumber(extracted.invoiceNumber);
        if (extracted.invoiceDate) setQuotationDate(extracted.invoiceDate);
        setIsInterstate(Boolean(extracted.isInterstate));

        if (Array.isArray(extracted.items) && extracted.items.length > 0) {
          const mappedItems: QuotationItem[] = extracted.items.map((it: any, idx: number) => {
            const raw = (it.itemName || '').trim();
            const cleanItemName = raw.replace(/^#?\d+[\s.)-]+/, '').trim() || `Item #${idx + 1}`;
            const qty = Number(it.quantity) > 0 ? Number(it.quantity) : 1;
            const rate = Number(it.purchaseRate) || Number(it.rate) || 0;
            const disc = Number(it.discount) || 0;
            const gst = it.gstRate !== undefined && it.gstRate !== null ? Number(it.gstRate) : 18;
            const taxable = Number(it.taxableAmount) || round2(qty * rate - disc);
            const total = Number(it.lineTotal) || round2(taxable + (taxable * gst) / 100);

            return {
              productName: cleanItemName,
              hsn: it.hsn || undefined,
              quantity: qty,
              unit: it.unit || 'PCS',
              rate,
              discount: disc,
              taxableAmount: taxable,
              gstRate: gst,
              cgst: it.cgst || 0,
              sgst: it.sgst || 0,
              igst: it.igst || 0,
              lineTotal: total,
            };
          });
          setItems(mappedItems);
          onShowToast(`${mappedItems.length} items extracted into quotation!`, 'success');
        } else {
          onShowToast('Vendor quotation details scanned with AI!', 'success');
        }
      }
    } catch (err) {
      console.error('Scan error:', err);
      onShowToast('Failed to scan quotation image', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) {
      onShowToast('Please enter party/customer/vendor name', 'error');
      return;
    }
    if (items.length === 0 || items.some((i) => !i.productName.trim())) {
      onShowToast('Please add at least one valid item', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const finalItems: QuotationItem[] = items.map((item) => {
        const qty = Number(item.quantity) || 1;
        const rate = Number(item.rate) || 0;
        const disc = Number(item.discount) || 0;
        const taxable = round2(qty * rate - disc);
        const gst = Number(item.gstRate) || 0;
        const cgst = isInterstate ? 0 : round2(taxable * (gst / 200));
        const sgst = isInterstate ? 0 : round2(taxable * (gst / 200));
        const igst = isInterstate ? round2(taxable * (gst / 100)) : 0;
        const lineTotal = round2(taxable + cgst + sgst + igst);

        return {
          ...item,
          taxableAmount: taxable,
          cgst,
          sgst,
          igst,
          lineTotal,
        };
      });

      const newQuotation: Quotation = {
        id: editingQuote?.id || `qt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        businessId: business?.id || 'default_business',
        ownerUid,
        type: quotationType,
        partyId: partyId || undefined,
        partyName: partyName.trim(),
        partyPhone: partyPhone.trim() || undefined,
        quotationNumber: quotationNumber.trim() || `QT-${Date.now().toString().slice(-6)}`,
        quotationDate,
        expiryDate: expiryDate || undefined,
        items: finalItems,
        subtotal: calculatedTotals.subtotal,
        totalDiscount: calculatedTotals.totalDiscount,
        taxableTotal: calculatedTotals.taxableTotal,
        isInterstate,
        totalCGST: calculatedTotals.totalCGST,
        totalSGST: calculatedTotals.totalSGST,
        totalIGST: calculatedTotals.totalIGST,
        totalTax: calculatedTotals.totalTax,
        grandTotal: calculatedTotals.grandTotal,
        status: editingQuote ? editingQuote.status : 'PENDING',
        notes: notes.trim() || undefined,
        createdAt: editingQuote?.createdAt || now,
        updatedAt: now,
      };

      await onSaveQuotation(newQuotation);
      onShowToast(quotationType === 'CUSTOMER' ? 'Customer quotation saved successfully!' : 'Vendor quotation saved successfully!', 'success');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Save quotation error:', err);
      onShowToast('Failed to save quotation', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (quote: Quotation, newStatus: Quotation['status']) => {
    try {
      const updated: Quotation = {
        ...quote,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
      await onSaveQuotation(updated);
      onShowToast(`Quotation marked as ${newStatus}`, 'success');
    } catch (err) {
      onShowToast('Failed to update status', 'error');
    }
  };

  const handlePrintDocument = (quote: Quotation) => {
    setViewingQuote(quote);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handleShareWhatsApp = (quote: Quotation) => {
    const phone = quote.partyPhone ? quote.partyPhone.replace(/\D/g, '') : '';
    const text = encodeURIComponent(
      `Hello ${quote.partyName},\nHere is your quotation *#${quote.quotationNumber}* dated ${quote.quotationDate}.\nGrand Total: *₹${quote.grandTotal.toFixed(2)}*\nValid till: ${quote.expiryDate || 'N/A'}\nThank you for your business!`
    );
    const url = phone ? `https://wa.me/91${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 pb-24 space-y-5 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-blue-100 font-semibold text-xs mb-2">
            <FileText className="w-3.5 h-3.5" />
            <span>Estimates & Quotes</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Quotations Hub</h2>
          <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-xl">
            Scan and manage Vendor Quotations (incoming quotes) and create professional Customer Quotations (outgoing estimates).
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => openNewModal('VENDOR')}
            className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl backdrop-blur-md transition-all flex items-center gap-1.5 border border-white/25 shadow-xs"
          >
            <Camera className="w-4 h-4 text-white" />
            <span>Scan Vendor Quote</span>
          </button>
          <button
            type="button"
            onClick={() => openNewModal('CUSTOMER')}
            className="px-4 py-2.5 bg-white text-blue-950 hover:bg-blue-50 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Create Customer Quote</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher & Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('CUSTOMER')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'CUSTOMER'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customer Quotations ({quotations.filter((q) => q.type === 'CUSTOMER').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('VENDOR')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'VENDOR'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Vendor Quotations ({quotations.filter((q) => q.type === 'VENDOR').length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search quotes by number or party..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="SENT">Sent</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="CONVERTED">Converted</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Quotation List */}
      {filteredQuotations.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4 text-2xl">
            📋
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">
            No {activeTab === 'CUSTOMER' ? 'Customer' : 'Vendor'} Quotations Found
          </h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto mb-5">
            {activeTab === 'CUSTOMER'
              ? 'Create professional estimates and price quotes for your customers and share them via WhatsApp or PDF.'
              : 'Scan vendor quotation images with AI or record supplier price quotes to compare rates easily.'}
          </p>
          <button
            type="button"
            onClick={() => openNewModal(activeTab)}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create {activeTab === 'CUSTOMER' ? 'Customer' : 'Vendor'} Quotation</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuotations.map((quote) => {
            const statusColors = {
              PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
              SENT: 'bg-blue-100 text-blue-800 border-blue-200',
              ACCEPTED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
              CONVERTED: 'bg-purple-100 text-purple-800 border-purple-200',
              REJECTED: 'bg-rose-100 text-rose-800 border-rose-200',
            };

            return (
              <div
                key={quote.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-slate-900">#{quote.quotationNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[quote.status]}`}>
                        {quote.status}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-500">{quote.quotationDate}</span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    {quote.type === 'CUSTOMER' ? <Users className="w-4 h-4 text-blue-600" /> : <Building2 className="w-4 h-4 text-purple-600" />}
                    <h4 className="text-sm font-bold text-slate-900">{quote.partyName}</h4>
                    {quote.partyPhone && <span className="text-xs text-slate-400">({quote.partyPhone})</span>}
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1 mb-3">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Items Count:</span>
                      <span className="font-semibold">{quote.items.length} items</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Taxable Amount:</span>
                      <span className="font-semibold">₹{quote.taxableTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Total Tax (GST):</span>
                      <span className="font-semibold">₹{quote.totalTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                      <span>Grand Total:</span>
                      <span className="text-blue-700">₹{quote.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePrintDocument(quote)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Print / PDF"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Print</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(quote)}
                      className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Share WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">WhatsApp</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {quote.type === 'CUSTOMER' && quote.status !== 'CONVERTED' && onConvertToSale && (
                      <button
                        type="button"
                        onClick={() => onConvertToSale(quote)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                      >
                        <span>Convert to Sale</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {quote.type === 'VENDOR' && quote.status !== 'CONVERTED' && onConvertToPurchase && (
                      <button
                        type="button"
                        onClick={() => onConvertToPurchase(quote)}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                      >
                        <span>Convert to Bill</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onDeleteQuotation(quote.id)}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Quotation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Quotation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col justify-start p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full mx-auto overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[92vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold">
                  {quotationType === 'CUSTOMER' ? 'Create Customer Quotation' : 'New Vendor Quotation / Scan'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuotation} className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Vendor Quote AI Scanner Banner */}
              {quotationType === 'VENDOR' && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-purple-900">Scan Vendor Quote Image</h4>
                      <p className="text-[11px] text-purple-700">Upload a photo of vendor quotation to auto-fill items and prices instantly.</p>
                    </div>
                  </div>
                  <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all flex items-center gap-1.5 shrink-0">
                    <Camera className="w-3.5 h-3.5 text-white" />
                    <span>{isScanning ? 'Scanning...' : 'Upload & Scan'}</span>
                    <input type="file" accept="image/*" onChange={handleScanVendorQuoteImage} className="hidden" disabled={isScanning} />
                  </label>
                </div>
              )}

              {/* Party & Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {quotationType === 'CUSTOMER' ? 'Customer Name *' : 'Vendor / Supplier Name *'}
                  </label>
                  {quotationType === 'CUSTOMER' ? (
                    <select
                      value={partyId}
                      onChange={(e) => handleSelectCustomer(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none"
                    >
                      <option value="">-- Select Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={partyId}
                      onChange={(e) => handleSelectSupplier(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none"
                    >
                      <option value="">-- Select Vendor --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.phone ? `(${s.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    placeholder="Or type name manually..."
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    className="w-full mt-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quotation Number</label>
                  <input
                    type="text"
                    value={quotationNumber}
                    onChange={(e) => setQuotationNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold bg-slate-50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quotation Date</label>
                  <input
                    type="date"
                    value={quotationDate}
                    onChange={(e) => setQuotationDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50"
                    required
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Quotation Items</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-2xl p-3 border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Product Name</label>
                        <input
                          type="text"
                          list="products-list"
                          placeholder="Item name"
                          value={item.productName}
                          onChange={(e) => handleSelectProduct(idx, e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                          required
                        />
                        <datalist id="products-list">
                          {products.map((p) => (
                            <option key={p.id} value={p.name} />
                          ))}
                        </datalist>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Quantity</label>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                          required
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Rate (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.rate}
                          onChange={(e) => handleUpdateItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                          required
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">GST %</label>
                        <select
                          value={item.gstRate}
                          onChange={(e) => handleUpdateItem(idx, 'gstRate', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2 flex items-center justify-between">
                        <div className="text-xs font-extrabold text-blue-700">
                          ₹{round2(item.quantity * item.rate).toFixed(2)}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Footer */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInterstate}
                      onChange={(e) => setIsInterstate(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Interstate Supply (IGST instead of CGST+SGST)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Optional notes or payment terms..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full sm:w-80 px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>

                <div className="text-right space-y-1 w-full sm:w-auto">
                  <div className="text-xs text-slate-500">
                    Taxable Total: <strong className="text-slate-800">₹{calculatedTotals.taxableTotal.toFixed(2)}</strong>
                  </div>
                  <div className="text-xs text-slate-500">
                    Total GST: <strong className="text-slate-800">₹{calculatedTotals.totalTax.toFixed(2)}</strong>
                  </div>
                  <div className="text-base font-black text-slate-900">
                    Grand Total: <span className="text-blue-700">₹{calculatedTotals.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quotation Document View / Print Modal */}
      {viewingQuote && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full mx-auto overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[95vh]">
            <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm sm:text-base font-bold">
                  Quotation #{viewingQuote.quotationNumber}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(viewingQuote)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingQuote(null)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 ml-1"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-4 sm:p-8 flex-1 bg-slate-100 flex justify-center">
              <div
                id="printable-quotation"
                className="w-full max-w-[210mm] bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6 text-slate-800"
              >
                {/* Header with Business Logo */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-5 gap-4">
                  <div className="flex items-start gap-3 sm:gap-4">
                    {business?.logoUrl && (
                      <img
                        src={business.logoUrl}
                        alt={business?.name || 'Logo'}
                        className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-xl border border-slate-200 bg-white p-1 shrink-0 shadow-xs"
                      />
                    )}
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {viewingQuote.type === 'CUSTOMER' ? 'PRICE ESTIMATE / QUOTATION' : 'VENDOR QUOTATION RECORD'}
                      </span>
                      <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                        {business?.name || 'SmartBill AI'}
                      </h1>
                      <p className="text-xs text-slate-500 mt-0.5 max-w-sm">
                        {business?.address || 'Address not provided'}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                        <span>Phone: {business?.phone || 'N/A'}</span>
                        <span>•</span>
                        <span>GSTIN: <span className="font-mono font-semibold">{business?.gstin || 'Unregistered'}</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-right shrink-0 min-w-[170px]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Quote Number</span>
                    <p className="text-sm font-black text-slate-900 font-mono mt-0.5">{viewingQuote.quotationNumber}</p>
                    <div className="mt-1.5 text-xs text-slate-600">
                      <span>Date: </span>
                      <span className="font-semibold">{viewingQuote.quotationDate}</span>
                    </div>
                    {viewingQuote.expiryDate && (
                      <div className="text-[11px] text-slate-500">
                        <span>Valid Till: </span>
                        <span>{viewingQuote.expiryDate}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Party Details */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {viewingQuote.type === 'CUSTOMER' ? 'ESTIMATE FOR (CUSTOMER)' : 'VENDOR / SUPPLIER'}
                  </span>
                  <p className="text-sm font-bold text-slate-900 mt-1">{viewingQuote.partyName}</p>
                  {viewingQuote.partyPhone && (
                    <p className="text-xs text-slate-600 mt-0.5">Phone: {viewingQuote.partyPhone}</p>
                  )}
                  {viewingQuote.partyAddress && (
                    <p className="text-xs text-slate-500 mt-0.5">{viewingQuote.partyAddress}</p>
                  )}
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px]">
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Item Description</th>
                        <th className="p-2.5">HSN</th>
                        <th className="p-2.5 text-right">Qty</th>
                        <th className="p-2.5 text-right">Rate (₹)</th>
                        <th className="p-2.5 text-right">GST %</th>
                        <th className="p-2.5 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {viewingQuote.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-slate-900">{it.productName}</td>
                          <td className="p-2.5 font-mono text-slate-500">{it.hsn || '-'}</td>
                          <td className="p-2.5 text-right font-medium">{it.quantity} {it.unit}</td>
                          <td className="p-2.5 text-right font-medium">₹{it.rate.toFixed(2)}</td>
                          <td className="p-2.5 text-right text-slate-600">{it.gstRate}%</td>
                          <td className="p-2.5 text-right font-bold text-slate-900">₹{it.lineTotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary */}
                <div className="flex justify-end pt-2">
                  <div className="w-72 space-y-1.5 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between text-slate-600">
                      <span>Taxable Amount:</span>
                      <span className="font-semibold">₹{viewingQuote.taxableTotal.toFixed(2)}</span>
                    </div>
                    {viewingQuote.totalCGST > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>CGST:</span>
                        <span className="font-semibold">₹{viewingQuote.totalCGST.toFixed(2)}</span>
                      </div>
                    )}
                    {viewingQuote.totalSGST > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>SGST:</span>
                        <span className="font-semibold">₹{viewingQuote.totalSGST.toFixed(2)}</span>
                      </div>
                    )}
                    {viewingQuote.totalIGST > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>IGST:</span>
                        <span className="font-semibold">₹{viewingQuote.totalIGST.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-300">
                      <span>Grand Total:</span>
                      <span className="text-blue-700">₹{viewingQuote.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {viewingQuote.notes && (
                  <div className="text-xs text-slate-500 border-t pt-3">
                    <strong>Terms & Notes: </strong>{viewingQuote.notes}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
