import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Enable CORS for mobile apps (Capacitor/Android localhost) and cross-origin requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Increase payload limit for base64 bill photos
app.use(express.json({ limit: '35mb' }));

// Health / Status endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Primary Bill Extraction Endpoint using Gemini 3.8 Flash
app.post('/api/extract-bill', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'No bill image data provided. Please capture or upload a bill image.',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'GEMINI_API_KEY is not configured on the server. Please check your environment variables.',
      });
    }

    // Clean base64 data if it contains data URI prefix
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are an expert Indian business invoice and purchase bill parser specializing in GST invoices, thermal bills, handwritten bills, and printed vendor vouchers.
Read this Indian business invoice carefully.
Extract only information visibly present in the image.
Do not invent, estimate or infer missing values.
Distinguish:
- Invoice Number
- GSTIN (15 character format e.g. 27ABCDE1234F1Z5)
- Date (Format as DD/MM/YYYY if discernible)
- Due Date

CRITICAL EXTRACTION RULES:
- Carefully identify and extract EVERY SINGLE ITEM ROW from row #1 to the very last row without omitting or skipping ANY items.
- If there are 10, 13, 20 or more items in the invoice table, ALL items must be included in the "items" array.
- For each item, extract the complete product name, HSN/SAC code, quantity, unit (PCS, Pcs, Box, PKT, etc.), purchase rate (price per unit before tax), discount, taxable amount, GST rate (5, 12, 18, 28), CGST, SGST, IGST, and line total amount.
- Preserve decimal values accurately (e.g. 140.00, 4200.00, 210.00, 4410.00).
- If delivery charges, freight, or shipping are listed, include them as items as well.
- Determine whether tax is CGST + SGST (intra-state) or IGST (inter-state).
- In summary, extract subtotal, taxableTotal, totalCGST, totalSGST, totalIGST, totalTax, and grandTotal.

Return structured JSON ONLY conforming to the exact JSON schema below.
If something cannot be read confidently, return null or empty string. NEVER guess.
Do not perform final financial calculations; the application will calculate and verify them independently.

JSON Output Schema:
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

    const CANDIDATE_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let lastError: unknown = null;
    let responseText: string | null = null;

    for (const modelName of CANDIDATE_MODELS) {
      try {
        console.log(`[AI Bill Scanner] Attempting extraction with model: ${modelName}...`);
        const response = await ai.models.generateContent({
          model: modelName,
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
                  text: systemPrompt,
                },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (response.text) {
          responseText = response.text;
          console.log(`[AI Bill Scanner] Successfully extracted bill using ${modelName}`);
          break;
        }
      } catch (modelErr: unknown) {
        lastError = modelErr;
        const msg = modelErr instanceof Error ? modelErr.message : String(modelErr);
        console.warn(`[AI Bill Scanner] Model ${modelName} failed (${msg}). Trying fallback model...`);
        // If high demand (503 / 429), wait 600ms before attempting fallback
        if (msg.includes('503') || msg.includes('429') || msg.includes('demand') || msg.includes('UNAVAILABLE')) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }

    if (!responseText) {
      const errorMsg = lastError instanceof Error ? lastError.message : 'All vision models temporarily unavailable';
      const isHighDemand = errorMsg.includes('503') || errorMsg.includes('demand') || errorMsg.includes('UNAVAILABLE');
      return res.status(503).json({
        success: false,
        error: isHighDemand
          ? 'AI bill scanner is experiencing high server demand right now. Please tap "Retry Scan" in a moment, or enter the purchase manually.'
          : `Bill scanning error: ${errorMsg}`,
      });
    }

    try {
      const extractedData = JSON.parse(responseText);
      return res.json({
        success: true,
        data: extractedData,
      });
    } catch {
      return res.status(422).json({
        success: false,
        error: 'Failed to parse bill extraction details. Please try retaking a clearer photo or enter details manually.',
      });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown server error during bill extraction';
    console.error('Gemini Extraction Error:', errorMsg);
    return res.status(500).json({
      success: false,
      error: `Bill scanning error: ${errorMsg}`,
    });
  }
});

async function startServer() {
  if (!isProd) {
    // Development mode: Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: static files
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmartBill AI Server running on port ${PORT} (prod: ${isProd})`);
  });
}

startServer();
