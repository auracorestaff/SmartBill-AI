import { jsPDF } from 'jspdf';
import { Sale, Business } from '../types';
import { formatCurrency, numberToIndianWords } from '../utils/calculations';

/**
 * Generates a clean, professional Indian A4 GST Tax Invoice PDF
 */
export function generateInvoicePDF(sale: Sale, business: Business): jsPDF {
  // A4 size in mm: 210 x 297
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const margin = 14;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header Background bar
  doc.setFillColor(30, 64, 175); // Blue-800
  doc.rect(margin, y, contentWidth, 22, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', margin + 6, y + 9);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('ORIGINAL FOR RECIPIENT', margin + 6, y + 16);

  // Business Name in header right
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(business.name.toUpperCase(), pageWidth - margin - 6, y + 9, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(business.gstin ? `GSTIN: ${business.gstin}` : 'UNREGISTERED', pageWidth - margin - 6, y + 16, { align: 'right' });

  y += 26;

  // Seller Details Box (Left) & Invoice Meta Box (Right)
  const boxHeight = 34;
  const halfWidth = (contentWidth - 4) / 2;

  // Left Box: Supplier/Seller details
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, halfWidth, boxHeight);

  const hasLogo = Boolean(business.logoUrl);
  const textLeft = margin + 4;
  const maxTextWidth = hasLogo ? halfWidth - 28 : halfWidth - 8;

  if (hasLogo && business.logoUrl) {
    try {
      const format = business.logoUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin + halfWidth - 23, y + 4, 19, 19, 1.5, 1.5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin + halfWidth - 23, y + 4, 19, 19, 1.5, 1.5, 'S');
      doc.addImage(business.logoUrl, format, margin + halfWidth - 22, y + 5, 17, 17, undefined, 'FAST');
    } catch (e) {
      console.warn('Could not add logo to PDF:', e);
    }
  }

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('BILLED FROM (SELLER)', textLeft, y + 5);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const nameLines = doc.splitTextToSize(business.name, maxTextWidth);
  doc.text(nameLines[0] || business.name, textLeft, y + 10);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  const addressLines = doc.splitTextToSize(business.address || 'Address not provided', maxTextWidth);
  doc.text(addressLines.slice(0, 2), textLeft, y + 15);

  doc.text(`Phone: ${business.phone || 'N/A'}`, textLeft, y + 25);
  doc.text(`State: ${business.state || 'N/A'}`, textLeft, y + 29);

  // Right Box: Invoice Details
  doc.rect(margin + halfWidth + 4, y, halfWidth, boxHeight);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE DETAILS', margin + halfWidth + 8, y + 5);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice No:', margin + halfWidth + 8, y + 11);
  doc.text(sale.invoiceNumber, margin + halfWidth + 35, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.text('Invoice Date:', margin + halfWidth + 8, y + 16);
  doc.text(sale.invoiceDate, margin + halfWidth + 35, y + 16);

  if (sale.dueDate) {
    doc.text('Due Date:', margin + halfWidth + 8, y + 21);
    doc.text(sale.dueDate, margin + halfWidth + 35, y + 21);
  }

  doc.text('Payment Status:', margin + halfWidth + 8, y + 26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(sale.paymentStatus === 'PAID' ? 22 : 185, sale.paymentStatus === 'PAID' ? 163 : 28, 74);
  doc.text(sale.paymentStatus, margin + halfWidth + 35, y + 26);

  y += boxHeight + 4;

  // Customer Box (Bill To)
  const custBoxHeight = 22;
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, custBoxHeight);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO (BUYER / CUSTOMER)', margin + 4, y + 5);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(sale.customerName, margin + 4, y + 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const custDetail = `Phone: ${sale.customerPhone || 'N/A'}  |  GSTIN: ${sale.customerGSTIN || 'Unregistered'}  |  Address: ${sale.customerAddress || 'N/A'}`;
  doc.text(custDetail, margin + 4, y + 17);

  y += custBoxHeight + 6;

  // Items Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 8);

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');

  const colSr = margin + 2;
  const colItem = margin + 12;
  const colHsn = margin + 76;
  const colQty = margin + 98;
  const colRate = margin + 118;
  const colDisc = margin + 138;
  const colGst = margin + 154;
  const colTotal = pageWidth - margin - 3;

  doc.text('#', colSr, y + 5);
  doc.text('Item Description', colItem, y + 5);
  doc.text('HSN', colHsn, y + 5);
  doc.text('Qty', colQty, y + 5);
  doc.text('Rate (₹)', colRate, y + 5);
  doc.text('Disc (₹)', colDisc, y + 5);
  doc.text('GST %', colGst, y + 5);
  doc.text('Total (₹)', colTotal, y + 5, { align: 'right' });

  y += 8;

  // Items Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  let index = 1;
  for (const item of sale.items) {
    const rowHeight = 7.5;

    // Alternating zebra
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

    doc.text(String(index), colSr, y + 5);

    // Truncate long item names cleanly
    const itemName = item.productName.length > 36 ? item.productName.substring(0, 34) + '..' : item.productName;
    doc.text(itemName, colItem, y + 5);

    doc.text(item.hsn || '-', colHsn, y + 5);
    doc.text(`${item.quantity} ${item.unit || ''}`, colQty, y + 5);
    doc.text(item.sellingRate.toFixed(2), colRate, y + 5);
    doc.text(item.discount ? item.discount.toFixed(2) : '0', colDisc, y + 5);
    doc.text(`${item.gstRate}%`, colGst, y + 5);
    doc.text(item.lineTotal.toFixed(2), colTotal, y + 5, { align: 'right' });

    y += rowHeight;
    index++;
  }

  y += 4;

  // Amount in words & Summary Table
  const summaryBoxWidth = 80;
  const summaryBoxX = pageWidth - margin - summaryBoxWidth;

  // Left side: Amount in Words & Bank details
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('AMOUNT IN WORDS', margin, y + 4);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const wordsText = numberToIndianWords(sale.grandTotal);
  const wordLines = doc.splitTextToSize(wordsText, summaryBoxX - margin - 6);
  doc.text(wordLines, margin, y + 9);

  // Bank / UPI payment instructions
  if (business.bankAccountNumber || business.upiId) {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT DETAILS', margin, y + 22);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    if (business.upiId) {
      doc.text(`UPI ID: ${business.upiId}`, margin, y + 27);
    }
    if (business.bankAccountNumber) {
      doc.text(`Bank: ${business.bankName || 'Bank'} | A/C: ${business.bankAccountNumber} | IFSC: ${business.bankIfsc || ''}`, margin, y + 32);
    }
  }

  // Right side: Financial Summary Box
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);

  const startSummaryY = y;
  const renderSummaryRow = (label: string, value: string, isBold = false, isHighlighted = false) => {
    if (isHighlighted) {
      doc.setFillColor(239, 246, 255);
      doc.rect(summaryBoxX, y, summaryBoxWidth, 7, 'F');
    }
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(isBold ? 9 : 8);
    doc.setTextColor(isHighlighted ? 30 : 51, isHighlighted ? 64 : 65, isHighlighted ? 175 : 85);
    doc.text(label, summaryBoxX + 4, y + 5);
    doc.text(value, pageWidth - margin - 4, y + 5, { align: 'right' });
    y += 6.5;
  };

  renderSummaryRow('Taxable Amount:', formatCurrency(sale.taxableTotal));
  if (sale.isInterstate) {
    renderSummaryRow('Total IGST:', formatCurrency(sale.totalIGST));
  } else {
    renderSummaryRow('Total CGST:', formatCurrency(sale.totalCGST));
    renderSummaryRow('Total SGST:', formatCurrency(sale.totalSGST));
  }
  if (sale.roundOff !== 0) {
    renderSummaryRow('Round Off:', `${sale.roundOff > 0 ? '+' : ''}${sale.roundOff.toFixed(2)}`);
  }
  renderSummaryRow('Grand Total:', formatCurrency(sale.grandTotal), true, true);
  renderSummaryRow('Paid Amount:', formatCurrency(sale.paidAmount));
  renderSummaryRow('Balance Due:', formatCurrency(sale.balanceDue), true);

  // Footer / Terms & Signatory
  const footerY = 270;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(business.paymentTerms || 'Payment due as per agreed business terms. Subject to local jurisdiction.', margin, footerY);
  if (business.invoiceFooter) {
    doc.text(business.invoiceFooter, margin, footerY + 4);
  }

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`For ${business.name}`, pageWidth - margin - 4, footerY - 1, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Authorized Signatory', pageWidth - margin - 4, footerY + 8, { align: 'right' });

  return doc;
}

