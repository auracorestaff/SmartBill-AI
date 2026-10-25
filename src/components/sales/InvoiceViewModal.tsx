import React, { useState } from 'react';
import {
  X,
  Download,
  Share2,
  Printer,
  CheckCircle2,
  ReceiptText,
  Building2,
  IndianRupee,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import { Sale, Business } from '../../types';
import { formatCurrency, numberToIndianWords } from '../../utils/calculations';
import {
  downloadInvoicePDF,
  printInvoicePDF,
  shareInvoice,
} from '../../services/pdfService';

interface InvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  business: Business | null;
  onRecordPayment?: (sale: Sale) => void;
  onSendReminder?: (sale: Sale) => void;
  onDeleteSale?: (sale: Sale) => Promise<void>;
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  isOpen,
  onClose,
  sale,
  business,
  onRecordPayment,
  onSendReminder,
  onDeleteSale,
}) => {
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  if (!isOpen || !sale) return null;

  const fallbackBusiness: Business = business || {
    id: 'default_biz',
    ownerUid: '',
    name: 'SmartBill AI Store',
    ownerName: 'Proprietor',
    address: 'Commercial Street, Main Market, Mumbai',
    phone: '9876543210',
    email: 'info@smartbill.ai',
    gstin: '27AABCU9603R1ZM',
    state: 'Maharashtra',
    invoicePrefix: 'INV-',
    startingInvoiceNumber: 1,
    currentInvoiceNumber: 1,
    gstEnabled: true,
    defaultGstRate: 18,
    allowNegativeStock: false,
    lowStockThreshold: 5,
    createdAt: '',
    updatedAt: '',
  };

  const handleDownload = () => {
    downloadInvoicePDF(sale, fallbackBusiness);
  };

  const handlePrint = () => {
    printInvoicePDF(sale, fallbackBusiness);
  };

  const handleShare = async () => {
    setShareStatus('Sharing invoice...');
    try {
      const res = await shareInvoice(sale, fallbackBusiness);
      if (res.success) {
        setShareStatus('Shared successfully!');
      } else {
        setShareStatus(null);
      }
    } catch (e) {
      setShareStatus(null);
    }
    setTimeout(() => setShareStatus(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full mx-auto overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-150">
        {/* Top Actions Bar */}
        <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <ReceiptText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Invoice {sale.invoiceNumber}</span>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full font-semibold border border-emerald-400/30">
                  Ready to Share
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Payment Reminder */}
            {sale.balanceDue > 0 && onSendReminder && (
              <button
                type="button"
                onClick={() => onSendReminder(sale)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
                title="Send WhatsApp or SMS Payment Reminder"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">REMINDER</span>
              </button>
            )}

            {/* Receive Payment Button */}
            {sale.balanceDue > 0 && onRecordPayment && (
              <button
                type="button"
                onClick={() => onRecordPayment(sale)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
                title="Record Payment Received"
              >
                <IndianRupee className="w-3.5 h-3.5" />
                <span>RECEIVE PAYMENT</span>
              </button>
            )}

            {/* Download PDF */}
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
              title="Download A4 PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">DOWNLOAD PDF</span>
            </button>

            {/* Share */}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
              title="Share on WhatsApp / Apps"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>SHARE</span>
            </button>

            {/* Delete Invoice */}
            {onDeleteSale && (
              <button
                type="button"
                onClick={async () => {
                  const confirmed = window.confirm(
                    `Are you sure you want to delete Invoice ${sale.invoiceNumber} for ${sale.customerName}?\n\nThis will safely return sold quantities back to stock and adjust customer balance.`
                  );
                  if (!confirmed) return;
                  try {
                    await onDeleteSale(sale);
                    onClose();
                  } catch (e) {
                    console.error('Delete sale error:', e);
                    alert('Failed to delete sale invoice.');
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
                title="Delete Invoice & Restore Stock"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">DELETE</span>
              </button>
            )}

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
              title="Print Invoice"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PRINT</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Share notification toast */}
        {shareStatus && (
          <div className="bg-emerald-600 text-white text-xs px-4 py-1.5 font-semibold text-center flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{shareStatus}</span>
          </div>
        )}

        {/* Printable A4 Invoice Container */}
        <div className="overflow-y-auto p-4 sm:p-8 flex-1 bg-slate-100 flex justify-center">
          <div
            id="printable-invoice"
            className="w-full max-w-[210mm] bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6 text-slate-800"
          >
            {/* Invoice Header Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-5 gap-4">
              <div className="flex items-start gap-3 sm:gap-4">
                {fallbackBusiness.logoUrl && (
                  <img
                    src={fallbackBusiness.logoUrl}
                    alt={fallbackBusiness.name}
                    className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-xl border border-slate-200 bg-white p-1 shrink-0 shadow-xs"
                  />
                )}
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    TAX INVOICE
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                    {fallbackBusiness.name}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-sm">
                    {fallbackBusiness.address || 'Address not provided'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                    <span>Phone: {fallbackBusiness.phone || 'N/A'}</span>
                    <span>•</span>
                    <span>GSTIN: <span className="font-mono font-semibold">{fallbackBusiness.gstin || 'Unregistered'}</span></span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-right shrink-0 min-w-[170px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Invoice Number</span>
                <p className="text-sm font-black text-slate-900 font-mono mt-0.5">{sale.invoiceNumber}</p>
                <div className="mt-1.5 text-xs text-slate-600">
                  <span>Date: </span>
                  <span className="font-semibold">{sale.invoiceDate}</span>
                </div>
                {sale.dueDate && (
                  <div className="text-[11px] text-slate-500">
                    <span>Due: </span>
                    <span>{sale.dueDate}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bill To / Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  BILLED TO (CUSTOMER)
                </span>
                <p className="text-sm font-bold text-slate-900 mt-1">{sale.customerName}</p>
                {sale.customerAddress && (
                  <p className="text-xs text-slate-600 mt-0.5">{sale.customerAddress}</p>
                )}
                <div className="text-xs text-slate-600 mt-1">
                  <span>Phone: {sale.customerPhone || 'N/A'}</span>
                  {sale.customerGSTIN && (
                    <span className="ml-3">GSTIN: <span className="font-mono font-semibold">{sale.customerGSTIN}</span></span>
                  )}
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  PAYMENT SUMMARY
                </span>
                <div className="mt-1">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      sale.paymentStatus === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    STATUS: {sale.paymentStatus}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Payment Mode: <span className="font-semibold">{sale.paymentMethod}</span>
                </p>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3">HSN</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right">Disc (₹)</th>
                    <th className="py-2.5 px-3 text-center">GST %</th>
                    <th className="py-2.5 px-3 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sale.items.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-400 font-semibold">{i + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{item.productName}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{item.hsn || '-'}</td>
                      <td className="py-2.5 px-3 text-center font-medium">{item.quantity} {item.unit}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{item.sellingRate.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {item.discount ? item.discount.toFixed(2) : '0'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">{item.gstRate}%</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Amount in words & Calculations Summary */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-7 space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    AMOUNT IN WORDS
                  </span>
                  <p className="text-xs font-bold text-slate-900 italic mt-0.5">
                    {numberToIndianWords(sale.grandTotal)}
                  </p>
                </div>

                {/* Bank Details */}
                {(fallbackBusiness.bankAccountNumber || fallbackBusiness.upiId) && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      BANK / UPI TRANSFER DETAILS
                    </span>
                    {fallbackBusiness.upiId && <p>UPI ID: <span className="font-mono font-semibold">{fallbackBusiness.upiId}</span></p>}
                    {fallbackBusiness.bankAccountNumber && (
                      <p>
                        A/C: <span className="font-mono font-semibold">{fallbackBusiness.bankAccountNumber}</span> | IFSC: <span className="font-mono font-semibold">{fallbackBusiness.bankIfsc}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="md:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Amount:</span>
                  <span className="font-mono font-semibold">{formatCurrency(sale.taxableTotal)}</span>
                </div>

                {sale.isInterstate ? (
                  <div className="flex justify-between text-slate-600">
                    <span>Total IGST:</span>
                    <span className="font-mono">{formatCurrency(sale.totalIGST)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Total CGST:</span>
                      <span className="font-mono">{formatCurrency(sale.totalCGST)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total SGST:</span>
                      <span className="font-mono">{formatCurrency(sale.totalSGST)}</span>
                    </div>
                  </>
                )}

                {sale.roundOff !== 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Round Off:</span>
                    <span className="font-mono">{sale.roundOff.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-300 flex justify-between font-extrabold text-sm text-slate-900">
                  <span>Grand Total:</span>
                  <span className="font-mono text-emerald-700">{formatCurrency(sale.grandTotal)}</span>
                </div>

                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Paid Amount:</span>
                  <span className="font-mono">{formatCurrency(sale.paidAmount)}</span>
                </div>

                <div className="flex justify-between text-rose-700 font-semibold">
                  <span>Balance Due:</span>
                  <span className="font-mono">{formatCurrency(sale.balanceDue)}</span>
                </div>

                {sale.balanceDue > 0 && onRecordPayment && (
                  <div className="no-print pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => onRecordPayment(sale)}
                      className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <IndianRupee className="w-3.5 h-3.5" />
                      <span>Record Payment Received</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Signatory & Terms Footer */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-[11px] text-slate-500">
              <div className="max-w-md">
                <p className="font-bold text-slate-700">Terms & Conditions:</p>
                <p>{fallbackBusiness.paymentTerms || 'Payment due as per invoice terms.'}</p>
                {fallbackBusiness.invoiceFooter && (
                  <p className="mt-1">{fallbackBusiness.invoiceFooter}</p>
                )}
              </div>

              <div className="text-left sm:text-right shrink-0">
                <p className="font-bold text-slate-900">For {fallbackBusiness.name}</p>
                <div className="h-10"></div>
                <p className="text-[10px] text-slate-500 border-t border-slate-300 pt-1">
                  Authorized Signatory
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            A4 Tax Invoice • Indian GST Format
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD PDF</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>SHARE (WhatsApp)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
