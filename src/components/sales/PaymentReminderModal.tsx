import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  MessageSquare,
  Send,
  Copy,
  Check,
  Phone,
  IndianRupee,
  Clock,
  AlertCircle,
  Building2,
  ExternalLink,
  QrCode,
  CheckCircle2,
} from 'lucide-react';
import { Sale, Customer, Business } from '../../types';
import { formatCurrency } from '../../utils/calculations';

interface PaymentReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  customer?: Customer | null;
  business: Business | null;
  onRecordPayment?: (sale: Sale) => void;
}

type TemplateTone = 'friendly_hinglish' | 'formal_english' | 'urgent';

export const PaymentReminderModal: React.FC<PaymentReminderModalProps> = ({
  isOpen,
  onClose,
  sale,
  customer,
  business,
  onRecordPayment,
}) => {
  const [phone, setPhone] = useState('');
  const [selectedTone, setSelectedTone] = useState<TemplateTone>('friendly_hinglish');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [quickUpiId, setQuickUpiId] = useState('');
  const [includeUpi, setIncludeUpi] = useState(true);
  const [includeBank, setIncludeBank] = useState(false);

  // Sync phone & business defaults when modal opens or sale changes
  useEffect(() => {
    if (sale) {
      const defaultPhone =
        sale.customerPhone ||
        customer?.whatsappNumber ||
        customer?.phone ||
        '';
      setPhone(defaultPhone);
      setQuickUpiId(business?.upiId || '');
    }
  }, [sale, customer, business]);

  // Calculate days since invoice
  const daysAgo = useMemo(() => {
    if (!sale?.invoiceDate) return 0;
    try {
      let invDate: Date;
      if (sale.invoiceDate.includes('/')) {
        const [d, m, y] = sale.invoiceDate.split('/').map(Number);
        invDate = new Date(y, m - 1, d);
      } else {
        invDate = new Date(sale.invoiceDate);
      }
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - invDate.getTime());
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }, [sale]);

  // Construct message based on tone, business, and invoice data
  useEffect(() => {
    if (!sale) return;

    const bName = business?.name || 'SmartBill Store';
    const cName = sale.customerName || 'Customer';
    const invNo = sale.invoiceNumber;
    const invDate = sale.invoiceDate;
    const total = formatCurrency(sale.grandTotal);
    const due = formatCurrency(sale.balanceDue);
    const paid = formatCurrency(sale.paidAmount);
    const upi = quickUpiId.trim();

    let paymentDetails = '';
    if (includeUpi && upi) {
      paymentDetails += `\n\n*Pay via UPI:* ${upi}`;
      // Clean amount without currency symbol
      const numericAmount = Math.max(0, sale.balanceDue);
      const upiDeepLink = `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(
        bName
      )}&am=${numericAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Inv-' + invNo)}`;
      paymentDetails += `\n*Quick UPI Pay Link:* ${upiDeepLink}`;
    }

    if (includeBank && business?.bankAccountNumber) {
      paymentDetails += `\n\n*Bank Transfer:*`;
      if (business.bankName) paymentDetails += `\nBank: ${business.bankName}`;
      paymentDetails += `\nA/c No: ${business.bankAccountNumber}`;
      if (business.bankIfsc) paymentDetails += `\nIFSC: ${business.bankIfsc}`;
    }

    if (selectedTone === 'friendly_hinglish') {
      setMessage(
        `नमस्ते ${cName} जी,\n\n` +
          `यह *${bName}* की तरफ से आपके बिल के भुगतान के लिए एक विनम्र रिमाइंडर है।\n\n` +
          `*बिल विवरण:*\n` +
          `• बिल नं: ${invNo}\n` +
          `• बिल दिनांक: ${invDate}\n` +
          `• कुल राशि: ${total}\n` +
          `• जमा राशि: ${paid}\n` +
          `• *बकाया राशि (Due): ${due}*\n` +
          `${paymentDetails}\n\n` +
          `कृपया बकाया राशि का भुगतान जल्द से जल्द करने का कष्ट करें। यदि आप भुगतान कर चुके हैं तो कृपया इस संदेश को अनदेखा करें।\n\n` +
          `धन्यवाद,\n*${bName}*\n📞 ${business?.phone || ''}`
      );
    } else if (selectedTone === 'formal_english') {
      setMessage(
        `Dear ${cName},\n\n` +
          `This is a gentle payment reminder from *${bName}* regarding Invoice #${invNo} issued on ${invDate}.\n\n` +
          `*Invoice Summary:*\n` +
          `• Invoice No: ${invNo}\n` +
          `• Date: ${invDate}\n` +
          `• Total Amount: ${total}\n` +
          `• Amount Paid: ${paid}\n` +
          `• *Balance Due: ${due}*\n` +
          `${paymentDetails}\n\n` +
          `Kindly arrange to clear the outstanding balance at your earliest convenience. If you have already made this payment, please disregard this notification.\n\n` +
          `Warm regards,\n*${bName}*\nPhone: ${business?.phone || ''}`
      );
    } else {
      // Urgent tone
      setMessage(
        `*URGENT: Payment Reminder from ${bName}*\n\n` +
          `Dear ${cName},\n` +
          `Your payment for Invoice #${invNo} dated ${invDate} is pending.\n\n` +
          `*Pending Balance Due: ${due}* (Total Bill: ${total})\n` +
          `Days Elapsed: ${daysAgo} days\n` +
          `${paymentDetails}\n\n` +
          `Please settle this overdue amount immediately to ensure uninterrupted service.\n\n` +
          `Thank you,\n*${bName}*`
      );
    }
  }, [
    sale,
    business,
    selectedTone,
    quickUpiId,
    includeUpi,
    includeBank,
    daysAgo,
  ]);

  if (!isOpen || !sale) return null;

  // Clean phone number for WhatsApp / SMS
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const formattedWhatsAppPhone =
    cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const handleSendWhatsApp = () => {
    if (!cleanPhone) {
      alert('Please enter a valid 10-digit mobile number to send WhatsApp reminder.');
      return;
    }
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${formattedWhatsAppPhone}?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleSendSMS = () => {
    if (!cleanPhone) {
      alert('Please enter a valid mobile number to send SMS reminder.');
      return;
    }
    const encoded = encodeURIComponent(message);
    // iOS and Android support sms:number?body=message
    const smsUrl = `sms:${cleanPhone}?body=${encoded}`;
    window.location.href = smsUrl;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('Failed to copy. Please select and copy text manually.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full mx-auto overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Payment Reminder</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  {sale.paymentStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Send automated WhatsApp or SMS notice for Invoice {sale.invoiceNumber}
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

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Bill Summary Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{sale.customerName}</span>
                <span className="font-mono text-xs bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                  {sale.invoiceNumber}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
                <span>Date: {sale.invoiceDate}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-700 font-semibold">
                  <Clock className="w-3 h-3" />
                  {daysAgo === 0 ? 'Today' : `${daysAgo} days ago`}
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right bg-white p-2.5 rounded-xl border border-slate-200 shrink-0">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                Pending Balance Due
              </span>
              <span className="text-base sm:text-lg font-black text-rose-600 font-mono">
                {formatCurrency(sale.balanceDue)}
              </span>
              <span className="text-[10px] text-slate-400 block">
                Total Bill: {formatCurrency(sale.grandTotal)}
              </span>
            </div>
          </div>

          {/* Customer Phone Number Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                Customer Mobile / WhatsApp Number
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                {cleanPhone.length === 10 ? '✓ Valid 10-digit number' : 'Enter 10-digit number'}
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 font-mono text-xs">
                +91
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9820012345"
                className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-300 font-mono text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Template Tone Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Reminder Tone & Language
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedTone('friendly_hinglish')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedTone === 'friendly_hinglish'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <p className="text-xs font-bold">Hinglish / Polite</p>
                <p className="text-[10px] text-slate-500 mt-0.5">विनम्र रिमाइंडर (Hindi)</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTone('formal_english')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedTone === 'formal_english'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <p className="text-xs font-bold">English / Formal</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Professional Corporate</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTone('urgent')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedTone === 'urgent'
                    ? 'border-rose-600 bg-rose-50 text-rose-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <p className="text-xs font-bold">Urgent / Overdue</p>
                <p className="text-[10px] text-slate-500 mt-0.5">For long delays</p>
              </button>
            </div>
          </div>

          {/* Payment Link & Details Options */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-slate-500" />
                Include UPI & Payment Details
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 cursor-pointer text-[11px] font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeUpi}
                    onChange={(e) => setIncludeUpi(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>UPI ID / Link</span>
                </label>
                {business?.bankAccountNumber && (
                  <label className="flex items-center gap-1 cursor-pointer text-[11px] font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeBank}
                      onChange={(e) => setIncludeBank(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Bank A/c</span>
                  </label>
                )}
              </div>
            </div>

            {includeUpi && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={quickUpiId}
                  onChange={(e) => setQuickUpiId(e.target.value)}
                  placeholder="Enter UPI ID (e.g. mobile@paytm or name@upi)"
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {!quickUpiId && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 whitespace-nowrap">
                    Add UPI ID to allow 1-tap customer payment
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Editable Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>Message Preview (Editable)</span>
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <textarea
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 rounded-2xl border border-slate-300 font-mono text-xs text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none leading-relaxed resize-y"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          {/* Quick link to record payment if received */}
          {onRecordPayment ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRecordPayment(sale);
              }}
              className="text-xs font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-1 py-1"
            >
              <IndianRupee className="w-3.5 h-3.5" />
              <span>Already paid? Record payment</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleSendSMS}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs shadow-xs transition-all active:scale-[0.98]"
              title="Open default SMS app"
            >
              <Send className="w-3.5 h-3.5 text-blue-600" />
              <span>SEND SMS</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98]"
              title="Send directly on WhatsApp"
            >
              <MessageSquare className="w-4 h-4 fill-white" />
              <span>SEND ON WHATSAPP</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
