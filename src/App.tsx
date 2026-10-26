import React, { useState, useEffect, useCallback } from 'react';
import {
  Header,
} from './components/common/Header';
import {
  BottomNav,
  TabType,
} from './components/common/BottomNav';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { AuthView } from './components/auth/AuthView';
import { BusinessSetupWizard } from './components/setup/BusinessSetupWizard';
import { Dashboard } from './components/dashboard/Dashboard';
import { PurchaseScannerModal } from './components/purchase/PurchaseScannerModal';
import { BillVerificationModal } from './components/purchase/BillVerificationModal';
import { PurchaseList } from './components/purchase/PurchaseList';
import { NewSaleModal } from './components/sales/NewSaleModal';
import { SalesList } from './components/sales/SalesList';
import { InvoiceViewModal } from './components/sales/InvoiceViewModal';
import { RecordPaymentModal } from './components/sales/RecordPaymentModal';
import { PaymentReminderModal } from './components/sales/PaymentReminderModal';
import { ProductList } from './components/products/ProductList';
import { CustomerList } from './components/customers/CustomerList';
import { SupplierList } from './components/suppliers/SupplierList';
import { VendorPriceListView } from './components/suppliers/VendorPriceListView';
import { PaymentModal } from './components/payments/PaymentModal';
import { ReturnModal } from './components/returns/ReturnModal';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { QuotationsView } from './components/quotations/QuotationsView';
import { LowStockAlertModal } from './components/common/LowStockAlertModal';

import {
  auth,
  onAuthStateChanged,
  logoutUser,
  testFirestoreConnection,
  User,
} from './services/firebase';

import {
  getBusinessProfile,
  saveBusinessProfile,
  getProducts,
  saveProduct,
  deleteProduct,
  getCustomers,
  saveCustomer,
  deleteCustomer,
  getSuppliers,
  saveSupplier,
  deleteSupplier,
  getPurchases,
  savePurchaseTransaction,
  deletePurchaseTransaction,
  getSales,
  saveSaleTransaction,
  deleteSaleTransaction,
  getPayments,
  savePayment,
  deletePayment,
  getStockMovements,
  processSalesReturn,
  processPurchaseReturn,
  seedDemoData,
  purgeDemoData,
  getQuotations,
  saveQuotation,
  deleteQuotation,
  recordSalePayment,
} from './services/dbService';