/**
 * Downloads the PDF file directly
 */
export function downloadInvoicePDF(sale: Sale, business: Business): void {
  const doc = generateInvoicePDF(sale, business);
  doc.save(`${sale.invoiceNumber}_${business.name.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Prints invoice cleanly using browser print
 */
export function printInvoicePDF(sale: Sale, business: Business): void {
  const doc = generateInvoicePDF(sale, business);
  const blobUrl = doc.output('bloburl').toString();
  
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      try {
        iframe.contentWindow?.print();
      } catch {
        // Fallback if iframe contentWindow is blocked by browser security policy
        window.open(blobUrl, '_blank');
      }
    };
  } catch {
    // Ultimate fallback
    window.open(blobUrl, '_blank');
  }
}

/**
 * Shares invoice using Web Share API or WhatsApp link fallback
 */
export async function shareInvoice(sale: Sale, business: Business): Promise<{ success: boolean; method: string }> {
  const doc = generateInvoicePDF(sale, business);
  const pdfBlob = doc.output('blob');
  const fileName = `${sale.invoiceNumber}.pdf`;
  const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

  // 1. Try Native Web Share API with File attachment (Works great on Android Chrome/WhatsApp)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `Invoice ${sale.invoiceNumber} from ${business.name}`,
        text: `Dear ${sale.customerName}, please find your invoice ${sale.invoiceNumber} for ${formatCurrency(sale.grandTotal)} from ${business.name}.`,
        files: [file],
      });
      return { success: true, method: 'web_share_file' };
    } catch (e: any) {
      if (e.name === 'AbortError') {
        return { success: false, method: 'aborted' };
      }
    }
  }

  // 2. Try Web Share API with text
  if (navigator.share) {
    try {
      await navigator.share({
        title: `Invoice ${sale.invoiceNumber}`,
        text: `Tax Invoice ${sale.invoiceNumber} from ${business.name}\nCustomer: ${sale.customerName}\nAmount: ${formatCurrency(sale.grandTotal)}\nDate: ${sale.invoiceDate}`,
      });
      return { success: true, method: 'web_share_text' };
    } catch {
      // Fall through to WhatsApp direct link
    }
  }

  // 3. Fallback: WhatsApp share link
  const phone = sale.customerPhone ? sale.customerPhone.replace(/[^0-9]/g, '') : '';
  const message = encodeURIComponent(
    `*Tax Invoice from ${business.name}*\n` +
      `Invoice No: ${sale.invoiceNumber}\n` +
      `Date: ${sale.invoiceDate}\n` +
      `Total Amount: ${formatCurrency(sale.grandTotal)}\n` +
      `Balance Due: ${formatCurrency(sale.balanceDue)}\n` +
      `Thank you for your business!`
  );

  const whatsappUrl = phone
    ? `https://wa.me/91${phone.length === 10 ? phone : phone.slice(-10)}?text=${message}`
    : `https://wa.me/?text=${message}`;

  window.open(whatsappUrl, '_blank');
  return { success: true, method: 'whatsapp_url' };
}
