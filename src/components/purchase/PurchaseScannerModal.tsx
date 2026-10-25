import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  RotateCcw,
  AlertCircle,
  FileEdit,
  ArrowRight,
  CheckCircle2,
  Check,
  FileCheck,
  Key,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  compressImage,
  extractBillWithAI,
  getCustomGeminiKey,
  saveCustomGeminiKey,
} from '../../services/aiService';
import { ExtractedBillData } from '../../types';

interface PurchaseScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtractionSuccess: (extractedData: ExtractedBillData, originalImageUrl: string) => void;
  onManualEntry: () => void;
}

export const PurchaseScannerModal: React.FC<PurchaseScannerModalProps> = ({
  isOpen,
  onClose,
  onExtractionSuccess,
  onManualEntry,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [keySavedToast, setKeySavedToast] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const k = getCustomGeminiKey();
      setSavedKey(k);
      setApiKeyInput(k);
    }
  }, [isOpen]);

  const handleSaveApiKey = () => {
    saveCustomGeminiKey(apiKeyInput.trim());
    setSavedKey(apiKeyInput.trim());
    setIsApiKeyDialogOpen(false);
    setKeySavedToast(true);
    setTimeout(() => setKeySavedToast(false), 3000);
  };

  const handleClearApiKey = () => {
    saveCustomGeminiKey('');
    setSavedKey('');
    setApiKeyInput('');
    setIsApiKeyDialogOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Compress image client side
      const compressed = await compressImage(file, 1600, 0.85);
      const dataUrl = `data:image/jpeg;base64,${compressed.base64}`;
      setSelectedImage(dataUrl);
      setExtractionError(null);
    } catch (err) {
      console.error('Image compression error:', err);
      setExtractionError('Failed to process the chosen image. Please try again.');
    }
  };

  const handleUseThisBill = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setExtractionError(null);

    try {
      const cleanBase64 = selectedImage.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
      const result = await extractBillWithAI(cleanBase64, 'image/jpeg');
      onExtractionSuccess(result, selectedImage);
    } catch (err: any) {
      console.error('AI Extraction Error:', err);
      setExtractionError(
        err?.message ||
          'Bill could not be read clearly. You can retake the photo or enter the purchase manually.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyAnyway = () => {
    if (!selectedImage) return;
    const starterData: ExtractedBillData = {
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
    onExtractionSuccess(starterData, selectedImage);
  };

  const handleRetake = () => {
    setSelectedImage(null);
    setExtractionError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 sm:p-4 overflow-y-auto">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-lg w-full mx-auto overflow-hidden border border-slate-200 animate-in slide-in-from-bottom duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Purchase Bill Scanner</h3>
              <p className="text-[11px] text-slate-500">Scan printed, GST, or thermal purchase bills</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsApiKeyDialogOpen(!isApiKeyDialogOpen)}
              title="Configure Gemini Cloud AI Key"
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
                savedKey
                  ? 'bg-amber-50 border-amber-300 text-amber-700 font-medium'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">{savedKey ? 'Cloud AI Active' : 'AI Key'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Optional Gemini API Key Dialog */}
        {isApiKeyDialogOpen && (
          <div className="p-4 bg-amber-50/70 border-b border-amber-200 animate-in fade-in duration-150">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <h4 className="text-xs font-bold text-amber-900">Google Gemini AI Key (Optional)</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsApiKeyDialogOpen(false)}
                className="text-amber-700 hover:text-amber-950 text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-amber-800 mt-1">
              Add your free Gemini API key to enable direct cloud AI vision scanning on your mobile phone:
            </p>
            <div className="mt-2 flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy... or AQ..."
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold"
              >
                Save
              </button>
              {savedKey && (
                <button
                  type="button"
                  onClick={handleClearApiKey}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-lg text-xs"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="mt-2 text-[10px] text-amber-700 flex items-center gap-1">
              <span>Get 100% free API key at</span>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="font-bold underline flex items-center gap-0.5"
              >
                Google AI Studio <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        )}

        {keySavedToast && (
          <div className="p-2 bg-emerald-50 border-b border-emerald-200 text-center text-xs text-emerald-800 font-semibold animate-in fade-in">
            ✓ Gemini API Key saved! Cloud AI will be used for scanning.
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6">
          {!selectedImage ? (
            /* Step 1: Capture or Upload Options */
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Camera className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-800">
                  Take a photo of the purchase bill
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Hold camera steady over the bill to auto-extract supplier, GSTIN, items, rates, and taxes.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                  {/* Camera Button */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98]"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Take Photo</span>
                  </button>

                  {/* Gallery / File Picker */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-bold text-sm shadow-xs transition-all active:scale-[0.98]"
                  >
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span>Choose from Gallery</span>
                  </button>
                </div>
              </div>

              {/* Supported bill formats indicator */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5">
                <FileCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-blue-900 leading-relaxed">
                  <span className="font-bold">Enhanced Dual AI Scanner:</span> Works offline via high-precision Indian GST columnar OCR, and cloud-assisted with Gemini AI. Supports printed GST invoices, thermal bills, and vendor vouchers.
                </div>
              </div>

              {/* Manual Entry Fallback link */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={onManualEntry}
                  className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center justify-center gap-1 mx-auto"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>Or enter purchase bill manually</span>
                </button>
              </div>
            </div>
          ) : (
            /* Step 2: Preview Chosen Bill & Process */
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center max-h-72">
                <img
                  src={selectedImage}
                  alt="Bill Preview"
                  className="max-h-72 w-auto object-contain"
                />
                {!isProcessing && (
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-xs transition-colors"
                    title="Retake Photo"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Extraction Error Notice with Fallback Options */}
              {extractionError && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{extractionError}</p>
                      <p className="text-[11px] text-amber-700 mt-1">
                        You can still proceed to the verification screen where you can review the photo and fill in the values.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  disabled={isProcessing}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-sm transition-colors disabled:opacity-50"
                >
                  Retake Photo
                </button>

                {!extractionError ? (
                  <button
                    type="button"
                    onClick={handleUseThisBill}
                    disabled={isProcessing}
                    className="flex-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Extracting Bill Data...</span>
                      </>
                    ) : (
                      <>
                        <span>Auto-Scan with AI</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleVerifyAnyway}
                    className="flex-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <span>Proceed & Fill Bill</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
