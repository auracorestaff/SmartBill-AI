import { ExtractedBillData } from '../types';
import { parseInvoiceText } from './ocrParser';
import Tesseract from 'tesseract.js';

export interface CompressedImageResult {
  base64: string;
  mimeType: string;
}

const GEMINI_STORAGE_KEY = 'smartbill_gemini_api_key';

export function getCustomGeminiKey(): string {
  try {
    return localStorage.getItem(GEMINI_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveCustomGeminiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(GEMINI_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
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

    img.onerror = () => {
      if (typeof input !== 'string') {
        URL.revokeObjectURL(src);
      }
      reject(new Error('Failed to load image for compression'));
    };

    img.src = src;
  });
}

const SYSTEM_PROMPT = `You are an expert Indian business invoice and purchase bill parser specializing in GST invoices, thermal bills, handwritten bills, and printed vendor vouchers.
Read this Indian business invoice carefully.
Extract only information visibly present in the image.
Do not invent, estimate or infer missing values.
Distinguish:
- Invoice Number / Estimate Number
- GSTIN (15 character format e.g. 29BUIPD5436N1Z5)
- Date (Format as DD/MM/YYYY)
- Supplier Phone and Name

CRITICAL EXTRACTION RULES:
- Carefully identify and extract EVERY SINGLE ITEM ROW from row #1 to the very last row without omitting or skipping ANY items.
- If there are 10, 14, 20 or more items in the invoice table, ALL items must be included in the "items" array.
- For each item, extract the complete product name, HSN/SAC code, quantity, unit (PCS, Pcs, Box, PKT, Can, Nos, Bag, etc.), purchase rate (price per unit before tax), discount, taxable amount, GST rate (0, 5, 12, 18, 28), CGST, SGST, IGST, and line total amount.
- STRICT RULE ON HSN CODES: 4-digit or 8-digit HSN/SAC codes (like 33074900, 38249900, 34012000, 2933, 2907, 3402) MUST BE PLACED ONLY IN "hsn". NEVER put an HSN/SAC code into "purchaseRate", "taxableAmount", or "lineTotal"!
- "purchaseRate" MUST be the actual unit price (e.g. 1000.00, 400.00, 170.00, 12500.00).
- DO NOT INCLUDE summary rows (such as "Total", "Sub Total", "Tax Summary") as item rows in the "items" array!
- Preserve decimal values accurately (e.g. 170.00, 180.00, 200.60, 21738.00).
- In summary, extract subtotal, taxableTotal, totalCGST, totalSGST, totalIGST, totalTax, and grandTotal.

Return structured JSON conforming to:
{
  "supplierName": string | null,
  "supplierPhone": string | null,
  "supplierAddress": string | null,
  "supplierGSTIN": string | null,
  "invoiceNumber": string | null,
  "invoiceDate": string | null,
  "dueDate": string | null,
  "isInterstate": boolean,
  "items": [
    {
      "itemName": string,
      "productCode": string | null,
      "hsn": string | null,
      "quantity": number,
      "unit": string,
      "purchaseRate": number,
      "discount": number,
      "taxableAmount": number,
      "gstRate": number,
      "cgst": number,
      "sgst": number,
      "igst": number,
      "lineTotal": number,
      "confidence": "high" | "low" | "uncertain"
    }
  ],
  "summary": {
    "subtotal": number | null,
    "totalDiscount": number | null,
    "taxableTotal": number | null,
    "totalCGST": number | null,
    "totalSGST": number | null,
    "totalIGST": number | null,
    "totalTax": number | null,
    "grandTotal": number | null
  },
  "payment": {
    "paymentMethod": string | null,
    "paymentStatus": string | null
  },
  "needsVerificationFields": string[]
}`;

/**
 * Extracts Indian GST bill data using:
 * 1. Direct Client-Side Gemini Vision if a custom API Key is set in app settings
 * 2. Local Backend Express proxy endpoint (/api/extract-bill)
 * 3. On-Device Tesseract OCR fallback with high-resilience Indian GST parsing engine
 */
export async function extractBillWithAI(
  imageBase64: string,
  mimeType = 'image/jpeg'
): Promise<ExtractedBillData> {
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

  // 1. Try Direct Gemini Cloud Vision API
  const clientApiKey =
    getCustomGeminiKey() ||
    (process.env.GEMINI_API_KEY as string | undefined);

  if (clientApiKey && clientApiKey.trim().length > 10) {
    const candidateModels = [
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ];
    for (const model of candidateModels) {
      try {
        console.log(`[AI Scanner] Calling direct Gemini Cloud Vision with ${model}...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${clientApiKey.trim()}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: cleanBase64,
                    },
                  },
                  {
                    text: SYSTEM_PROMPT,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
            },
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsedData = JSON.parse(rawText) as ExtractedBillData;
            if (parsedData && Array.isArray(parsedData.items) && parsedData.items.length > 0) {
              console.log('[AI Scanner] Direct Gemini extraction succeeded with', parsedData.items.length, 'items');
              return parsedData;
            }
          }
        }
      } catch (geminiErr) {
        console.warn(`Direct Gemini call failed for ${model}:`, geminiErr);
      }
    }
  }

  // 2. Try Server-Side Express endpoint (/api/extract-bill)
  // Only attempt relative path if not in isolated capacitor container without proxy
  try {
    console.log('[AI Scanner] Attempting server extract-bill endpoint...');
    const res = await fetch('/api/extract-bill', {
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
        console.log('[AI Scanner] Server AI extraction succeeded!');
        return json.data as ExtractedBillData;
      }
    }
  } catch (netErr) {
    console.log('[AI Scanner] Server endpoint unreachable (offline/mobile), switching to on-device engine...');
  }

  // 3. On-Device Fallback using Tesseract.js & High-Resilience Indian GST Parser
  try {
    console.log('[AI Scanner] Running on-device OCR fallback via Tesseract...');
    const worker = await Tesseract.createWorker('eng');
    const ret = await worker.recognize(`data:${mimeType};base64,${cleanBase64}`);
    await worker.terminate();
    const rawText = ret.data.text || '';

    if (rawText.trim().length > 0) {
      console.log('[AI Scanner] OCR recognized text length:', rawText.length);
      const parsed = parseInvoiceText(rawText);
      if (parsed.items.length > 0) {
        console.log('[AI Scanner] On-device parser extracted', parsed.items.length, 'items');
        return parsed;
      }
    }
  } catch (ocrErr) {
    console.error('On-device OCR fallback failed:', ocrErr);
  }

  // 4. Default baseline structure if bill was completely unreadable
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
        itemName: 'Item #1',
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
