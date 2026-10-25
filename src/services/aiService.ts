import { ExtractedBillData } from '../types';
import { parseInvoiceText } from './ocrParser';
import Tesseract from 'tesseract.js';

export interface CompressedImageResult {
  base64: string;
  mimeType: string;
}

/**
 * Compresses an image File or base64 string to a manageable resolution (max 1600px)
 * and JPEG quality for high OCR/AI accuracy and quick network transfer.
 */
export async function compressImage(
  input: File | Blob | string,
  maxWidth = 1600,
  quality = 0.85
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    let src = '';
    let inputMime = 'image/jpeg';

    if (typeof input === 'string') {
      src = input.startsWith('data:') ? input : `data:image/jpeg;base64,${input}`;
      const mimeMatch = src.match(/^data:([^;]+);base64,/);
      if (mimeMatch) inputMime = mimeMatch[1];
    } else {
      inputMime = input.type || 'image/jpeg';
      src = URL.createObjectURL(input);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (typeof input !== 'string') {
        URL.revokeObjectURL(src);
      }

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        // Fallback
        const rawBase64 = src.includes(',') ? src.split(',')[1] : src;
        return resolve({ base64: rawBase64, mimeType: inputMime });
      }

      // Draw with white background to handle transparent PNGs
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = compressedDataUrl.replace(/^data:image\/jpeg;base64,/, '');

      resolve({
        base64,
        mimeType: 'image/jpeg',
      });
    };

    img.onerror = (e) => {
      if (typeof input !== 'string') {
        URL.revokeObjectURL(src);
      }
      reject(new Error('Failed to load image for compression'));
    };

    img.src = src;
  });
}

// Production Backend API URL for APK & Web environments
const PRODUCTION_API_BASE = 'https://ais-pre-rvuyuf2ogmoyhhgu427njk-552255070283.asia-east1.run.app';

function getApiEndpoint(path: string): string {
  // If running inside Capacitor APK on mobile (origin is https://localhost or capacitor://localhost)
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'ionic:')
  ) {
    return `${PRODUCTION_API_BASE}${path}`;
  }
  // Otherwise standard relative path for web browser
  return path;
}

/**
 * Extracts Indian GST bill data using Server-Side Gemini AI vision endpoint,
 * with client-side Tesseract OCR fallback if offline or unreachable.
 */
export async function extractBillWithAI(
  imageBase64: string,
  mimeType = 'image/jpeg'
): Promise<ExtractedBillData> {
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

  // 1. Try Primary Server-Side Gemini Vision endpoint (/api/extract-bill)
  try {
    const endpointUrl = getApiEndpoint('/api/extract-bill');
    console.log('[AI Scanner] Calling extract-bill endpoint at:', endpointUrl);

    const res = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: cleanBase64,
        mimeType,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data as ExtractedBillData;
      }
    } else {
      console.warn(`Server AI extraction returned status ${res.status}. Falling back to on-device OCR...`);
    }
  } catch (netErr) {
    console.warn('Network error calling /api/extract-bill, trying on-device OCR:', netErr);
  }

  // 2. On-Device Fallback using Tesseract.js & Indian GST Regex/Heuristic Parser
  try {
    console.log('[AI Scanner] Running on-device OCR fallback via Tesseract...');
    const worker = await Tesseract.createWorker('eng');
    const ret = await worker.recognize(`data:${mimeType};base64,${cleanBase64}`);
    await worker.terminate();
    const rawText = ret.data.text || '';

    if (rawText.trim().length > 0) {
      const parsed = parseInvoiceText(rawText);
      return parsed;
    }
  } catch (ocrErr) {
    console.error('On-device OCR fallback failed:', ocrErr);
  }

  // 3. Fallback structure if neither could parse text (allows user to verify & fill in verification screen)
  return {
    supplierName: null,
    supplierPhone: null,
    supplierAddress: null,
    supplierGSTIN: null,
    invoiceNumber: `PB-${Date.now().toString().slice(-6)}`,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: null,
    isInterstate: false,
    items: [
      {
        itemName: 'Purchase Items (Review Photo)',
        productCode: null,
        hsn: null,
        quantity: 1,
        unit: 'PCS',
        purchaseRate: 0,
        discount: 0,
        taxableAmount: 0,
        gstRate: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        lineTotal: 0,
        confidence: 'uncertain',
      },
    ],
    summary: {
      subtotal: 0,
      totalDiscount: 0,
      taxableTotal: 0,
      totalCGST: 0,
      totalSGST: 0,
      totalIGST: 0,
      totalTax: 0,
      grandTotal: 0,
    },
    payment: {
      paymentMethod: 'UPI',
      paymentStatus: 'PAID',
    },
    needsVerificationFields: ['supplierName', 'grandTotal', 'items'],
  };
}
