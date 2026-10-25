import { ExtractedBillData } from '../types';
import Tesseract from 'tesseract.js';
import { parseInvoiceText } from './ocrParser';

export async function extractBillWithAI(
  imageBase64: string,
  mimeType = 'image/jpeg'
): Promise<ExtractedBillData | null> {
  try {
    const worker = await Tesseract.createWorker('eng');
    const ret = await worker.recognize(`data:${mimeType};base64,${imageBase64}`);
    await worker.terminate();
    const text = ret.data.text || '';
    return parseInvoiceText(text);
  } catch (err) {
    console.error('OCR / AI extraction error:', err);
    return null;
  }
}

export async function compressImage(base64Str: string): Promise<string> {
  return Promise.resolve(base64Str);
}
