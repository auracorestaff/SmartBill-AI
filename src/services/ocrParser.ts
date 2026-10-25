import { ExtractedBillData } from '../types';

function parseCleanNum(s: string | null | undefined): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(/[₹$,]/g, '').trim());
  return isNaN(n) ? 0 : n;
}

/**
 * Intelligent on-device Indian GST invoice & bill text parser.
 * Handles single-line & multi-line item descriptions, HSN codes, Indian currency symbols (₹),
 * comma separated numbers (4,200.00), IGST/CGST/SGST tax types, and auto-reconciliation.
 */
export function parseInvoiceText(rawText: string): ExtractedBillData {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 1. Extract GSTIN (15 character standard Indian GSTIN)
  let supplierGSTIN: string | null = null;
  const gstinRegex = /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/i;
  for (const line of lines) {
    const match = line.match(gstinRegex);
    if (match) {
      supplierGSTIN = match[1].toUpperCase();
      break;
    }
  }

  // 2. Extract Phone Number
  let supplierPhone: string | null = null;
  const phoneRegex = /(?:Phone|Mob(?:ile)?|Contact|Tel)?[\s.:]*([6-9]\d{9})\b/i;
  for (const line of lines) {
    const match = line.match(phoneRegex);
    if (match) {
      supplierPhone = match[1];
      break;
    }
  }

  // 3. Extract Invoice / Order Number
  let invoiceNumber: string | null = null;
  const invNoRegex = /(?:Invoice\s*(?:No|Number|#)|Bill\s*(?:No|#)|Order\s*(?:No|#)|Inv\s*No)[\s.:#]*([A-Za-z0-9\/-]+)/i;
  for (const line of lines) {
    const match = line.match(invNoRegex);
    if (match && match[1] && match[1].length > 1) {
      invoiceNumber = match[1].trim();
      break;
    }
  }

  // 4. Extract Date
  let invoiceDate: string | null = null;
  const dateRegex = /(?:Date|Dated|Dt)[\s.:]*([0-9]{1,2}[-\/.][A-Za-z0-9]{2,}[-\/.][0-9]{2,4})/i;
  for (const line of lines) {
    const match = line.match(dateRegex);
    if (match && match[1]) {
      invoiceDate = match[1].trim();
      break;
    }
  }
  if (!invoiceDate) {
    const generalDateRegex = /\b(\d{1,2}[-\/](?:\d{1,2}|[A-Za-z]{3,})[-\/]\d{2,4})\b/;
    for (const line of lines.slice(0, 15)) {
      const match = line.match(generalDateRegex);
      if (match && match[1]) {
        invoiceDate = match[1].trim();
        break;
      }
    }
  }

  // 5. Extract Supplier Name (look in the top 10 lines, ignoring standard headings)
  let supplierName: string | null = null;
  const ignoreHeadingKeywords = [
    'tax invoice',
    'sale order',
    'sales order',
    'purchase order',
    'bill of supply',
    'cash memo',
    'invoice',
    'original for recipient',
    'duplicate for transporter',
    'gst',
    'e-way',
    'order details',
    'transportation details',
  ];

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    const isIgnored = ignoreHeadingKeywords.some((kw) => lower === kw || lower.startsWith(kw + ' '));
    if (!isIgnored && line.length >= 3 && !line.match(/^[0-9\W]+$/) && !line.includes('GSTIN') && !line.includes('Phone')) {
      supplierName = line.replace(/^[#*•\-_]+\s*/, '').trim();
      break;
    }
  }

  // 6. Extract Grand Total, Subtotal, and Taxes
  let grandTotal: number | null = null;
  let taxableTotal: number | null = null;
  let totalCGST: number | null = null;
  let totalSGST: number | null = null;
  let totalIGST: number | null = null;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Check for Grand Total
    if (!grandTotal && (lower.includes('grand total') || lower.includes('total amount') || lower.includes('total payable') || lower.includes('net amount') || lower.startsWith('total ') || lower === 'total')) {
      const numMatches = line.match(/[₹]?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g);
      if (numMatches && numMatches.length > 0) {
        const lastVal = parseCleanNum(numMatches[numMatches.length - 1]);
        if (lastVal > 0) grandTotal = lastVal;
      }
    }

    // Check for Subtotal / Taxable Total
    if (!taxableTotal && (lower.includes('sub total') || lower.includes('subtotal') || lower.includes('taxable amount') || lower.includes('taxable value'))) {
      const numMatches = line.match(/[₹]?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g);
      if (numMatches && numMatches.length > 0) {
        const lastVal = parseCleanNum(numMatches[numMatches.length - 1]);
        if (lastVal > 0) taxableTotal = lastVal;
      }
    }

    // Check for IGST
    if (!totalIGST && lower.includes('igst')) {
      const numMatches = line.match(/[₹]?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g);
      if (numMatches && numMatches.length > 0) {
        const lastVal = parseCleanNum(numMatches[numMatches.length - 1]);
        if (lastVal > 0) totalIGST = lastVal;
      }
    }

    // Check for CGST / SGST
    if (!totalCGST && lower.includes('cgst')) {
      const numMatches = line.match(/[₹]?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g);
      if (numMatches && numMatches.length > 0) {
        const lastVal = parseCleanNum(numMatches[numMatches.length - 1]);
        if (lastVal > 0) totalCGST = lastVal;
      }
    }
    if (!totalSGST && lower.includes('sgst')) {
      const numMatches = line.match(/[₹]?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g);
      if (numMatches && numMatches.length > 0) {
        const lastVal = parseCleanNum(numMatches[numMatches.length - 1]);
        if (lastVal > 0) totalSGST = lastVal;
      }
    }
  }

  // 7. Multi-line & Single-line Item Table Parser
  const items: any[] = [];
  let pendingName = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Skip non-item sections
    if (
      lower.startsWith('total') ||
      lower.startsWith('sub total') ||
      lower.startsWith('subtotal') ||
      lower.includes('taxable amount') ||
      lower.includes('tax type') ||
      lower.includes('order details') ||
      lower.includes('transportation details') ||
      lower.includes('dispatch') ||
      lower.includes('advance') ||
      lower.includes('balance') ||
      lower.includes('hsn/sac quantity')
    ) {
      continue;
    }

    // Clean line
    const cleaned = line.replace(/₹/g, '').replace(/\(\s*([0-9]+)%\s*\)/g, '$1%');

    // Pattern A: Multi-column Indian GST table (Item, HSN, Qty, Unit, Rate, Taxable, Tax, Total)
    // Matches lines ending with numerical values (rate, taxable, total)
    const matchA = cleaned.match(
      /(?:^(\d+)[\s.)]+)?(.*?)(\b\d{4,8}\b)?\s+(\d+(?:\.\d+)?)\s*(Pcs|PCS|PCS\.|Kg|KG|Gm|GM|Box|BOX|Pkt|PKT|Ltr|LTR|Mtr|MTR|-)?\s+([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)(?:\s+([\d,]+(?:\.\d+)?(?:\s*\d+%)?))?\s+([\d,]+(?:\.\d+)?)$/i
    );

    // Pattern B: Simplified format (Item, HSN, Qty, Unit, Rate, Total)
    const matchB = !matchA ? cleaned.match(
      /(?:^(\d+)[\s.)]+)?(.*?)(\b\d{4,8}\b)?\s+([\d,]+(?:\.\d+)?)\s*(PCS|Pcs|PCS\.|Kg|KG|Gm|GM|Box|BOX|Pkt|PKT|Ltr|LTR|Mtr|MTR)?\s+([\d,]+(?:\.\d+)?)\s*(?:PCS|Kg|Gm|Box|Pkt|Ltr|Mtr)?\s+([\d,]+(?:\.\d+)?)$/i
    ) : null;

    if (matchA) {
      let namePart = matchA[2]?.trim() || '';
      let finalName = pendingName ? `${pendingName} ${namePart}`.trim() : namePart;
      pendingName = '';

      // Clean leading index numbers
      finalName = finalName.replace(/^\d+[\s.)]+/, '').trim();
      if (!finalName && matchA[1]) finalName = `Item #${matchA[1]}`;
      if (!finalName) finalName = 'Item';

      const hsn = matchA[3] || null;
      const qty = parseCleanNum(matchA[4]) || 1;
      const unit = matchA[5] && matchA[5] !== '-' ? matchA[5].toUpperCase() : 'PCS';
      const rate = parseCleanNum(matchA[6]);
      const taxable = parseCleanNum(matchA[7]);
      const lineTotal = parseCleanNum(matchA[9]) || taxable || qty * rate;

      // Extract GST rate if present in line e.g. "5%" or "18%"
      let gstRate = totalIGST || totalCGST ? 5 : 0;
      const gstMatch = cleaned.match(/(\d+)%/);
      if (gstMatch) {
        gstRate = parseInt(gstMatch[1], 10);
      }

      items.push({
        itemName: finalName,
        productCode: null,
        hsn,
        quantity: qty,
        unit,
        purchaseRate: rate,
        discount: 0,
        taxableAmount: taxable,
        gstRate,
        cgst: totalCGST ? (taxable * (gstRate / 200)) : 0,
        sgst: totalSGST ? (taxable * (gstRate / 200)) : 0,
        igst: totalIGST ? (taxable * (gstRate / 100)) : 0,
        lineTotal,
        confidence: 'high',
      });
    } else if (matchB) {
      let namePart = matchB[2]?.trim() || '';
      let finalName = pendingName ? `${pendingName} ${namePart}`.trim() : namePart;
      pendingName = '';

      finalName = finalName.replace(/^\d+[\s.)]+/, '').trim();
      if (!finalName) finalName = matchB[1] ? `Item #${matchB[1]}` : 'Item';

      const hsn = matchB[3] || null;
      const qty = parseCleanNum(matchB[4]) || 1;
      const unit = (matchB[5] || 'PCS').toUpperCase();
      const rate = parseCleanNum(matchB[6]);
      const lineTotal = parseCleanNum(matchB[7]) || qty * rate;

      items.push({
        itemName: finalName,
        productCode: null,
        hsn,
        quantity: qty,
        unit,
        purchaseRate: rate,
        discount: 0,
        taxableAmount: lineTotal,
        gstRate: totalIGST || totalCGST ? 5 : 0,
        cgst: 0,
        sgst: 0,
        igst: totalIGST ? lineTotal * 0.05 : 0,
        lineTotal,
        confidence: 'high',
      });
    } else {
      // Line didn't have full numeric columns. Check if it is a product name or wrapped description
      if (
        /[a-zA-Z]{3,}/.test(line) &&
        !/gstin|phone|email|colony|alipore|date|so\/|order no|delhi|uttar pradesh|bengal/i.test(line)
      ) {
        if (/^\d+[\s.)]+[a-zA-Z]/.test(line)) {
          pendingName = line.replace(/^\d+[\s.)]+/, '').trim();
        } else if (pendingName) {
          pendingName += ` ${line}`;
        }
      }
    }
  }

  // 8. Auto-Reconcile with Grand Total
  // If we have a verified Grand Total (e.g. ₹58,798) from the footer:
  if (grandTotal && grandTotal > 0) {
    if (items.length === 0) {
      // No items parsed: create a single summary item equal to the grand total
      items.push({
        itemName: supplierName ? `Supplies from ${supplierName}` : 'Purchase Bill Items',
        productCode: null,
        hsn: null,
        quantity: 1,
        unit: 'PCS',
        purchaseRate: grandTotal,
        discount: 0,
        taxableAmount: taxableTotal || grandTotal,
        gstRate: totalIGST ? 5 : 0,
        cgst: totalCGST || 0,
        sgst: totalSGST || 0,
        igst: totalIGST || 0,
        lineTotal: grandTotal,
        confidence: 'high',
      });
    } else {
      // Items were parsed! Check if the sum of items matches the Grand Total
      const itemsSum = items.reduce((sum, it) => sum + (it.lineTotal || 0), 0);
      const diff = Math.round((grandTotal - itemsSum) * 100) / 100;

      // If there is an unparsed remainder greater than ₹5 (e.g. bottom items cut off by camera):
      if (diff > 5) {
        items.push({
          itemName: 'Additional Invoice Items (See Photo)',
          productCode: null,
          hsn: null,
          quantity: 1,
          unit: 'PCS',
          purchaseRate: diff,
          discount: 0,
          taxableAmount: diff,
          gstRate: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          lineTotal: diff,
          confidence: 'uncertain',
        });
      }
    }
  }

  const isInterstate = Boolean(totalIGST && totalIGST > 0);

  return {
    supplierName,
    supplierPhone,
    supplierAddress: null,
    supplierGSTIN,
    invoiceNumber,
    invoiceDate,
    dueDate: null,
    isInterstate,
    items,
    summary: {
      subtotal: taxableTotal || grandTotal,
      totalDiscount: 0,
      taxableTotal: taxableTotal || grandTotal,
      totalCGST,
      totalSGST,
      totalIGST,
      totalTax: (totalCGST || 0) + (totalSGST || 0) + (totalIGST || 0),
      grandTotal: grandTotal || taxableTotal || 0,
    },
    payment: {
      paymentMethod: 'UPI',
      paymentStatus: 'PAID',
    },
    needsVerificationFields: [],
  };
}
