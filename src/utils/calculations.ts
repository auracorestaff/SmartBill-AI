/**
 * Decimal-safe money calculations and Indian accounting helpers.
 * Never rely on AI for mathematical calculations.
 */

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0.00';
  }
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const parts = absAmount.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian Numbering System: last 3 digits, then groups of 2 digits
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  return `${isNegative ? '-' : ''}₹${formattedInteger}.${decimalPart}`;
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return round2(num).toString();
}

export function formatDateToIndian(dateStr?: string | Date | null): string {
  if (!dateStr) {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    return `${d}/${m}/${y}`;
  }

  if (typeof dateStr === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }

  const dObj = new Date(dateStr);
  if (isNaN(dObj.getTime())) {
    return String(dateStr);
  }

  const d = String(dObj.getDate()).padStart(2, '0');
  const m = String(dObj.getMonth() + 1).padStart(2, '0');
  const y = dObj.getFullYear();
  return `${d}/${m}/${y}`;
}

export interface LineItemCalculationInput {
  quantity: number;
  rate: number;
  discount?: number; // absolute discount or 0
  gstRate: number; // e.g. 5, 12, 18, 28
  isInterstate?: boolean;
}

export interface LineItemCalculationResult {
  baseAmount: number;
  discount: number;
  taxableAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
}

export function calculateLineItem(input: LineItemCalculationInput): LineItemCalculationResult {
  const qty = Math.max(0, input.quantity || 0);
  const rate = Math.max(0, input.rate || 0);
  const discount = Math.max(0, input.discount || 0);
  const gstRate = Math.max(0, input.gstRate || 0);
  const isInterstate = Boolean(input.isInterstate);

  const baseAmount = round2(qty * rate);
  const taxableAmount = Math.max(0, round2(baseAmount - discount));

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterstate) {
    igst = round2((taxableAmount * gstRate) / 100);
  } else {
    const halfRate = gstRate / 2;
    cgst = round2((taxableAmount * halfRate) / 100);
    sgst = round2((taxableAmount * halfRate) / 100);
  }

  const lineTotal = round2(taxableAmount + cgst + sgst + igst);

  return {
    baseAmount,
    discount,
    taxableAmount,
    gstRate,
    cgst,
    sgst,
    igst,
    lineTotal,
  };
}

export interface InvoiceTotals {
  subtotal: number;
  totalDiscount: number;
  taxableTotal: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
}

export function calculateInvoiceTotals(
  items: Array<{
    quantity: number;
    purchaseRate?: number;
    sellingRate?: number;
    rate?: number;
    discount?: number;
    gstRate: number;
  }>,
  isInterstate = false,
  autoRoundOff = true
): InvoiceTotals {
  let subtotal = 0;
  let totalDiscount = 0;
  let taxableTotal = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;

  for (const item of items) {
    const rate = item.rate ?? item.sellingRate ?? item.purchaseRate ?? 0;
    const calc = calculateLineItem({
      quantity: item.quantity,
      rate,
      discount: item.discount,
      gstRate: item.gstRate,
      isInterstate,
    });

    subtotal = round2(subtotal + calc.baseAmount);
    totalDiscount = round2(totalDiscount + calc.discount);
    taxableTotal = round2(taxableTotal + calc.taxableAmount);
    totalCGST = round2(totalCGST + calc.cgst);
    totalSGST = round2(totalSGST + calc.sgst);
    totalIGST = round2(totalIGST + calc.igst);
  }

  const rawTotal = round2(taxableTotal + totalCGST + totalSGST + totalIGST);
  let roundOff = 0;
  let grandTotal = rawTotal;

  if (autoRoundOff) {
    const rounded = Math.round(rawTotal);
    roundOff = round2(rounded - rawTotal);
    grandTotal = rounded;
  }

  return {
    subtotal,
    totalDiscount,
    taxableTotal,
    totalCGST,
    totalSGST,
    totalIGST,
    totalTax: round2(totalCGST + totalSGST + totalIGST),
    roundOff,
    grandTotal,
  };
}

/**
 * Converts a number to Indian Currency Words format.
 * Example: 1543.50 -> "Rupees One Thousand Five Hundred Forty Three and Fifty Paise Only"
 */
export function numberToIndianWords(num: number): string {
  if (isNaN(num) || num === 0) return 'Rupees Zero Only';

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const units = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n === 0) return '';
    if (n < 20) return units[n];
    const t = Math.floor(n / 10);
    const u = n % 10;
    return `${tens[t]}${u > 0 ? ' ' + units[u] : ''}`;
  }

  function convertThreeDigits(n: number): string {
    const h = Math.floor(n / 100);
    const r = n % 100;
    let res = '';
    if (h > 0) {
      res += `${units[h]} Hundred`;
      if (r > 0) res += ' ';
    }
    if (r > 0) {
      res += convertTwoDigits(r);
    }
    return res;
  }

  const integerPart = Math.floor(absNum);
  const decimalPart = Math.round((absNum - integerPart) * 100);

  let remaining = integerPart;
  let words = '';

  // Crores (>= 1,00,00,000)
  const crores = Math.floor(remaining / 10000000);
  if (crores > 0) {
    words += `${convertThreeDigits(crores)} Crore `;
    remaining %= 10000000;
  }

  // Lakhs (>= 1,00,000)
  const lakhs = Math.floor(remaining / 100000);
  if (lakhs > 0) {
    words += `${convertTwoDigits(lakhs)} Lakh `;
    remaining %= 100000;
  }

  // Thousands (>= 1,000)
  const thousands = Math.floor(remaining / 1000);
  if (thousands > 0) {
    words += `${convertTwoDigits(thousands)} Thousand `;
    remaining %= 1000;
  }

  // Hundreds & rest
  if (remaining > 0) {
    words += convertThreeDigits(remaining);
  }

  words = words.trim();
  if (!words) words = 'Zero';

  let result = `Rupees ${words}`;
  if (decimalPart > 0) {
    result += ` and ${convertTwoDigits(decimalPart)} Paise`;
  }
  result += ' Only';

  return isNegative ? `Minus ${result}` : result;
}

export function isValidGSTIN(gstin?: string | null): boolean {
  if (!gstin) return false;
  const cleaned = gstin.trim().toUpperCase();
  // 15 character alphanumeric GST format: 2 numbers + 10 chars PAN + 1 digit + 1 Z + 1 check digit
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleaned);
}
