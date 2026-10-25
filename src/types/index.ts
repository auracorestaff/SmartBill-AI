export interface Business {
  id: string;
  ownerUid: string;
  name: string;
  ownerName: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  logoUrl?: string;
  state: string;
  invoicePrefix: string;
  startingInvoiceNumber: number;
  currentInvoiceNumber: number;
  gstEnabled: boolean;
  defaultGstRate: number;
  invoiceFooter?: string;
  paymentTerms?: string;
  allowNegativeStock: boolean;
  lowStockThreshold: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  upiId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  businessId: string;
  ownerUid: string;
  name: string;
  sku?: string;
  barcode?: string;
  hsn?: string;
  category?: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  gstRate: number;
  openingStock: number;
  currentStock: number;
  minimumStock: number;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  businessId: string;
  ownerUid: string;
  name: string;
  phone: string;
  whatsappNumber?: string;
  address?: string;
  gstin?: string;
  state?: string;
  openingBalance: number;
  currentBalance: number; // positive = customer owes business (receivable)
  creditLimit?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  businessId: string;
  ownerUid: string;
  name: string;
  phone: string;
  address?: string;
  gstin?: string;
  state?: string;
  openingBalance: number;
  currentBalance: number; // positive = business owes supplier (payable)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItem {
  id?: string;
  productId?: string;
  productName: string;
  productCode?: string;
  hsn?: string;
  quantity: number;
  unit: string;
  purchaseRate: number;
  discount: number;
  taxableAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
  isNewProduct?: boolean;
  needsVerification?: boolean;
}

export interface Purchase {
  id: string;
  businessId: string;
  ownerUid: string;
  supplierId?: string;
  supplierName: string;
  supplierGSTIN?: string;
  supplierPhone?: string;
  invoiceNumber: string;
  invoiceDate: string; // DD/MM/YYYY
  dueDate?: string;
  items: PurchaseItem[];
  subtotal: number;
  totalDiscount: number;
  taxableTotal: number;
  isInterstate: boolean;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalTax: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  paymentMethod: string;
  originalBillImageUrl?: string;
  notes?: string;
  needsVerification: boolean;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id?: string;
  productId: string;
  productName: string;
  hsn?: string;
  quantity: number;
  unit: string;
  sellingRate: number;
  discount: number;
  taxableAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  businessId: string;
  ownerUid: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGSTIN?: string;
  invoiceDate: string; // DD/MM/YYYY
  dueDate?: string;
  items: SaleItem[];
  isInterstate: boolean;
  subtotal: number;
  totalDiscount: number;
  taxableTotal: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  paymentMethod: string;
  notes?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  businessId: string;
  ownerUid: string;
  partyType: 'CUSTOMER' | 'SUPPLIER';
  partyId?: string;
  partyName: string;
  type: 'RECEIVE' | 'PAY';
  amount: number;
  date: string;
  paymentMethod: 'CASH' | 'UPI' | 'BANK' | 'CARD' | 'OTHER';
  referenceNumber?: string;
  notes?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType =
  | 'OPENING'
  | 'PURCHASE'
  | 'SALE'
  | 'PURCHASE_RETURN'
  | 'SALE_RETURN'
  | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  businessId: string;
  ownerUid: string;
  productId: string;
  productName: string;
  date: string;
  type: StockMovementType;
  quantity: number;
  rate?: number;
  referenceId?: string;
  referenceType?: 'PURCHASE' | 'SALE' | 'RETURN' | 'MANUAL';
  referenceNumber?: string;
  previousStock: number;
  newStock: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedBillItem {
  itemName: string;
  productCode?: string | null;
  hsn?: string | null;
  quantity: number;
  unit?: string | null;
  purchaseRate: number;
  discount?: number | null;
  taxableAmount?: number | null;
  gstRate?: number | null;
  cgst?: number | null;
  sgst?: number | null;
  igst?: number | null;
  lineTotal?: number | null;
  confidence?: 'high' | 'low' | 'uncertain';
}

export interface ExtractedBillData {
  supplierName: string | null;
  supplierPhone: string | null;
  supplierAddress: string | null;
  supplierGSTIN: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  isInterstate: boolean;
  items: ExtractedBillItem[];
  summary: {
    subtotal: number | null;
    totalDiscount: number | null;
    taxableTotal: number | null;
    totalCGST: number | null;
    totalSGST: number | null;
    totalIGST: number | null;
    totalTax: number | null;
    grandTotal: number | null;
  };
  payment?: {
    paymentMethod: string | null;
    paymentStatus: string | null;
  };
  needsVerificationFields?: string[];
}

export interface QuotationItem {
  id?: string;
  productId?: string;
  productName: string;
  hsn?: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
  taxableAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
}

export interface Quotation {
  id: string;
  businessId: string;
  ownerUid: string;
  type: 'VENDOR' | 'CUSTOMER'; // VENDOR = received from vendor/supplier quote, CUSTOMER = sent to customer estimate
  partyId?: string;
  partyName: string;
  partyPhone?: string;
  partyAddress?: string;
  quotationNumber: string;
  quotationDate: string;
  expiryDate?: string;
  items: QuotationItem[];
  subtotal: number;
  totalDiscount: number;
  taxableTotal: number;
  isInterstate: boolean;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalTax: number;
  grandTotal: number;
  status: 'PENDING' | 'SENT' | 'ACCEPTED' | 'CONVERTED' | 'REJECTED';
  notes?: string;
  originalImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

