import { ExtractedBillData } from '../types';

function parseCleanNum(s: string | null | undefined): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(/[₹$,]/g, '').trim());
  return isNaN(n) ? 0 : n;
}

const COMMON_UNITS = [
  'can',
  'pcs',
  'pcs.',
  'nos',
  'nos.',
  'bag',
  'bags',
  'box',
  'boxes',
  'pkt',
  'pkts',
  'ltr',
  'ltrs',
  'kg',
  'kgs',
  'gm',
  'gms',
  'mtr',
  'mtrs',
  'tin',
  'tins',
  'jar',
  'jars',
  'drum',
  'drums',
  'set',
  'sets',
  'pair',
  'pairs',
  'roll',
  'rolls',
];

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

  // 3. Extract Invoice / Estimate / Order Number
  let invoiceNumber: string | null = null;
  const invNoRegex = /(?:Invoice\s*(?:No|Number|#)|Bill\s*(?:No|#)|Order\s*(?:No|#)|Inv\s*No|Estimate\s*(?:No|Number|#))[\s.:#]*([A-Za-z0-9\/-]+)/i;
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
    'estimate',
    'quotation',
    'original for recipient',
    'duplicate for transporter',
    'gst',
    'e-way',
    'order details',
    'transportation details',
  ];

  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    const isIgnored = ignoreHeadingKeywords.some((kw) => lower === kw || lower.startsWith(kw + ' '));
    if (
      !isIgnored &&
      line.length >= 3 &&
      !line.match(/^[0-9\W]+$/) &&
      !line.includes('GSTIN') &&
      !line.includes('Phone') &&
      !line.includes('Estimate For')
    ) {
      // Clean non-alphanumeric noise, OCR glitches like "¢§ bn CHEMIZONE CHEMICALS"
      let cleanedName = line.replace(/^[#*•\-_¢§£$%@!~`+=\\|\[\]{};:"'<>?\/0-9\s]+/, '').trim();
      // Remove leading junk 1-3 character tokens (e.g. "bn ", "ab ") if immediately followed by capitalized vendor name
      cleanedName = cleanedName.replace(/^[a-z0-9]{1,3}\s+(?=[A-Z])/i, '').trim();
      cleanedName = cleanedName.replace(/["'”]+$/, '').trim();

      if (cleanedName.length >= 3) {
        supplierName = cleanedName;
        break;
      }
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
    if (
      !grandTotal &&
      (lower.includes('grand total') ||
        lower.includes('total amount') ||
        lower.includes('total payable') ||
        lower.includes('net amount') ||
        lower.startsWith('total ') ||
        lower.startsWith('total:') ||
        lower === 'total')
    ) {
      const numMatches = line.match(
        /[₹]?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g
      );
      if (numMatches && numMatches.length > 0) {
        const lastVal = parseCleanNum(numMatches[numMatches.length - 1]);
        if (lastVal > 0) grandTotal = lastVal;
      }
    }

    // Check for Subtotal / Taxable Total
    if (
      !taxableTotal &&
      (lower.includes('sub total') ||
        lower.includes('subtotal') ||
        lower.includes('taxable amount') ||
        lower.includes('taxable value'))
    ) {
      const numMatches = line.match(
        /[₹]?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g
      );
      if (numMatches && numMatches.length > 0) {
        const lastVal = parseCleanNum(numMatches[numMatches.length - 1]);
        if (lastVal > 0) taxableTotal = lastVal;
      }
    }

    // Check for IGST
    if (!totalIGST && lower.includes('igst')) {
      const numMatches = line.match(
        /[₹]?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g
      );
      if (numMatches && numMatches.length > 0) {
        const lastVal = parseCleanNum(numMatches[numMatches.length - 1]);
        if (lastVal > 0) totalIGST = lastVal;
      }
    }

    // Check for CGST / SGST
    if (!totalCGST && lower.includes('cgst')) {
      const numMatches = line.match(
        /[₹]?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g
      );
      if (numMatches && numMatches.length > 0) {
        const lastVal = parseCleanNum(numMatches[numMatches.length - 1]);
        if (lastVal > 0) totalCGST = lastVal;
      }
    }
    if (!totalSGST && lower.includes('sgst')) {
      const numMatches = line.match(
        /[₹]?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g
      );
      if (numMatches && numMatches.length > 0) {
        const lastVal = parseCleanNum(numMatches[numMatches.length - 1]);
        if (lastVal > 0) totalSGST = lastVal;
      }
    }
  }

  // 7. Multi-Strategy Item Table Parser
  // Handles:
  // - Tabular rows with columns: [Index] [Item Name] [HSN] [Qty] [Unit] [Rate] [Tax] [Total]
  // - Standard Indian formats with GST% inline: e.g. "1 Phenyl 5ltr 3808 1 Can 170.00 18.00 (18%) 200.60"
  // - Multi-line wrapped item descriptions
  // - Pipe-separated columns (| Item | Qty | Rate | Total |)
  const items: any[] = [];
  let pendingDescription = '';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const lower = rawLine.toLowerCase();

    // Skip non-item headers and footers
    if (
      lower.startsWith('total') ||
      lower.startsWith('sub total') ||
      lower.startsWith('subtotal') ||
      lower.includes('taxable amount') ||
      lower.includes('tax summary') ||
      lower.includes('amount in words') ||
      lower.includes('rupees only') ||
      lower.includes('terms & conditions') ||
      lower.includes('terms and conditions') ||
      lower.includes('authorized signatory') ||
      lower.includes('bank details') ||
      lower.includes('estimate details') ||
      lower.includes('order details') ||
      lower.includes('transportation details') ||
      lower.includes('item name hsn') ||
      lower.includes('item description') ||
      lower.includes('description of goods') ||
      lower.includes('estimate for') ||
      lower.includes('billed to') ||
      lower.includes('shipped to') ||
      lower.includes('buyer') ||
      lower.includes('consignee') ||
      lower.includes('time:') ||
      lower.includes('email:') ||
      lower.includes('state:') ||
      lower.includes('address:') ||
      lower.includes('industrial area')
    ) {
      pendingDescription = '';
      continue;
    }

    // Clean line: replace pipes, tabs, and duplicate spaces
    let s = rawLine.replace(/[|│]/g, ' ').replace(/\s+/g, ' ').trim();

    // Extract GST % if present e.g. "(18%)" or "18%" or "( 18 % )"
    let lineGstRate = totalIGST || totalCGST ? 5 : 0;
    const gstMatch = s.match(/\(?(\d+(?:\.\d+)?)%\)?/);
    if (gstMatch) {
      lineGstRate = parseFloat(gstMatch[1]);
    }

    // Strip parenthesized percentages so they don't corrupt number extraction: e.g. "18.00 (18%)" -> "18.00"
    s = s.replace(/\(\s*\d+(?:\.\d+)?%\s*\)/g, '');

    const tokens = s.split(' ').filter((t) => t.length > 0);

    // Look for trailing numbers (from right to left)
    const trailingNumbers: number[] = [];
    let tokenIdx = tokens.length - 1;

    while (tokenIdx >= 0) {
      const rawVal = tokens[tokenIdx].replace(/[₹$,]/g, '');
      if (/^\d+(?:\.\d+)?$/.test(rawVal)) {
        trailingNumbers.unshift(parseFloat(rawVal));
        tokenIdx--;
      } else {
        break;
      }
    }

    // If this line ends with at least 1 number (e.g. Rate, Amount, Total):
    if (trailingNumbers.length >= 1) {
      // Check for Unit immediately preceding the trailing numbers
      let unit = 'PCS';
      if (tokenIdx >= 0) {
        const potentialUnit = tokens[tokenIdx].toLowerCase().replace(/[^a-z.]/g, '');
        if (COMMON_UNITS.includes(potentialUnit)) {
          unit = potentialUnit.replace('.', '').toUpperCase();
          tokenIdx--;
        }
      }

      // Check for Quantity preceding the unit
      let qty = 1;
      if (tokenIdx >= 0) {
        const rawQty = tokens[tokenIdx].replace(/[₹$,]/g, '');
        if (/^\d+(?:\.\d+)?$/.test(rawQty)) {
          const q = parseFloat(rawQty);
          if (q > 0 && q <= 10000) {
            qty = q;
            tokenIdx--;
          }
        }
      }

      // Check for HSN / SAC Code preceding quantity (4 to 8 digits)
      let hsn: string | null = null;
      if (tokenIdx >= 0 && /^\d{4,8}$/.test(tokens[tokenIdx])) {
        hsn = tokens[tokenIdx];
        tokenIdx--;
      }

      // Everything remaining on the left is the item name tokens
      let nameTokens = tokens.slice(0, tokenIdx + 1);

      // Strip leading row number / index (e.g. "1", "1.", "#1", "1)")
      if (nameTokens.length > 1 && /^#?\d+[\s.)-]*$/.test(nameTokens[0])) {
        nameTokens.shift();
      }

      let parsedName = nameTokens.join(' ').trim();

      // Combine with any pending multi-line description
      let finalName = pendingDescription ? `${pendingDescription} ${parsedName}`.trim() : parsedName;
      pendingDescription = '';

      // Clean leading index digits if still remaining
      finalName = finalName.replace(/^#?\d+[\s.)-]+/, '').trim();

      // Ensure item name is NEVER blank
      if (!finalName) {
        finalName = `Item #${items.length + 1}`;
      }

      // Assign numbers logically based on count:
      // If 4 numbers: [Rate, Taxable, TaxAmt, LineTotal]
      // If 3 numbers: [Rate, TaxAmt/Taxable, LineTotal]
      // If 2 numbers: [Rate, LineTotal]
      // If 1 number:  [LineTotal] (Rate = LineTotal / Qty)
      let purchaseRate = 0;
      let taxableAmount = 0;
      let lineTotal = 0;

      if (trailingNumbers.length >= 4) {
        purchaseRate = trailingNumbers[0];
        taxableAmount = trailingNumbers[1];
        lineTotal = trailingNumbers[trailingNumbers.length - 1];
      } else if (trailingNumbers.length === 3) {
        purchaseRate = trailingNumbers[0];
        taxableAmount = trailingNumbers[1];
        lineTotal = trailingNumbers[2];
      } else if (trailingNumbers.length === 2) {
        purchaseRate = trailingNumbers[0];
        taxableAmount = purchaseRate * qty;
        lineTotal = trailingNumbers[1];
      } else {
        lineTotal = trailingNumbers[0];
        taxableAmount = lineTotal;
        purchaseRate = qty > 0 ? lineTotal / qty : lineTotal;
      }

      items.push({
        itemName: finalName,
        productCode: null,
        hsn,
        quantity: qty,
        unit,
        purchaseRate: Math.round(purchaseRate * 100) / 100,
        discount: 0,
        taxableAmount: Math.round(taxableAmount * 100) / 100,
        gstRate: lineGstRate,
        cgst: totalCGST ? Math.round((taxableAmount * (lineGstRate / 200)) * 100) / 100 : 0,
        sgst: totalSGST ? Math.round((taxableAmount * (lineGstRate / 200)) * 100) / 100 : 0,
        igst: totalIGST ? Math.round((taxableAmount * (lineGstRate / 100)) * 100) / 100 : 0,
        lineTotal: Math.round(lineTotal * 100) / 100,
        confidence: 'high',
      });
    } else {
      // Line had no trailing numeric values: could be a wrapped product name (e.g. "Multipurpose clean 5 ltr can")
      if (
        /[a-zA-Z]{2,}/.test(rawLine) &&
        !/gstin|phone|email|colony|alipore|date|estimate no|order no|delhi|uttar pradesh|bengal|karnataka|maharashtra/i.test(
          rawLine
        )
      ) {
        let cleanTextLine = rawLine.replace(/^#?\d+[\s.)-]+/, '').trim();
        if (cleanTextLine.length > 0) {
          pendingDescription = pendingDescription ? `${pendingDescription} ${cleanTextLine}` : cleanTextLine;
        }
      }
    }
  }

  // 8. Auto-Reconcile with Grand Total
  // If we have a verified Grand Total (e.g. ₹21,738) from the footer:
  if (grandTotal && grandTotal > 0) {
    if (items.length === 0) {
      // No items parsed: create a single clean summary item equal to the grand total
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

      // If there is an unparsed remainder greater than ₹250 and we only captured very few items (e.g. bottom items cut off by camera):
      if (diff > 250 && items.length < 5) {
        items.push({
          itemName: 'Additional Bill Items (See Photo)',
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
