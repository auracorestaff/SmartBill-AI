import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  ReceiptText,
  Building2,
  Calendar,
  Save,
  RotateCcw,
  Tag,
  HelpCircle,
} from 'lucide-react';
import {
  ExtractedBillData,
  Product,
  Supplier,
  Purchase,
  PurchaseItem,
  Business,
} from '../../types';
import {
  calculateLineItem,
  calculateInvoiceTotals,
  formatCurrency,
  formatDateToIndian,
  round2,
} from '../../utils/calculations';

interface BillVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  extractedData: ExtractedBillData | null;
  originalBillImageUrl: string | null;
  existingSuppliers: Supplier[];
  existingProducts: Product[];
  business: Business | null;
  ownerUid: string;
  onSavePurchase: (
    purchase: Purchase,
    newProductsToCreate: Product[],
    newSupplierToCreate?: Supplier
  ) => Promise<void>;
  onRetake: () => void;
}

export const BillVerificationModal: React.FC<BillVerificationModalProps> = ({
  isOpen,
  onClose,
  extractedData,
  originalBillImageUrl,
  existingSuppliers,
  existingProducts,
  business,
  ownerUid,
  onSavePurchase,
  onRetake,
}) => {
  // Header verification state
  const [supplierName, setSupplierName] = useState(extractedData?.supplierName || '');
  const [supplierGSTIN, setSupplierGSTIN] = useState(extractedData?.supplierGSTIN || '');
  const [supplierPhone, setSupplierPhone] = useState(extractedData?.supplierPhone || '');
  const [supplierAddress, setSupplierAddress] = useState(extractedData?.supplierAddress || '');
  const [invoiceNumber, setInvoiceNumber] = useState(extractedData?.invoiceNumber || '');
  const [invoiceDate, setInvoiceDate] = useState(formatDateToIndian(extractedData?.invoiceDate));
  const [dueDate, setDueDate] = useState(extractedData?.dueDate || '');
  const [isInterstate, setIsInterstate] = useState(Boolean(extractedData?.isInterstate));
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PARTIAL' | 'UNPAID'>('PAID');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  // Items state
  const [items, setItems] = useState<PurchaseItem[]>([]);

  // Original Bill Image Zoom Modal / State
  const [imageZoomed, setImageZoomed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize and match items on open
  useEffect(() => {
    if (!extractedData) return;

    setSupplierName(extractedData.supplierName || '');
    setSupplierGSTIN(extractedData.supplierGSTIN || '');
    setSupplierPhone(extractedData.supplierPhone || '');
    setSupplierAddress(extractedData.supplierAddress || '');
    setInvoiceNumber(extractedData.invoiceNumber || '');
    setInvoiceDate(formatDateToIndian(extractedData.invoiceDate));
    setIsInterstate(Boolean(extractedData.isInterstate));

    const mappedItems: PurchaseItem[] = (extractedData.items || []).map((extItem) => {
      // Product Auto-Matching by name, sku, hsn, code
      const cleanName = (extItem.itemName || '').trim().toLowerCase();
      const cleanHsn = (extItem.hsn || '').trim();
      const matchedProd = existingProducts.find((p) => {
        const pName = p.name.toLowerCase();
        return (
          pName === cleanName ||
          (cleanName.length > 4 && pName.includes(cleanName)) ||
          (p.sku && extItem.productCode && p.sku.toLowerCase() === extItem.productCode.toLowerCase()) ||
          (cleanHsn && p.hsn === cleanHsn && pName.includes(cleanName.slice(0, 4)))
        );
      });

      const qty = extItem.quantity > 0 ? extItem.quantity : 1;
      const rate = extItem.purchaseRate > 0 ? extItem.purchaseRate : 0;
      const gst = extItem.gstRate !== null && extItem.gstRate !== undefined ? extItem.gstRate : 18;
      const disc = extItem.discount || 0;

      const calc = calculateLineItem({
        quantity: qty,
        rate,
        discount: disc,
        gstRate: gst,
        isInterstate: Boolean(extractedData.isInterstate),
      });

      return {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: matchedProd?.id,
        productName: matchedProd?.name || extItem.itemName || 'Item',
        productCode: extItem.productCode || undefined,
        hsn: extItem.hsn || matchedProd?.hsn || undefined,
        quantity: qty,
        unit: extItem.unit || matchedProd?.unit || 'PCS',
        purchaseRate: rate,
        discount: disc,
        taxableAmount: calc.taxableAmount,
        gstRate: gst,
        cgst: calc.cgst,
        sgst: calc.sgst,
        igst: calc.igst,
        lineTotal: calc.lineTotal,
        isNewProduct: !matchedProd,
        needsVerification: extItem.confidence === 'uncertain' || rate === 0,
      };
    });

    if (mappedItems.length === 0) {
      // Add a blank row if none extracted
      const calc = calculateLineItem({ quantity: 1, rate: 0, gstRate: 18 });
      mappedItems.push({
        id: `item_${Date.now()}`,
        productName: '',
        quantity: 1,
        unit: 'PCS',
        purchaseRate: 0,
        discount: 0,
        taxableAmount: 0,
        gstRate: 18,
        cgst: 0,
        sgst: 0,
        igst: 0,
        lineTotal: 0,
        isNewProduct: true,
        needsVerification: true,
      });
    }

    setItems(mappedItems);
  }, [extractedData, existingProducts]);

  // Supplier Auto-Matching
  const matchedSupplier = useMemo(() => {
    const sName = supplierName.trim().toLowerCase();
    const sGst = supplierGSTIN.trim().toUpperCase();
    const sPhone = supplierPhone.trim().replace(/[^0-9]/g, '');

    return existingSuppliers.find((s) => {
      if (sGst && s.gstin && s.gstin.toUpperCase() === sGst) return true;
      if (sPhone && s.phone && s.phone.replace(/[^0-9]/g, '') === sPhone) return true;
      if (sName && s.name.toLowerCase() === sName) return true;
      return false;
    });
  }, [supplierName, supplierGSTIN, supplierPhone, existingSuppliers]);

  // Deterministic Code Calculations for Summary
  const calculatedTotals = useMemo(() => {
    return calculateInvoiceTotals(
      items.map((i) => ({
        quantity: i.quantity,
        rate: i.purchaseRate,
        discount: i.discount,
        gstRate: i.gstRate,
      })),
      isInterstate,
      true
    );
  }, [items, isInterstate]);

  // Set default paidAmount matching grandTotal initially
  useEffect(() => {
    if (paymentStatus === 'PAID') {
      setPaidAmount(calculatedTotals.grandTotal);
    } else if (paymentStatus === 'UNPAID') {
      setPaidAmount(0);
    }
  }, [calculatedTotals.grandTotal, paymentStatus]);

  // Total Mismatch Validation
  const aiExtractedGrandTotal = extractedData?.summary?.grandTotal;
  const hasTotalMismatch =
    aiExtractedGrandTotal !== null &&
    aiExtractedGrandTotal !== undefined &&
    Math.abs(calculatedTotals.grandTotal - Number(aiExtractedGrandTotal)) > 1.5;

  const totalDifference = aiExtractedGrandTotal
    ? round2(calculatedTotals.grandTotal - Number(aiExtractedGrandTotal))
    : 0;

  const shortfall = aiExtractedGrandTotal
    ? round2(Number(aiExtractedGrandTotal) - calculatedTotals.grandTotal)
    : 0;

  const handleAutoReconcile = () => {
    if (shortfall <= 0.5) return;
    const newItems = [...items];
    const calc = calculateLineItem({
      quantity: 1,
      rate: shortfall,
      discount: 0,
      gstRate: 0,
      isInterstate,
    });
    newItems.push({
      id: `item_${Date.now()}`,
      productName: 'Additional Bill Items (See Photo)',
      quantity: 1,
      unit: 'PCS',
      purchaseRate: shortfall,
      discount: 0,
      taxableAmount: calc.taxableAmount,
      gstRate: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      lineTotal: calc.lineTotal,
      isNewProduct: true,
      needsVerification: false,
    });
    setItems(newItems);
  };

  // Handlers for Items
  const handleUpdateItem = (index: number, updates: Partial<PurchaseItem>) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], ...updates };

      // Recalculate line totals deterministically
      const calc = calculateLineItem({
        quantity: item.quantity,
        rate: item.purchaseRate,
        discount: item.discount,
        gstRate: item.gstRate,
        isInterstate,
      });

      item.taxableAmount = calc.taxableAmount;
      item.cgst = calc.cgst;
      item.sgst = calc.sgst;
      item.igst = calc.igst;
      item.lineTotal = calc.lineTotal;

      next[index] = item;
      return next;
    });
  };

  const handleAddItem = () => {
    const calc = calculateLineItem({ quantity: 1, rate: 0, gstRate: 18, isInterstate });
    setItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}`,
        productName: '',
        quantity: 1,
        unit: 'PCS',
        purchaseRate: 0,
        discount: 0,
        taxableAmount: 0,
        gstRate: 18,
        cgst: calc.cgst,
        sgst: calc.sgst,
        igst: calc.igst,
        lineTotal: calc.lineTotal,
        isNewProduct: true,
        needsVerification: false,
      },
    ]);
  };

  const handleDeleteItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Validation before save
  const handleSave = async () => {
    if (!supplierName.trim()) {
      alert('Please enter or verify the Supplier Name.');
      return;
    }

    if (items.some((i) => !i.productName.trim())) {
      alert('Please ensure all items have a product name.');
      return;
    }

    setIsSaving(true);

    try {
      const businessId = business?.id || `biz_${ownerUid}`;
      const purchaseId = `pur_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // 1. Prepare new supplier if not matched
      let newSupplier: Supplier | undefined;
      let targetSupplierId = matchedSupplier?.id;

      if (!matchedSupplier) {
        newSupplier = {
          id: `sup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          businessId,
          ownerUid,
          name: supplierName.trim(),
          phone: supplierPhone.trim(),
          address: supplierAddress.trim(),
          gstin: supplierGSTIN.trim().toUpperCase(),
          openingBalance: 0,
          currentBalance: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        targetSupplierId = newSupplier.id;
      }

      // 2. Prepare new products to create
      const newProductsToCreate: Product[] = [];
      const finalItems: PurchaseItem[] = [];

      for (const item of items) {
        let finalProdId = item.productId;

        if (!finalProdId) {
          // Check if exists in existingProducts
          const existing = existingProducts.find(
            (p) => p.name.toLowerCase() === item.productName.trim().toLowerCase()
          );

          if (existing) {
            finalProdId = existing.id;
          } else {
            // Create new product
            const newProdId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const newProd: Product = {
              id: newProdId,
              businessId,
              ownerUid,
              name: item.productName.trim(),
              ...(item.productCode ? { sku: item.productCode } : {}),
              ...(item.hsn ? { hsn: item.hsn } : {}),
              unit: item.unit || 'PCS',
              purchasePrice: item.purchaseRate,
              sellingPrice: round2(item.purchaseRate * 1.25), // reasonable 25% default markup
              gstRate: item.gstRate,
              openingStock: 0,
              currentStock: 0, // will be incremented by purchase transaction
              minimumStock: 5,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            newProductsToCreate.push(newProd);
            finalProdId = newProdId;
          }
        }

        finalItems.push({
          ...item,
          productId: finalProdId,
        });
      }

      // 3. Prepare Purchase object
      const actualPaid = paymentStatus === 'PAID' ? calculatedTotals.grandTotal : Math.min(paidAmount, calculatedTotals.grandTotal);
      const balanceDue = round2(Math.max(0, calculatedTotals.grandTotal - actualPaid));

      const purchaseRecord: Purchase = {
        id: purchaseId,
        businessId,
        ownerUid,
        supplierId: targetSupplierId,
        supplierName: supplierName.trim(),
        supplierGSTIN: supplierGSTIN.trim().toUpperCase(),
        supplierPhone: supplierPhone.trim(),
        invoiceNumber: invoiceNumber.trim() || `PB-${Date.now().toString().slice(-6)}`,
        invoiceDate,
        dueDate,
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
        paidAmount: actualPaid,
        balanceDue,
        paymentStatus,
        paymentMethod,
        originalBillImageUrl: originalBillImageUrl || undefined,
        needsVerification: hasTotalMismatch,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSavePurchase(purchaseRecord, newProductsToCreate, newSupplier);
      onClose();
    } catch (err) {
      console.error('Save Purchase Error:', err);
      setSaveError('Failed to save purchase bill. Please check your data and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col justify-start p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full mx-auto overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold">
              <ReceiptText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Verify Purchase Bill Details</span>
                <span className="text-[10px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/30 font-semibold">
                  Scanned Bill
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Review and adjust values before updating inventory & ledgers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRetake}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Save Error Banner */}
        {saveError && (
          <div className="bg-rose-600 text-white px-4 py-2.5 flex items-center justify-between text-xs font-semibold shrink-0">
            <span>{saveError}</span>
            <button
              type="button"
              onClick={() => setSaveError(null)}
              className="text-white/80 hover:text-white underline ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Mismatch Warning Banner */}
        {hasTotalMismatch && (
          <div className="bg-amber-500 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-white" />
              <span>
                ⚠ BILL TOTAL DOES NOT MATCH: Extracted Bill Total is{' '}
                <span className="font-extrabold underline">₹{aiExtractedGrandTotal}</span>, but independent code calculation is{' '}
                <span className="font-extrabold underline">₹{calculatedTotals.grandTotal}</span> (Diff: ₹{Math.abs(totalDifference)}). Please review item rates and quantities below.
              </span>
            </div>
            {shortfall > 0.5 && (
              <button
                type="button"
                onClick={handleAutoReconcile}
                className="bg-white text-amber-900 hover:bg-amber-50 px-3 py-1 rounded-lg text-xs font-bold shadow-xs transition-transform active:scale-95 shrink-0"
              >
                + Auto-Reconcile Balance (₹{shortfall})
              </button>
            )}
          </div>
        )}

        {/* Main Content Area */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1">
          {/* Top Section: Original Bill Image Accordion + Supplier & Invoice Meta */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Original Bill Image Preview Thumbnail */}
            {originalBillImageUrl && (
              <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Original Bill Photo
                  </span>
                  <button
                    type="button"
                    onClick={() => setImageZoomed(!imageZoomed)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {imageZoomed ? <ZoomOut className="w-3 h-3" /> : <ZoomIn className="w-3 h-3" />}
                    <span>{imageZoomed ? 'Shrink' : 'Zoom Bill'}</span>
                  </button>
                </div>

                <div
                  className={`relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200 cursor-pointer transition-all ${
                    imageZoomed ? 'h-96' : 'h-48'
                  }`}
                  onClick={() => setImageZoomed(!imageZoomed)}
                >
                  <img
                    src={originalBillImageUrl}
                    alt="Original Purchase Bill"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                    <ZoomIn className="w-3 h-3" /> Tap to toggle size
                  </div>
                </div>
              </div>
            )}

            {/* Right: Supplier & Bill Metadata */}
            <div className={originalBillImageUrl ? 'lg:col-span-8 space-y-4' : 'lg:col-span-12 space-y-4'}>
              {/* Supplier Matching Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Supplier Information</span>
                  </span>

                  {matchedSupplier ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Existing Supplier: {matchedSupplier.name}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <AlertTriangle className="w-3 h-3" />
                      <span>NEW SUPPLIER DETECTED</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Supplier Name *
                    </label>
                    <input
                      type="text"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="e.g. Acme Wholesale Pvt Ltd"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Supplier GSTIN
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={supplierGSTIN}
                      onChange={(e) => setSupplierGSTIN(e.target.value.toUpperCase())}
                      placeholder="27ABCDE1234F1Z5"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono uppercase bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Supplier Phone
                    </label>
                    <input
                      type="tel"
                      value={supplierPhone}
                      onChange={(e) => setSupplierPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Supplier Address
                    </label>
                    <input
                      type="text"
                      value={supplierAddress}
                      onChange={(e) => setSupplierAddress(e.target.value)}
                      placeholder="City, State"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Invoice Number & Dates */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Invoice / Bill # *
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-1049"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Invoice Date *
                  </label>
                  <input
                    type="text"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="text"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    GST Tax Type
                  </label>
                  <select
                    value={isInterstate ? 'interstate' : 'intrastate'}
                    onChange={(e) => setIsInterstate(e.target.value === 'interstate')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="intrastate">CGST + SGST (Intra)</option>
                    <option value="interstate">IGST (Inter-State)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Extracted Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Extracted Items ({items.length})
                </span>
                <span className="text-[11px] text-slate-400">
                  Editable • Stock updates upon saving
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-bold text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Mobile Cards / Desktop Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-100/80 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                    <th className="py-2.5 px-3 w-10">#</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Product / Item Name</th>
                    <th className="py-2.5 px-3 w-24">Qty</th>
                    <th className="py-2.5 px-3 w-20">Unit</th>
                    <th className="py-2.5 px-3 w-28">Rate (₹)</th>
                    <th className="py-2.5 px-3 w-24">Disc (₹)</th>
                    <th className="py-2.5 px-3 w-24">GST %</th>
                    <th className="py-2.5 px-3 w-28 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {items.map((item, index) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        item.needsVerification ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-400">
                        {index + 1}
                      </td>

                      {/* Product Name */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={item.productName}
                            onChange={(e) =>
                              handleUpdateItem(index, { productName: e.target.value })
                            }
                            placeholder="Product name"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                          />
                          <div className="flex items-center gap-1 text-[10px]">
                            {item.productId ? (
                              <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                                ✓ Matched Existing Stock
                              </span>
                            ) : (
                              <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.2 rounded">
                                + New Product Auto-Add
                              </span>
                            )}
                            {item.needsVerification && (
                              <span className="text-amber-700 font-bold bg-amber-100 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" /> Needs Verification
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          value={item.quantity || ''}
                          onChange={(e) =>
                            handleUpdateItem(index, { quantity: Number(e.target.value) })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs text-center font-bold focus:ring-1 focus:ring-blue-600 focus:outline-none"
                        />
                      </td>

                      {/* Unit */}
                      <td className="py-2.5 px-3">
                        <select
                          value={item.unit || 'PCS'}
                          onChange={(e) => handleUpdateItem(index, { unit: e.target.value })}
                          className="w-full px-1.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none"
                        >
                          <option value="PCS">PCS</option>
                          <option value="KG">KG</option>
                          <option value="GM">GM</option>
                          <option value="LTR">LTR</option>
                          <option value="ML">ML</option>
                          <option value="BOX">BOX</option>
                          <option value="PKT">PKT</option>
                          <option value="BAG">BAG</option>
                          <option value="MTR">MTR</option>
                        </select>
                      </td>

                      {/* Purchase Rate */}
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.purchaseRate || ''}
                          onChange={(e) =>
                            handleUpdateItem(index, { purchaseRate: Number(e.target.value) })
                          }
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs text-right font-mono font-semibold focus:ring-1 focus:ring-blue-600 focus:outline-none"
                        />
                      </td>

                      {/* Discount */}
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.discount || ''}
                          onChange={(e) =>
                            handleUpdateItem(index, { discount: Number(e.target.value) })
                          }
                          placeholder="0"
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs text-right font-mono focus:outline-none"
                        />
                      </td>

                      {/* GST Rate */}
                      <td className="py-2.5 px-3">
                        <select
                          value={item.gstRate}
                          onChange={(e) =>
                            handleUpdateItem(index, { gstRate: Number(e.target.value) })
                          }
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

                      {/* Delete */}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(index)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                          title="Delete Row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Financial Totals & Payment Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {/* Payment Status Config */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Payment & Supplier Balance
              </span>

              <div className="grid grid-cols-3 gap-2">
                {(['PAID', 'PARTIAL', 'UNPAID'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setPaymentStatus(st)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      paymentStatus === st
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
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
                      Paid Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
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
                      <option value="UPI">UPI / GPay / PhonePe</option>
                      <option value="CASH">Cash</option>
                      <option value="BANK">Bank Transfer / NEFT</option>
                      <option value="CARD">Debit / Credit Card</option>
                      <option value="CREDIT">Supplier Credit</option>
                    </select>
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-500 pt-1">
                Balance Due to Supplier:{' '}
                <span className="font-bold text-rose-600">
                  {formatCurrency(
                    Math.max(
                      0,
                      calculatedTotals.grandTotal - (paymentStatus === 'PAID' ? calculatedTotals.grandTotal : paidAmount)
                    )
                  )}
                </span>
              </p>
            </div>

            {/* Calculated Breakdown Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Items Subtotal:</span>
                <span className="font-semibold font-mono">{formatCurrency(calculatedTotals.subtotal)}</span>
              </div>

              {calculatedTotals.totalDiscount > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-600">
                  <span>Total Discount:</span>
                  <span className="font-semibold font-mono">-{formatCurrency(calculatedTotals.totalDiscount)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Taxable Amount:</span>
                <span className="font-semibold font-mono">{formatCurrency(calculatedTotals.taxableTotal)}</span>
              </div>

              {isInterstate ? (
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Total IGST:</span>
                  <span className="font-semibold font-mono">{formatCurrency(calculatedTotals.totalIGST)}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Total CGST:</span>
                    <span className="font-semibold font-mono">{formatCurrency(calculatedTotals.totalCGST)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Total SGST:</span>
                    <span className="font-semibold font-mono">{formatCurrency(calculatedTotals.totalSGST)}</span>
                  </div>
                </>
              )}

              {calculatedTotals.roundOff !== 0 && (
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Round Off:</span>
                  <span className="font-mono">{calculatedTotals.roundOff.toFixed(2)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-300 flex items-center justify-between">
                <span className="text-sm font-extrabold text-slate-900">Grand Total:</span>
                <span className="text-lg font-black text-blue-700 font-mono">
                  {formatCurrency(calculatedTotals.grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onRetake}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Photo</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Updating Stock & Ledgers...' : 'SAVE PURCHASE & UPDATE STOCK'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
