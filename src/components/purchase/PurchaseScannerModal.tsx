import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { compressImage, extractBillWithAI } from '../../services/aiService';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Compress image client side
      const compressed = await compressImage(file, 1600, 0.85);
      setSelectedImage(compressed.base64);
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
      const result = await extractBillWithAI(selectedImage);
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
    onExtractionSuccess(starterData, selectedImage);
  };

  const handleRetake = () => {
    setSelectedImage(null);
    setExtractionError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 sm:p-4 overflow-y-auto">
      {/* Hidden file inputs: one for environment camera, one for general file picker */}
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
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
                  <span className="font-bold">Multimodal Vision:</span> Supports printed GST tax invoices, thermal printer receipts, mixed Hindi/English invoices, handwritten bills, and long receipt rolls.
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
            /* Step 2: Image Preview and Confirm */
            <div className="space-y-4">
              {/* Image Preview Container */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 max-h-80 flex items-center justify-center border border-slate-800 shadow-inner">
                <img
                  src={selectedImage}
                  alt="Bill Preview"
                  className="max-h-80 w-auto object-contain"
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-white text-center">
                    <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-3" />
                    <p className="text-sm font-bold flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-blue-400" />
                      <span>Reading Bill Details...</span>
                    </p>
                    <p className="text-xs text-slate-300 mt-1">
                      Extracting vendor, items, GST, and totals accurately.
                    </p>
                  </div>
                )}
              </div>

              {/* Error fallback card if AI fails or image unreadable */}
              {extractionError && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                        Scan Verification Notice
                      </h5>
                      <p className="text-xs text-amber-900 mt-0.5">
                        {extractionError}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={handleVerifyAnyway}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all"
                    >
                      <Check className="w-4 h-4 text-white" />
                      <span>CONTINUE WITH THIS BILL PHOTO & VERIFY</span>
                    </button>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={handleUseThisBill}
                        className="py-2 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>RETRY SCAN</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRetake}
                        className="py-2 px-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>RETAKE</span>
                      </button>
                      <button
                        type="button"
                        onClick={onManualEntry}
                        className="py-2 px-2 rounded-xl bg-white border border-amber-300 hover:bg-amber-100/50 text-amber-900 font-bold text-xs flex items-center justify-center gap-1 shadow-xs"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        <span>MANUAL</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons when no error */}
              {!extractionError && !isProcessing && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Retake Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUseThisBill}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98]"
                  >
                    <Check className="w-4 h-4 text-white" />
                    <span>Use This Bill</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