import {
  Business,
  Product,
  Customer,
  Supplier,
  Purchase,
  Sale,
  Payment,
  StockMovement,
  ExtractedBillData,
  Quotation,
} from './types';

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Network connectivity
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Business Profile & Setup
  const [business, setBusiness] = useState<Business | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  // Core Data
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);

  // Navigation
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [extractedBillData, setExtractedBillData] = useState<ExtractedBillData | null>(null);
  const [originalBillImageUrl, setOriginalBillImageUrl] = useState<string | null>(null);

  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Sale | null>(null);

  const [paymentModalConfig, setPaymentModalConfig] = useState<{
    isOpen: boolean;
    type: 'RECEIVE' | 'PAY';
    partyId?: string;
  }>({
    isOpen: false,
    type: 'RECEIVE',
  });

  const [returnModalConfig, setReturnModalConfig] = useState<{
    isOpen: boolean;
    type: 'SALE_RETURN' | 'PURCHASE_RETURN';
    sale?: Sale;
    purchase?: Purchase;
  }>({
    isOpen: false,
    type: 'SALE_RETURN',
  });

  const [paymentSale, setPaymentSale] = useState<Sale | null>(null);
  const [reminderSale, setReminderSale] = useState<Sale | null>(null);

  // In-app toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  }, []);

  // Active user ID (authenticated Firebase UID or Demo ID)
  const currentUid = user?.uid || (isDemoUser ? 'demo_owner_smartbill' : '');

  // 1. Connectivity listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Initial Firestore connection test & Auth listener
  useEffect(() => {
    testFirestoreConnection();

    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      if (authUser) {
        setIsDemoUser(false);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. Load Business & Records whenever user or currentUid changes
  const loadWorkspaceData = useCallback(async () => {
    if (!currentUid) return;

    try {
      // 1. Fetch Business Profile
      let biz = await getBusinessProfile(currentUid);
      if (!biz && !isDemoUser) {
        setNeedsSetup(true);
      } else {
        if (!biz && isDemoUser) {
          biz = {
            id: `biz_${currentUid}`,
            ownerUid: currentUid,
            name: 'Mahadev Super Store',
            ownerName: 'Ramesh Sharma',
            address: 'Shop 12, APMC Market, Mumbai',
            phone: '9820011223',
            email: 'owner@mahadevstore.in',
            gstin: '27AABCU9603R1ZM',
            state: 'Maharashtra',
            invoicePrefix: 'INV-',
            startingInvoiceNumber: 1,
            currentInvoiceNumber: 2,
            gstEnabled: true,
            defaultGstRate: 18,
            allowNegativeStock: false,
            lowStockThreshold: 5,
            upiId: 'mahadevstore@okaxis',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await saveBusinessProfile(biz);
        }
        setBusiness(biz);
        setNeedsSetup(false);
      }

      const businessId = biz?.id || `biz_${currentUid}`;

      // 2. Fetch all collections in parallel
      const [prods, custs, sups, purs, sls, pymts, movs, quots] = await Promise.all([
        getProducts(businessId, currentUid),
        getCustomers(businessId, currentUid),
        getSuppliers(businessId, currentUid),
        getPurchases(businessId, currentUid),
        getSales(businessId, currentUid),
        getPayments(businessId, currentUid),
        getStockMovements(businessId, currentUid),
        getQuotations(businessId, currentUid),
      ]);

      setProducts(prods || []);
      setCustomers(custs || []);
      setSuppliers(sups || []);
      setPurchases(purs || []);
      setSales(sls || []);
      setPayments(pymts || []);
      setStockMovements(movs || []);
      setQuotations(quots || []);

      // If demo mode and empty, seed demo data once
      if (isDemoUser && (!prods || prods.length === 0)) {
        await seedDemoData(businessId, currentUid);
        // Reload after seed
        const [seededProds, seededCusts, seededSups, seededPurs, seededSls] = await Promise.all([
          getProducts(businessId, currentUid),
          getCustomers(businessId, currentUid),
          getSuppliers(businessId, currentUid),
          getPurchases(businessId, currentUid),
          getSales(businessId, currentUid),
        ]);
        setProducts(seededProds || []);
        setCustomers(seededCusts || []);
        setSuppliers(seededSups || []);
        setPurchases(seededPurs || []);
        setSales(seededSls || []);
      }
    } catch (e) {
      console.warn('Could not fetch cloud data, utilizing cached workspace:', e);
    }
  }, [currentUid, isDemoUser]);

  useEffect(() => {
    if (currentUid) {
      loadWorkspaceData();
    }
  }, [currentUid, loadWorkspaceData]);

  // Low stock items count for bottom badge
  const lowStockCount = products.filter(
    (p) => p.currentStock <= (p.minimumStock ?? business?.lowStockThreshold ?? 5)
  ).length;

  // --- Handlers ---

  // Handle AI Scan Completion -> open Verification Screen
  const handleExtractionSuccess = (data: ExtractedBillData, originalImg: string) => {
    setIsScannerOpen(false);
    setExtractedBillData(data);
    setOriginalBillImageUrl(originalImg);
    setIsVerificationOpen(true);
  };

  // Handle Manual Purchase Entry (Fallback)
  const handleManualPurchaseEntry = () => {
    setIsScannerOpen(false);
    setExtractedBillData({
      supplierName: '',
      supplierPhone: '',
      supplierAddress: '',
      supplierGSTIN: '',
      invoiceNumber: '',
      invoiceDate: new Date().toLocaleDateString('en-GB'),
      dueDate: '',
      isInterstate: false,
      items: [],
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
    });
    setOriginalBillImageUrl(null);
    setIsVerificationOpen(true);
  };

  // Save Purchase from Verification Screen (Creates products, increments stock, logs ledger)
  const handleSavePurchase = async (
    purchase: Purchase,
    newProducts: Product[],
    newSupplier?: Supplier
  ) => {
    // 1. Save new supplier if created
    if (newSupplier) {
      await saveSupplier(newSupplier);
      setSuppliers((prev) => [newSupplier, ...prev]);
    }

    // 2. Save new products
    for (const np of newProducts) {
      await saveProduct(np);
    }

    // 3. Build product map for stock update
    const prodMap = new Map<string, Product>();
    products.forEach((p) => prodMap.set(p.id, p));
    newProducts.forEach((p) => prodMap.set(p.id, p));

    const supplierObj = newSupplier || suppliers.find((s) => s.id === purchase.supplierId);

    // 4. Save purchase with stock ledger transaction
    await savePurchaseTransaction(purchase, prodMap, supplierObj);

    // 5. Reload fresh state
    await loadWorkspaceData();
    setIsVerificationOpen(false);
    showToast(`Purchase Bill ${purchase.invoiceNumber ? '#' + purchase.invoiceNumber : ''} saved! Inventory stock updated for ${purchase.items.length} items.`, 'success');
  };

  // Delete Purchase (Reverses stock safely)
  const handleDeletePurchase = async (purchase: Purchase) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete Purchase Bill ${purchase.invoiceNumber} from ${purchase.supplierName}?\n\nThis will safely return purchased quantities back from stock and adjust supplier balance.`
    );
    if (!confirmed) return;

    try {
      await deletePurchaseTransaction(purchase, products, suppliers);
      await loadWorkspaceData();
      showToast('Purchase bill deleted successfully', 'success');
    } catch (err) {
      console.error('Delete purchase error:', err);
      showToast('Failed to delete purchase bill', 'error');
    }
  };

  // Save Sale (Decrements stock, logs ledger, creates invoice)
  const handleSaveSale = async (sale: Sale, newCustomer?: Customer) => {
    if (newCustomer) {
      await saveCustomer(newCustomer);
      setCustomers((prev) => [newCustomer, ...prev]);
    }

    const cust = newCustomer || customers.find((c) => c.id === sale.customerId);
    await saveSaleTransaction(sale, products, cust);
    await loadWorkspaceData();
  };

  // Delete Sale (Restocks inventory safely)
  const handleDeleteSale = async (sale: Sale) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete Invoice ${sale.invoiceNumber} for ${sale.customerName}?\n\nThis will safely return sold quantities back to stock and adjust customer balance.`
    );
    if (!confirmed) return;

    try {
      await deleteSaleTransaction(sale, products, customers);
      await loadWorkspaceData();
      showToast('Sales invoice deleted successfully', 'success');
    } catch (err) {
      console.error('Delete sale error:', err);
      showToast('Failed to delete sales invoice', 'error');
    }
  };

  // Save Payment
  const handleSavePayment = async (payment: Payment, partyObj?: Customer | Supplier) => {
    await savePayment(payment);
    // Update party balance in DB
    if (partyObj) {
      if (payment.partyType === 'CUSTOMER') {
        const cust = partyObj as Customer;
        const newBal = cust.currentBalance - (payment.type === 'RECEIVE' ? payment.amount : -payment.amount);
        await saveCustomer({ ...cust, currentBalance: newBal });
      } else {
        const sup = partyObj as Supplier;
        const newBal = sup.currentBalance - (payment.type === 'PAY' ? payment.amount : -payment.amount);
        await saveSupplier({ ...sup, currentBalance: newBal });
      }
    }
    await loadWorkspaceData();
  };

  // Record payment against specific invoice
  const handleRecordSalePayment = async (
    sale: Sale,
    amountPaid: number,
    paymentMethod: string,
    date: string,
    referenceNumber?: string,
    notes?: string
  ) => {
    const cust = customers.find((c) => c.id === sale.customerId);
    const { updatedSale } = await recordSalePayment(
      sale,
      amountPaid,
      paymentMethod,
      date,
      referenceNumber,
      notes,
      cust
    );
    if (viewingInvoice && viewingInvoice.id === sale.id) {
      setViewingInvoice(updatedSale);
    }
    showToast(`Payment of ₹${amountPaid.toFixed(2)} recorded! Invoice marked as ${updatedSale.paymentStatus}.`, 'success');
    await loadWorkspaceData();
  };

  // Returns
  const handleProcessSaleReturn = async (params: any) => {
    await processSalesReturn(params);
    await loadWorkspaceData();
  };

  const handleProcessPurchaseReturn = async (params: any) => {
    await processPurchaseReturn(params);
    await loadWorkspaceData();
  };

  // Global Search selection handler
  const handleSelectSearchResult = (type: string, id: string) => {
    if (type === 'product') {
      setCurrentTab('products');
    } else if (type === 'customer') {
      setCurrentTab('customers');
    } else if (type === 'supplier') {
      setCurrentTab('suppliers');
    } else if (type === 'sale') {
      const s = sales.find((item) => item.id === id);
      if (s) setViewingInvoice(s);
    } else if (type === 'purchase') {
      setCurrentTab('purchases');
    }
  };

  // Demo Workspace loader
  const handleSeedDemo = async () => {
    if (!business?.id) return;
    await seedDemoData(business.id, currentUid);
    await loadWorkspaceData();
    showToast('Sample demo inventory, customers, suppliers, and bills loaded!', 'success');
  };

  const handlePurgeDemo = async () => {
    if (!business?.id) return;
    await purgeDemoData(business.id, currentUid);
    await loadWorkspaceData();
    showToast('Demo data removed.', 'info');
  };

  const handleLogout = async () => {
    setIsDemoUser(false);
    await logoutUser();
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center animate-bounce mb-3 shadow-lg shadow-blue-500/30">
          <span className="text-xl font-bold font-mono">₹</span>
        </div>
        <p className="text-sm font-bold tracking-wide">Initializing SmartBill AI...</p>
      </div>
    );
  }

  // Not signed in and not demo
  if (!user && !isDemoUser) {
    return <AuthView onDemoLogin={() => setIsDemoUser(true)} />;
  }

  // First-time business setup wizard
  if (needsSetup) {
    return (
      <BusinessSetupWizard
        ownerUid={currentUid}
        initialEmail={user?.email || ''}
        onSave={async (biz) => {
          await saveBusinessProfile(biz);
          setBusiness(biz);
          setNeedsSetup(false);
        }}
        onSkip={() => setNeedsSetup(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Application Header */}
      <Header
        business={business}
        isOnline={isOnline}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSettings={() => setCurrentTab('settings')}
        onOpenProfile={() => setCurrentTab('settings')}
        lowStockCount={lowStockCount}
        onOpenLowStockModal={() => setIsLowStockModalOpen(true)}
      />

      {/* Main View Body */}
      <main className="flex-1 overflow-y-auto">
        {currentTab === 'dashboard' && (
          <Dashboard
            business={business}
            products={products}
            purchases={purchases}
            sales={sales}
            payments={payments}
            onScanPurchaseBill={() => setIsScannerOpen(true)}
            onNewSale={() => setIsNewSaleOpen(true)}
            onReceivePayment={() =>
              setPaymentModalConfig({ isOpen: true, type: 'RECEIVE' })
            }
            onMakePayment={() =>
              setPaymentModalConfig({ isOpen: true, type: 'PAY' })
            }
            onAddProduct={() => setCurrentTab('products')}
            onViewSale={(s) => setViewingInvoice(s)}
            onViewPurchase={() => setCurrentTab('purchases')}
            onViewProduct={() => setCurrentTab('products')}
          />
        )}

        {currentTab === 'purchases' && (
          <PurchaseList
            purchases={purchases}
            products={products}
            suppliers={suppliers}
            business={business}
            onScanBill={() => setIsScannerOpen(true)}
            onDeletePurchase={handleDeletePurchase}
          />
        )}

        {currentTab === 'sales' && (
          <SalesList
            sales={sales}
            customers={customers}
            products={products}
            business={business}
            onNewSale={() => setIsNewSaleOpen(true)}
            onViewInvoice={(s) => setViewingInvoice(s)}
            onDeleteSale={handleDeleteSale}
            onSalesReturn={(s) =>
              setReturnModalConfig({ isOpen: true, type: 'SALE_RETURN', sale: s })
            }
            onRecordPayment={(s) => setPaymentSale(s)}
            onSendReminder={(s) => setReminderSale(s)}
          />
        )}

        {currentTab === 'products' && (
          <ProductList
            products={products}
            stockMovements={stockMovements}
            business={business}
            ownerUid={currentUid}
            onSaveProduct={async (p) => {
              await saveProduct(p);
              await loadWorkspaceData();
            }}
            onDeleteProduct={async (id) => {
              await deleteProduct(id);
              await loadWorkspaceData();
            }}
            onScanPurchaseBill={() => setIsScannerOpen(true)}
          />
        )}

        {currentTab === 'customers' && (
          <CustomerList
            customers={customers}
            sales={sales}
            payments={payments}
            business={business}
            ownerUid={currentUid}
            onSaveCustomer={async (c) => {
              await saveCustomer(c);
              await loadWorkspaceData();
            }}
            onDeleteCustomer={async (id) => {
              await deleteCustomer(id);
              await loadWorkspaceData();
            }}
            onNewSaleForCustomer={(c) => {
              setIsNewSaleOpen(true);
            }}
            onReceivePaymentForCustomer={(c) => {
              setPaymentModalConfig({ isOpen: true, type: 'RECEIVE', partyId: c.id });
            }}
          />
        )}

        {currentTab === 'suppliers' && (
          <SupplierList
            suppliers={suppliers}
            purchases={purchases}
            payments={payments}
            business={business}
            ownerUid={currentUid}
            onSaveSupplier={async (s) => {
              await saveSupplier(s);
              await loadWorkspaceData();
            }}
            onDeleteSupplier={async (id) => {
              await deleteSupplier(id);
              await loadWorkspaceData();
            }}
            onScanBillForSupplier={(s) => {
              setIsScannerOpen(true);
            }}
            onMakePaymentForSupplier={(s) => {
              setPaymentModalConfig({ isOpen: true, type: 'PAY', partyId: s.id });
            }}
          />
        )}

        {currentTab === 'vendor-prices' && (
          <VendorPriceListView
            products={products}
            suppliers={suppliers}
            purchases={purchases}
            onNavigateToPurchases={() => setCurrentTab('purchases')}
          />
        )}

        {currentTab === 'quotations' && (
          <QuotationsView
            quotations={quotations}
            customers={customers}
            suppliers={suppliers}
            products={products}
            business={business}
            ownerUid={currentUid}
            onSaveQuotation={async (q) => {
              await saveQuotation(q);
              await loadWorkspaceData();
            }}
            onDeleteQuotation={async (id) => {
              const bizId = business?.id || `biz_${currentUid}`;
              await deleteQuotation(id, bizId, currentUid);
              await loadWorkspaceData();
            }}
            onConvertToSale={async (q) => {
              await saveQuotation({ ...q, status: 'CONVERTED', updatedAt: new Date().toISOString() });
              await loadWorkspaceData();
              setIsNewSaleOpen(true);
              showToast(`Customer Quotation #${q.quotationNumber} marked as Converted!`, 'info');
            }}
            onConvertToPurchase={async (q) => {
              const mappedExtracted: ExtractedBillData = {
                supplierName: q.partyName || null,
                supplierPhone: q.partyPhone || null,
                supplierAddress: null,
                supplierGSTIN: null,
                invoiceNumber: q.quotationNumber || null,
                invoiceDate: q.quotationDate || null,
                dueDate: q.expiryDate || null,
                isInterstate: q.isInterstate,
                items: q.items.map((it) => ({
                  itemName: it.productName,
                  hsn: it.hsn || null,
                  quantity: it.quantity,
                  unit: it.unit || 'PCS',
                  purchaseRate: it.rate,
                  discount: it.discount || 0,
                  gstRate: it.gstRate,
                  taxableAmount: it.taxableAmount,
                  lineTotal: it.lineTotal,
                })),
                summary: {
                  subtotal: q.subtotal,
                  totalDiscount: q.totalDiscount,
                  taxableTotal: q.taxableTotal,
                  totalCGST: q.totalCGST,
                  totalSGST: q.totalSGST,
                  totalIGST: q.totalIGST,
                  totalTax: q.totalTax,
                  grandTotal: q.grandTotal,
                },
              };
              setExtractedBillData(mappedExtracted);
              setOriginalBillImageUrl(null);
              setIsVerificationOpen(true);
              await saveQuotation({ ...q, status: 'CONVERTED', updatedAt: new Date().toISOString() });
              await loadWorkspaceData();
              showToast(`Vendor Quotation #${q.quotationNumber} loaded into Purchase Verification!`, 'success');
            }}
            onShowToast={showToast}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView
            sales={sales}
            purchases={purchases}
            products={products}
            customers={customers}
            suppliers={suppliers}
            payments={payments}
            business={business}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            business={business}
            userEmail={user?.email}
            onSaveBusiness={async (b) => {
              await saveBusinessProfile(b);
              setBusiness(b);
            }}
            onSeedDemoData={handleSeedDemo}
            onPurgeDemoData={handlePurgeDemo}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Touch-Friendly Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onChangeTab={(t) => setCurrentTab(t)}
        isMoreOpen={isMoreOpen}
        setIsMoreOpen={setIsMoreOpen}
        lowStockCount={lowStockCount}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        products={products}
        customers={customers}
        suppliers={suppliers}
        purchases={purchases}
        sales={sales}
        onSelectItem={handleSelectSearchResult}
      />

      {/* Camera & AI Bill Scanner Modal */}
      <PurchaseScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onExtractionSuccess={handleExtractionSuccess}
        onManualEntry={handleManualPurchaseEntry}
      />

      {/* Bill Verification Screen (Crucial workflow screen) */}
      <BillVerificationModal
        isOpen={isVerificationOpen}
        onClose={() => setIsVerificationOpen(false)}
        extractedData={extractedBillData}
        originalBillImageUrl={originalBillImageUrl}
        existingSuppliers={suppliers}
        existingProducts={products}
        business={business}
        ownerUid={currentUid}
        onSavePurchase={handleSavePurchase}
        onRetake={() => {
          setIsVerificationOpen(false);
          setIsScannerOpen(true);
        }}
      />

      {/* New Sale Modal */}
      <NewSaleModal
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
        customers={customers}
        products={products}
        business={business}
        ownerUid={currentUid}
        onSaveSale={handleSaveSale}
        onInvoiceCreated={(createdSale) => setViewingInvoice(createdSale)}
      />

      {/* Invoice View, Print & PDF Share Modal */}
      <InvoiceViewModal
        isOpen={Boolean(viewingInvoice)}
        onClose={() => setViewingInvoice(null)}
        sale={viewingInvoice}
        business={business}
        onRecordPayment={(s) => setPaymentSale(s)}
        onSendReminder={(s) => setReminderSale(s)}
        onDeleteSale={handleDeleteSale}
      />

      {/* Record Payment for specific invoice */}
      <RecordPaymentModal
        isOpen={Boolean(paymentSale)}
        onClose={() => setPaymentSale(null)}
        sale={paymentSale}
        customer={customers.find((c) => c.id === paymentSale?.customerId)}
        onConfirmPayment={handleRecordSalePayment}
      />

      {/* Payment Reminder for Unpaid Invoices (WhatsApp & SMS) */}
      <PaymentReminderModal
        isOpen={Boolean(reminderSale)}
        onClose={() => setReminderSale(null)}
        sale={reminderSale}
        customer={customers.find((c) => c.id === reminderSale?.customerId)}
        business={business}
        onRecordPayment={(s) => {
          setReminderSale(null);
          setPaymentSale(s);
        }}
      />

      {/* Payment Receipt / Voucher Modal */}
      <PaymentModal
        isOpen={paymentModalConfig.isOpen}
        onClose={() => setPaymentModalConfig({ ...paymentModalConfig, isOpen: false })}
        defaultType={paymentModalConfig.type}
        customers={customers}
        suppliers={suppliers}
        initialPartyId={paymentModalConfig.partyId}
        business={business}
        ownerUid={currentUid}
        onSavePayment={handleSavePayment}
      />

      {/* Return Modal (Sales Return & Purchase Return) */}
      <ReturnModal
        isOpen={returnModalConfig.isOpen}
        onClose={() => setReturnModalConfig({ ...returnModalConfig, isOpen: false })}
        type={returnModalConfig.type}
        targetSale={returnModalConfig.sale}
        targetPurchase={returnModalConfig.purchase}
        allProducts={products}
        customer={customers.find((c) => c.id === returnModalConfig.sale?.customerId)}
        supplier={suppliers.find((s) => s.id === returnModalConfig.purchase?.supplierId)}
        business={business}
        ownerUid={currentUid}
        onProcessSaleReturn={handleProcessSaleReturn}
        onProcessPurchaseReturn={handleProcessPurchaseReturn}
      />

      {/* Low Stock Alert Modal */}
      <LowStockAlertModal
        isOpen={isLowStockModalOpen}
        onClose={() => setIsLowStockModalOpen(false)}
        products={products}
        lowStockThreshold={business?.lowStockThreshold ?? 5}
        onNavigateToProducts={() => setCurrentTab('products')}
        onScanPurchaseBill={() => setIsScannerOpen(true)}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold text-white bg-slate-900 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150 max-w-sm text-center">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
