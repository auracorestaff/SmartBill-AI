import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import {
  Business,
  Product,
  Customer,
  Supplier,
  Purchase,
  Sale,
  Payment,
  StockMovement,
  Quotation,
} from '../types';
import { round2, formatDateToIndian } from '../utils/calculations';

// Helper for local offline caching
const CACHE_PREFIX = 'smartbill_data_';

/**
 * Recursively strips undefined values from an object before saving to Firestore,
 * preventing "Unsupported field value: undefined" errors.
 */
export function cleanFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map((item) => cleanFirestoreData(item)) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned as any;
  }
  return data;
}

export function isCloudActive(ownerUid: string): boolean {
  return Boolean(
    auth.currentUser &&
    auth.currentUser.uid === ownerUid &&
    !ownerUid.startsWith('demo_')
  );
}

function saveToLocalCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to cache data locally', e);
  }
}

function getFromLocalCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function updateLocalList<T extends { id: string }>(cacheKey: string, item: T) {
  const list = getFromLocalCache<T[]>(cacheKey) || [];
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    list[idx] = item;
  } else {
    list.unshift(item);
  }
  saveToLocalCache(cacheKey, list);
}

function removeFromLocalList<T extends { id: string }>(cacheKey: string, id: string) {
  const list = getFromLocalCache<T[]>(cacheKey) || [];
  const next = list.filter((x) => x.id !== id);
  saveToLocalCache(cacheKey, next);
}

// -------------------------------------------------------------
// BUSINESS PROFILE & SETTINGS
// -------------------------------------------------------------
export async function getBusinessProfile(ownerUid: string): Promise<Business | null> {
  const cached = getFromLocalCache<Business>(`biz_${ownerUid}`);
  if (!isCloudActive(ownerUid)) {
    return cached;
  }

  const path = 'businesses';
  try {
    const q = query(collection(db, path), where('ownerUid', '==', ownerUid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data() as Business;
      saveToLocalCache(`biz_${ownerUid}`, data);
      return data;
    }
    return cached;
  } catch (err) {
    if (cached) return cached;
    console.warn('Firestore getBusinessProfile error, using local state:', err);
    return null;
  }
}

export async function saveBusinessProfile(business: Business): Promise<void> {
  saveToLocalCache(`biz_${business.ownerUid}`, business);
  if (!isCloudActive(business.ownerUid)) {
    return;
  }

  const path = `businesses/${business.id}`;
  try {
    await setDoc(doc(db, 'businesses', business.id), cleanFirestoreData(business), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// -------------------------------------------------------------
// PRODUCTS & INVENTORY
// -------------------------------------------------------------
export async function getProducts(businessId: string, ownerUid: string): Promise<Product[]> {
  const cached = getFromLocalCache<Product[]>(`products_${businessId}`) || [];
  if (!isCloudActive(ownerUid)) {
    return cached;
  }

  const path = 'products';
  try {
    const q = query(
      collection(db, path),
      where('ownerUid', '==', ownerUid),
      where('businessId', '==', businessId)
    );
    const snap = await getDocs(q);
    const products: Product[] = [];
    snap.forEach((d) => products.push(d.data() as Product));
    products.sort((a, b) => a.name.localeCompare(b.name));
    saveToLocalCache(`products_${businessId}`, products);
    return products;
  } catch (err) {
    if (cached.length > 0) return cached;
    console.warn('Firestore getProducts error, using cached:', err);
    return cached;
  }
}

export async function saveProduct(product: Product): Promise<void> {
  updateLocalList<Product>(`products_${product.businessId}`, product);
  if (!isCloudActive(product.ownerUid)) return;

  const path = `products/${product.id}`;
  try {
    await setDoc(doc(db, 'products', product.id), cleanFirestoreData(product), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  // Remove from local cache
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(CACHE_PREFIX + 'products_')) {
      removeFromLocalList(k.replace(CACHE_PREFIX, ''), productId);
    }
  }

  if (!auth.currentUser) return;
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// CUSTOMERS
// -------------------------------------------------------------
export async function getCustomers(businessId: string, ownerUid: string): Promise<Customer[]> {
  const cached = getFromLocalCache<Customer[]>(`customers_${businessId}`) || [];
  if (!isCloudActive(ownerUid)) {
    return cached;
  }

  const path = 'customers';
  try {
    const q = query(
      collection(db, path),
      where('ownerUid', '==', ownerUid),
      where('businessId', '==', businessId)
    );
    const snap = await getDocs(q);
    const customers: Customer[] = [];
    snap.forEach((d) => customers.push(d.data() as Customer));
    customers.sort((a, b) => a.name.localeCompare(b.name));
    saveToLocalCache(`customers_${businessId}`, customers);
    return customers;
  } catch (err) {
    if (cached.length > 0) return cached;
    console.warn('Firestore getCustomers error, using cached:', err);
    return cached;
  }
}

export async function saveCustomer(customer: Customer): Promise<void> {
  updateLocalList<Customer>(`customers_${customer.businessId}`, customer);
  if (!isCloudActive(customer.ownerUid)) return;

  const path = `customers/${customer.id}`;
  try {
    await setDoc(doc(db, 'customers', customer.id), cleanFirestoreData(customer), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteCustomer(customerId: string): Promise<void> {
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(CACHE_PREFIX + 'customers_')) {
      removeFromLocalList(k.replace(CACHE_PREFIX, ''), customerId);
    }
  }

  if (!auth.currentUser) return;
  const path = `customers/${customerId}`;
  try {
    await deleteDoc(doc(db, 'customers', customerId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// SUPPLIERS
// -------------------------------------------------------------
export async function getSuppliers(businessId: string, ownerUid: string): Promise<Supplier[]> {
  const cached = getFromLocalCache<Supplier[]>(`suppliers_${businessId}`) || [];
  if (!isCloudActive(ownerUid)) {
    return cached;
  }

  const path = 'suppliers';
  try {
    const q = query(
      collection(db, path),
      where('ownerUid', '==', ownerUid),
      where('businessId', '==', businessId)
    );
    const snap = await getDocs(q);
    const suppliers: Supplier[] = [];
    snap.forEach((d) => suppliers.push(d.data() as Supplier));
    suppliers.sort((a, b) => a.name.localeCompare(b.name));
    saveToLocalCache(`suppliers_${businessId}`, suppliers);
    return suppliers;
  } catch (err) {
    if (cached.length > 0) return cached;
    console.warn('Firestore getSuppliers error, using cached:', err);
    return cached;
  }
}

export async function saveSupplier(supplier: Supplier): Promise<void> {
  updateLocalList<Supplier>(`suppliers_${supplier.businessId}`, supplier);
  if (!isCloudActive(supplier.ownerUid)) return;

  const path = `suppliers/${supplier.id}`;
  try {
    await setDoc(doc(db, 'suppliers', supplier.id), cleanFirestoreData(supplier), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteSupplier(supplierId: string): Promise<void> {
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(CACHE_PREFIX + 'suppliers_')) {
      removeFromLocalList(k.replace(CACHE_PREFIX, ''), supplierId);
    }
  }

  if (!auth.currentUser) return;
  const path = `suppliers/${supplierId}`;
  try {
    await deleteDoc(doc(db, 'suppliers', supplierId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// STOCK MOVEMENTS & AUDIT LEDGER
// -------------------------------------------------------------
export async function recordStockMovement(movement: StockMovement): Promise<void> {
  updateLocalList<StockMovement>(`movements_${movement.businessId}`, movement);
  if (!isCloudActive(movement.ownerUid)) return;

  const path = `stockMovements/${movement.id}`;
  try {
    await setDoc(doc(db, 'stockMovements', movement.id), cleanFirestoreData(movement));
  } catch (err) {
    console.warn('Record stock movement firestore error:', err);
  }
}

export async function getStockMovements(
  businessId: string,
  ownerUid: string,
  productId?: string
): Promise<StockMovement[]> {
  const cached = getFromLocalCache<StockMovement[]>(`movements_${businessId}`) || [];
  if (!isCloudActive(ownerUid)) {
    return productId ? cached.filter((m) => m.productId === productId) : cached;
  }

  const path = 'stockMovements';
  try {
    const q = query(
      collection(db, path),
      where('ownerUid', '==', ownerUid),
      where('businessId', '==', businessId)
    );
    const snap = await getDocs(q);
    let movements: StockMovement[] = [];
    snap.forEach((d) => movements.push(d.data() as StockMovement));

    if (productId) {
      movements = movements.filter((m) => m.productId === productId);
    }

    movements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    saveToLocalCache(`movements_${businessId}`, movements);
    return movements;
  } catch (err) {
    if (cached.length > 0) return productId ? cached.filter((m) => m.productId === productId) : cached;
    console.warn('Firestore getStockMovements error, using cached:', err);
    return cached;
  }
}

// -------------------------------------------------------------
// PURCHASES & STOCK AUTOMATION
// -------------------------------------------------------------
export async function getPurchases(businessId: string, ownerUid: string): Promise<Purchase[]> {
  const cached = getFromLocalCache<Purchase[]>(`purchases_${businessId}`) || [];
  if (!isCloudActive(ownerUid)) {
    return cached;
  }

  const path = 'purchases';
  try {
    const q = query(
      collection(db, path),
      where('ownerUid', '==', ownerUid),
      where('businessId', '==', businessId)
    );
    const snap = await getDocs(q);
    const purchases: Purchase[] = [];
    snap.forEach((d) => purchases.push(d.data() as Purchase));
    purchases.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    saveToLocalCache(`purchases_${businessId}`, purchases);
    return purchases;
  } catch (err) {
    if (cached.length > 0) return cached;
    console.warn('Firestore getPurchases error, using cached:', err);
    return cached;
  }
}

/**
 * Saves a purchase bill, creates/updates products, increases stock,
 * logs stock movements, and updates supplier balance.
 */
export async function savePurchaseTransaction(
  purchase: Purchase,
  productsMap: Map<string, Product>,
  supplier?: Supplier | null
): Promise<void> {
  // 1. Update local purchase list
  updateLocalList<Purchase>(`purchases_${purchase.businessId}`, purchase);

  // 2. Update local products & movements
  for (const item of purchase.items) {
    if (!item.productId) continue;
    const existingProd = productsMap.get(item.productId);
    const prevStock = existingProd ? existingProd.currentStock : 0;
    const newStock = round2(prevStock + item.quantity);

    if (existingProd) {
      existingProd.currentStock = newStock;
      if (item.purchaseRate > 0) existingProd.purchasePrice = item.purchaseRate;
      updateLocalList<Product>(`products_${purchase.businessId}`, existingProd);
    }

    const movementId = `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    recordStockMovement({
      id: movementId,
      businessId: purchase.businessId,
      ownerUid: purchase.ownerUid,
      productId: item.productId,
      productName: item.productName,
      date: purchase.invoiceDate,
      type: 'PURCHASE',
      quantity: item.quantity,
      rate: item.purchaseRate,
      referenceId: purchase.id,
      referenceType: 'PURCHASE',
      referenceNumber: purchase.invoiceNumber,
      previousStock: prevStock,
      newStock: newStock,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // 3. Update local supplier balance
  if (supplier && purchase.balanceDue > 0) {
    supplier.currentBalance = round2(supplier.currentBalance + purchase.balanceDue);
    updateLocalList<Supplier>(`suppliers_${purchase.businessId}`, supplier);
  }

  // 4. Record local payment voucher if paidAmount > 0
  if (purchase.paidAmount > 0 && supplier) {
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    savePayment({
      id: paymentId,
      businessId: purchase.businessId,
      ownerUid: purchase.ownerUid,
      partyType: 'SUPPLIER',
      partyId: supplier.id,
      partyName: supplier.name,
      type: 'PAY',
      amount: purchase.paidAmount,
      date: purchase.invoiceDate,
      paymentMethod: (purchase.paymentMethod as any) || 'CASH',
      referenceNumber: purchase.invoiceNumber,
      notes: `Paid against Purchase Bill ${purchase.invoiceNumber}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  if (!isCloudActive(purchase.ownerUid)) {
    return;
  }

  const purchaseDocRef = doc(db, 'purchases', purchase.id);
  try {
    await setDoc(purchaseDocRef, cleanFirestoreData(purchase), { merge: true });

    for (const item of purchase.items) {
      if (!item.productId) continue;
      const existingProd = productsMap.get(item.productId);
      if (existingProd) {
        await updateDoc(doc(db, 'products', existingProd.id), {
          currentStock: existingProd.currentStock,
          purchasePrice: existingProd.purchasePrice,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (supplier && purchase.balanceDue > 0) {
      await updateDoc(doc(db, 'suppliers', supplier.id), {
        currentBalance: supplier.currentBalance,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Firestore savePurchaseTransaction sync error:', err);
  }
}

/**
 * Reverses a deleted purchase: reduces stock, logs movement adjustment,
 * and reverses supplier payable.
 */
export async function deletePurchaseTransaction(
  purchase: Purchase,
  allProducts: Product[],
  allSuppliers: Supplier[]
): Promise<void> {
  removeFromLocalList<Purchase>(`purchases_${purchase.businessId}`, purchase.id);

  for (const item of purchase.items) {
    if (!item.productId) continue;
    const prod = allProducts.find((p) => p.id === item.productId);
    if (prod) {
      const prevStock = prod.currentStock;
      const newStock = round2(prevStock - item.quantity);
      prod.currentStock = newStock;
      updateLocalList<Product>(`products_${purchase.businessId}`, prod);
    }
  }

  if (purchase.supplierId && purchase.balanceDue > 0) {
    const sup = allSuppliers.find((s) => s.id === purchase.supplierId);
    if (sup) {
      sup.currentBalance = round2(sup.currentBalance - purchase.balanceDue);
      updateLocalList<Supplier>(`suppliers_${purchase.businessId}`, sup);
    }
  }

  if (!isCloudActive(purchase.ownerUid)) {
    return;
  }

  try {
    for (const item of purchase.items) {
      if (!item.productId) continue;
      const prod = allProducts.find((p) => p.id === item.productId);
      if (prod) {
        await updateDoc(doc(db, 'products', prod.id), {
          currentStock: prod.currentStock,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (purchase.supplierId && purchase.balanceDue > 0) {
      const sup = allSuppliers.find((s) => s.id === purchase.supplierId);
      if (sup) {
        await updateDoc(doc(db, 'suppliers', sup.id), {
          currentBalance: sup.currentBalance,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await deleteDoc(doc(db, 'purchases', purchase.id));
  } catch (err) {
    console.warn('Firestore deletePurchaseTransaction sync error:', err);
  }
}

// -------------------------------------------------------------
// SALES & INVOICE NUMBERING
// -------------------------------------------------------------
export async function getSales(businessId: string, ownerUid: string): Promise<Sale[]> {
  const cached = getFromLocalCache<Sale[]>(`sales_${businessId}`) || [];
  if (!isCloudActive(ownerUid)) {
    return cached;
  }

  const path = 'sales';
  try {
    const q = query(
      collection(db, path),
      where('ownerUid', '==', ownerUid),
      where('businessId', '==', businessId)
    );
    const snap = await getDocs(q);
    const sales: Sale[] = [];
    snap.forEach((d) => sales.push(d.data() as Sale));
    sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    saveToLocalCache(`sales_${businessId}`, sales);
    return sales;
  } catch (err) {
    if (cached.length > 0) return cached;
    console.warn('Firestore getSales error, using cached:', err);
    return cached;
  }
}

/**
 * Atomically generates the next invoice number (e.g., INV-000001)
 */
export async function generateNextInvoiceNumber(
  businessId: string,
  prefix = 'INV-'
): Promise<{ invoiceNumber: string; nextCounter: number }> {
  const localKey = `inv_counter_${businessId}`;
  let current = Number(localStorage.getItem(CACHE_PREFIX + localKey)) || 1;
  const formatted = `${prefix}${String(current).padStart(6, '0')}`;
  saveToLocalCache(localKey, current + 1);

  if (!auth.currentUser || businessId.startsWith('biz_demo_')) {
    return { invoiceNumber: formatted, nextCounter: current + 1 };
  }

  const bizRef = doc(db, 'businesses', businessId);
  try {
    const nextVal = await runTransaction(db, async (txn) => {
      const bizDoc = await txn.get(bizRef);
      if (!bizDoc.exists()) {
        return { invoiceNumber: formatted, nextCounter: current + 1 };
      }
      const data = bizDoc.data() as Business;
      const cur = data.currentInvoiceNumber || data.startingInvoiceNumber || 1;
      const fmt = `${data.invoicePrefix || prefix}${String(cur).padStart(6, '0')}`;
      txn.update(bizRef, {
        currentInvoiceNumber: cur + 1,
        updatedAt: new Date().toISOString(),
      });
      return { invoiceNumber: fmt, nextCounter: cur + 1 };
    });
    return nextVal;
  } catch (e) {
    return { invoiceNumber: formatted, nextCounter: current + 1 };
  }
}

/**
 * Saves a sales invoice, updates stock (decrements), records stock movement,
 * and updates customer balance.
 */
export async function saveSaleTransaction(
  sale: Sale,
  allProducts: Product[],
  customer?: Customer | null
): Promise<void> {
  updateLocalList<Sale>(`sales_${sale.businessId}`, sale);

  for (const item of sale.items) {
    const prod = allProducts.find((p) => p.id === item.productId);
    if (prod) {
      const prevStock = prod.currentStock;
      const newStock = round2(prevStock - item.quantity);
      prod.currentStock = newStock;
      updateLocalList<Product>(`products_${sale.businessId}`, prod);

      const movementId = `mov_sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      recordStockMovement({
        id: movementId,
        businessId: sale.businessId,
        ownerUid: sale.ownerUid,
        productId: prod.id,
        productName: prod.name,
        date: sale.invoiceDate,
        type: 'SALE',
        quantity: -item.quantity,
        rate: item.sellingRate,
        referenceId: sale.id,
        referenceType: 'SALE',
        referenceNumber: sale.invoiceNumber,
        previousStock: prevStock,
        newStock: newStock,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  if (customer && sale.balanceDue > 0) {
    customer.currentBalance = round2(customer.currentBalance + sale.balanceDue);
    updateLocalList<Customer>(`customers_${sale.businessId}`, customer);
  }

  if (sale.paidAmount > 0 && customer) {
    const paymentId = `pay_sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    savePayment({
      id: paymentId,
      businessId: sale.businessId,
      ownerUid: sale.ownerUid,
      partyType: 'CUSTOMER',
      partyId: customer.id,
      partyName: customer.name,
      type: 'RECEIVE',
      amount: sale.paidAmount,
      date: sale.invoiceDate,
      paymentMethod: (sale.paymentMethod as any) || 'CASH',
      referenceNumber: sale.invoiceNumber,
      notes: `Received against Sales Invoice ${sale.invoiceNumber}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  if (!isCloudActive(sale.ownerUid)) {
    return;
  }

  const saleDocRef = doc(db, 'sales', sale.id);
  try {
    await setDoc(saleDocRef, cleanFirestoreData(sale), { merge: true });

    for (const item of sale.items) {
      const prod = allProducts.find((p) => p.id === item.productId);
      if (prod) {
        await updateDoc(doc(db, 'products', prod.id), {
          currentStock: prod.currentStock,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (customer && sale.balanceDue > 0) {
      await updateDoc(doc(db, 'customers', customer.id), {
        currentBalance: customer.currentBalance,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Firestore saveSaleTransaction sync error:', err);
  }
}

/**
 * Reverses a deleted sale: restocks inventory, logs movement adjustment,
 * and updates customer balance.
 */
export async function deleteSaleTransaction(
  sale: Sale,
  allProducts: Product[],
  allCustomers: Customer[]
): Promise<void> {
  removeFromLocalList<Sale>(`sales_${sale.businessId}`, sale.id);

  for (const item of sale.items) {
    const prod = allProducts.find((p) => p.id === item.productId);
    if (prod) {
      const prevStock = prod.currentStock;
      const newStock = round2(prevStock + item.quantity);
      prod.currentStock = newStock;
      updateLocalList<Product>(`products_${sale.businessId}`, prod);
    }
  }

  if (sale.customerId && sale.balanceDue > 0) {
    const cust = allCustomers.find((c) => c.id === sale.customerId);
    if (cust) {
      cust.currentBalance = round2(cust.currentBalance - sale.balanceDue);
      updateLocalList<Customer>(`customers_${sale.businessId}`, cust);
    }
  }

  if (!isCloudActive(sale.ownerUid)) {
    return;
  }

  try {
    for (const item of sale.items) {
      const prod = allProducts.find((p) => p.id === item.productId);
      if (prod) {
        await updateDoc(doc(db, 'products', prod.id), {
          currentStock: prod.currentStock,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (sale.customerId && sale.balanceDue > 0) {
      const cust = allCustomers.find((c) => c.id === sale.customerId);
      if (cust) {
        await updateDoc(doc(db, 'customers', cust.id), {
          currentBalance: cust.currentBalance,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await deleteDoc(doc(db, 'sales', sale.id));
  } catch (err) {
    console.warn('Firestore deleteSaleTransaction sync error:', err);
  }
}

// -------------------------------------------------------------
// PAYMENTS & VOUCHERS
// -------------------------------------------------------------
export async function getPayments(businessId: string, ownerUid: string): Promise<Payment[]> {
  const cached = getFromLocalCache<Payment[]>(`payments_${businessId}`) || [];
  if (!isCloudActive(ownerUid)) {
    return cached;
  }

  const path = 'payments';
  try {
    const q = query(
      collection(db, path),
      where('ownerUid', '==', ownerUid),
      where('businessId', '==', businessId)
    );
    const snap = await getDocs(q);
    const payments: Payment[] = [];
    snap.forEach((d) => payments.push(d.data() as Payment));
    payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    saveToLocalCache(`payments_${businessId}`, payments);
    return payments;
  } catch (err) {
    if (cached.length > 0) return cached;
    console.warn('Firestore getPayments error, using cached:', err);
    return cached;
  }
}

export async function savePayment(payment: Payment): Promise<void> {
  updateLocalList<Payment>(`payments_${payment.businessId}`, payment);
  if (!isCloudActive(payment.ownerUid)) return;

  const path = `payments/${payment.id}`;
  try {
    await setDoc(doc(db, 'payments', payment.id), cleanFirestoreData(payment), { merge: true });
  } catch (err) {
    console.warn('Firestore savePayment sync error:', err);
  }
}

export async function deletePayment(payment: Payment, partyObj?: Customer | Supplier): Promise<void> {
  removeFromLocalList<Payment>(`payments_${payment.businessId}`, payment.id);

  if (partyObj) {
    if (payment.partyType === 'CUSTOMER') {
      const cust = partyObj as Customer;
      cust.currentBalance = round2(cust.currentBalance + (payment.type === 'RECEIVE' ? payment.amount : -payment.amount));
      updateLocalList<Customer>(`customers_${payment.businessId}`, cust);
    } else {
      const sup = partyObj as Supplier;
      sup.currentBalance = round2(sup.currentBalance + (payment.type === 'PAY' ? payment.amount : -payment.amount));
      updateLocalList<Supplier>(`suppliers_${payment.businessId}`, sup);
    }
  }

  if (!isCloudActive(payment.ownerUid)) return;

  const path = `payments/${payment.id}`;
  try {
    if (partyObj) {
      if (payment.partyType === 'CUSTOMER') {
        const cust = partyObj as Customer;
        await updateDoc(doc(db, 'customers', cust.id), {
          currentBalance: cust.currentBalance,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const sup = partyObj as Supplier;
        await updateDoc(doc(db, 'suppliers', sup.id), {
          currentBalance: sup.currentBalance,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await deleteDoc(doc(db, 'payments', payment.id));
  } catch (err) {
    console.warn('Firestore deletePayment sync error:', err);
  }
}

/**
 * Records a payment against an existing unpaid or partially paid sales invoice.
 * Updates the sale's paidAmount, balanceDue, paymentStatus, adjusts customer ledger,
 * and creates a payment voucher.
 */
export async function recordSalePayment(
  sale: Sale,
  amountPaid: number,
  paymentMethod: string,
  date: string,
  referenceNumber?: string,
  notes?: string,
  customer?: Customer | null
): Promise<{ updatedSale: Sale; updatedCustomer?: Customer | null }> {
  const newPaidAmount = round2(sale.paidAmount + amountPaid);
  const newBalanceDue = round2(Math.max(0, sale.grandTotal - newPaidAmount));
  const newPaymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' =
    newBalanceDue === 0 ? 'PAID' : newPaidAmount > 0 ? 'PARTIAL' : 'UNPAID';

  const updatedSale: Sale = {
    ...sale,
    paidAmount: newPaidAmount,
    balanceDue: newBalanceDue,
    paymentStatus: newPaymentStatus,
    paymentMethod: (paymentMethod as any) || sale.paymentMethod,
    updatedAt: new Date().toISOString(),
  };

  updateLocalList<Sale>(`sales_${sale.businessId}`, updatedSale);

  let updatedCustomer: Customer | null = null;
  if (customer) {
    const newCustBalance = round2(Math.max(0, customer.currentBalance - amountPaid));
    updatedCustomer = {
      ...customer,
      currentBalance: newCustBalance,
      updatedAt: new Date().toISOString(),
    };
    updateLocalList<Customer>(`customers_${sale.businessId}`, updatedCustomer);
  }

  // Create payment voucher
  const paymentId = `pay_sale_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const payment: Payment = {
    id: paymentId,
    businessId: sale.businessId,
    ownerUid: sale.ownerUid,
    partyType: 'CUSTOMER',
    partyId: sale.customerId || '',
    partyName: sale.customerName,
    type: 'RECEIVE',
    amount: amountPaid,
    date: date || formatDateToIndian(new Date()),
    paymentMethod: (paymentMethod as any) || 'CASH',
    referenceNumber: referenceNumber || sale.invoiceNumber,
    notes: notes || `Payment received against Invoice #${sale.invoiceNumber}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await savePayment(payment);

  if (!isCloudActive(sale.ownerUid)) {
    return { updatedSale, updatedCustomer };
  }

  try {
    await updateDoc(doc(db, 'sales', sale.id), cleanFirestoreData({
      paidAmount: updatedSale.paidAmount,
      balanceDue: updatedSale.balanceDue,
      paymentStatus: updatedSale.paymentStatus,
      paymentMethod: updatedSale.paymentMethod,
      updatedAt: updatedSale.updatedAt,
    }));

    if (updatedCustomer) {
      await updateDoc(doc(db, 'customers', updatedCustomer.id), {
        currentBalance: updatedCustomer.currentBalance,
        updatedAt: updatedCustomer.updatedAt,
      });
    }
  } catch (err) {
    console.warn('Firestore recordSalePayment sync warning:', err);
  }

  return { updatedSale, updatedCustomer };
}

// -------------------------------------------------------------
// RETURNS (Sales Return & Purchase Return)
// -------------------------------------------------------------
export async function processSalesReturn(params: {
  businessId: string;
  ownerUid: string;
  sale: Sale;
  returnedItems: Array<{ productId: string; productName: string; quantity: number; rate: number }>;
  refundAmount: number;
  customer?: Customer;
  allProducts: Product[];
}): Promise<void> {
  const { businessId, ownerUid, sale, returnedItems, refundAmount, customer, allProducts } = params;

  // 1. Increase stock for returned items
  for (const item of returnedItems) {
    const prod = allProducts.find((p) => p.id === item.productId);
    if (prod && item.quantity > 0) {
      const prevStock = prod.currentStock;
      const newStock = round2(prevStock + item.quantity);
      prod.currentStock = newStock;
      updateLocalList<Product>(`products_${businessId}`, prod);

      const movementId = `mov_ret_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      recordStockMovement({
        id: movementId,
        businessId,
        ownerUid,
        productId: prod.id,
        productName: prod.name,
        date: new Date().toLocaleDateString('en-GB'),
        type: 'SALE_RETURN',
        quantity: item.quantity,
        rate: item.rate,
        referenceId: sale.id,
        referenceType: 'RETURN',
        referenceNumber: `RET-${sale.invoiceNumber}`,
        previousStock: prevStock,
        newStock: newStock,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // 2. Adjust customer balance if needed
  if (customer && refundAmount > 0) {
    customer.currentBalance = round2(customer.currentBalance - refundAmount);
    updateLocalList<Customer>(`customers_${businessId}`, customer);
  }

  if (!isCloudActive(ownerUid)) return;

  try {
    for (const item of returnedItems) {
      const prod = allProducts.find((p) => p.id === item.productId);
      if (prod && item.quantity > 0) {
        await updateDoc(doc(db, 'products', prod.id), {
          currentStock: prod.currentStock,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (customer && refundAmount > 0) {
      await updateDoc(doc(db, 'customers', customer.id), {
        currentBalance: customer.currentBalance,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Firestore processSalesReturn sync error:', err);
  }
}

export async function processPurchaseReturn(params: {
  businessId: string;
  ownerUid: string;
  purchase: Purchase;
  returnedItems: Array<{ productId: string; productName: string; quantity: number; rate: number }>;
  creditAmount: number;
  supplier?: Supplier;
  allProducts: Product[];
}): Promise<void> {
  const { businessId, ownerUid, purchase, returnedItems, creditAmount, supplier, allProducts } = params;

  // 1. Decrease stock for returned items
  for (const item of returnedItems) {
    const prod = allProducts.find((p) => p.id === item.productId);
    if (prod && item.quantity > 0) {
      const prevStock = prod.currentStock;
      const newStock = round2(prevStock - item.quantity);
      prod.currentStock = newStock;
      updateLocalList<Product>(`products_${businessId}`, prod);

      const movementId = `mov_pret_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      recordStockMovement({
        id: movementId,
        businessId,
        ownerUid,
        productId: prod.id,
        productName: prod.name,
        date: new Date().toLocaleDateString('en-GB'),
        type: 'PURCHASE_RETURN',
        quantity: -item.quantity,
        rate: item.rate,
        referenceId: purchase.id,
        referenceType: 'RETURN',
        referenceNumber: `RET-${purchase.invoiceNumber}`,
        previousStock: prevStock,
        newStock: newStock,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // 2. Adjust supplier balance
  if (supplier && creditAmount > 0) {
    supplier.currentBalance = round2(supplier.currentBalance - creditAmount);
    updateLocalList<Supplier>(`suppliers_${businessId}`, supplier);
  }

  if (!isCloudActive(ownerUid)) return;

  try {
    for (const item of returnedItems) {
      const prod = allProducts.find((p) => p.id === item.productId);
      if (prod && item.quantity > 0) {
        await updateDoc(doc(db, 'products', prod.id), {
          currentStock: prod.currentStock,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (supplier && creditAmount > 0) {
      await updateDoc(doc(db, 'suppliers', supplier.id), {
        currentBalance: supplier.currentBalance,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Firestore processPurchaseReturn sync error:', err);
  }
}

// -------------------------------------------------------------
// DEMO DATA SEEDER & PURGER
// -------------------------------------------------------------
export async function seedDemoData(businessId: string, ownerUid: string): Promise<void> {
  const now = new Date().toISOString();
  const todayStr = new Date().toLocaleDateString('en-GB');

  // 5 Products
  const demoProducts: Product[] = [
    {
      id: `demo_prod_1_${businessId}`,
      businessId,
      ownerUid,
      name: 'Basmati Rice Premium 5kg',
      sku: 'RIC-5KG',
      barcode: '890123456001',
      hsn: '1006',
      category: 'Grains & Grocery',
      unit: 'BAG',
      purchasePrice: 420,
      sellingPrice: 510,
      gstRate: 5,
      openingStock: 25,
      currentStock: 45,
      minimumStock: 10,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `demo_prod_2_${businessId}`,
      businessId,
      ownerUid,
      name: 'Tata Salt Vacuum Evaporated 1kg',
      sku: 'SALT-1KG',
      barcode: '890123456002',
      hsn: '2501',
      category: 'Grocery',
      unit: 'PKT',
      purchasePrice: 22,
      sellingPrice: 28,
      gstRate: 5,
      openingStock: 50,
      currentStock: 80,
      minimumStock: 15,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `demo_prod_3_${businessId}`,
      businessId,
      ownerUid,
      name: 'Fortune Sunlite Refined Sunflower Oil 1L',
      sku: 'OIL-1LTR',
      barcode: '890123456003',
      hsn: '1512',
      category: 'Edible Oils',
      unit: 'LTR',
      purchasePrice: 135,
      sellingPrice: 158,
      gstRate: 5,
      openingStock: 30,
      currentStock: 45,
      minimumStock: 10,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `demo_prod_4_${businessId}`,
      businessId,
      ownerUid,
      name: 'Aashirvaad Shudh Chakki Atta 10kg',
      sku: 'ATTA-10KG',
      barcode: '890123456004',
      hsn: '1101',
      category: 'Flour & Atta',
      unit: 'BAG',
      purchasePrice: 380,
      sellingPrice: 440,
      gstRate: 0,
      openingStock: 15,
      currentStock: 4, // Low stock demo!
      minimumStock: 8,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `demo_prod_5_${businessId}`,
      businessId,
      ownerUid,
      name: 'Surf Excel Quick Wash Detergent 2kg',
      sku: 'SURF-2KG',
      barcode: '890123456005',
      hsn: '3402',
      category: 'Home Care',
      unit: 'PKT',
      purchasePrice: 310,
      sellingPrice: 375,
      gstRate: 18,
      openingStock: 20,
      currentStock: 32,
      minimumStock: 6,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const prod of demoProducts) {
    await saveProduct(prod);
  }

  // 3 Customers
  const demoCustomers: Customer[] = [
    {
      id: `demo_cust_1_${businessId}`,
      businessId,
      ownerUid,
      name: 'Sharma General Stores',
      phone: '9820011223',
      whatsappNumber: '9820011223',
      address: 'Shop 4, MG Road, Mumbai',
      gstin: '27AABCU9603R1ZM',
      state: 'Maharashtra',
      openingBalance: 1200,
      currentBalance: 3450,
      creditLimit: 25000,
      notes: 'Reliable weekly customer',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `demo_cust_2_${businessId}`,
      businessId,
      ownerUid,
      name: 'Kisan Kirana Corner',
      phone: '9876543210',
      whatsappNumber: '9876543210',
      address: 'Near Gandhi Chowk, Pune',
      gstin: '27AACCK1234F1Z8',
      state: 'Maharashtra',
      openingBalance: 0,
      currentBalance: 1580,
      creditLimit: 15000,
      notes: 'Cash & UPI frequent buyer',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `demo_cust_3_${businessId}`,
      businessId,
      ownerUid,
      name: 'Verma Supermarket',
      phone: '9123456789',
      whatsappNumber: '9123456789',
      address: 'Plot 12, Sector 17, Vashi',
      gstin: '27AABCV8976K1ZY',
      state: 'Maharashtra',
      openingBalance: 500,
      currentBalance: 0,
      creditLimit: 50000,
      notes: 'Prompt payment within 3 days',
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const cust of demoCustomers) {
    await saveCustomer(cust);
  }

  // 3 Suppliers
  const demoSuppliers: Supplier[] = [
    {
      id: `demo_sup_1_${businessId}`,
      businessId,
      ownerUid,
      name: 'Gupta Wholesale Distributors',
      phone: '9892012345',
      address: 'Gala 15, APMC Market, Navi Mumbai',
      gstin: '27AADCG4567H1ZQ',
      state: 'Maharashtra',
      openingBalance: 5000,
      currentBalance: 12400,
      notes: 'Main grains and staples supplier',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `demo_sup_2_${businessId}`,
      businessId,
      ownerUid,
      name: 'Hindustan Fast Moving Goods Agency',
      phone: '9819988776',
      address: 'Andheri East Industrial Estate, Mumbai',
      gstin: '27AAACH1987M1Z3',
      state: 'Maharashtra',
      openingBalance: 0,
      currentBalance: 6500,
      notes: 'FMCG & cleaning supplies supplier',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `demo_sup_3_${businessId}`,
      businessId,
      ownerUid,
      name: 'Surat Edible Oils Depot',
      phone: '9825099881',
      address: 'Ring Road, Surat, Gujarat',
      gstin: '24AABCS4321D1ZT',
      state: 'Gujarat',
      openingBalance: 0,
      currentBalance: 0,
      notes: 'Interstate edible oil supplier (IGST)',
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const sup of demoSuppliers) {
    await saveSupplier(sup);
  }

  // 2 Demo Purchases
  const demoPurchases: Purchase[] = [
    {
      id: `demo_pur_1_${businessId}`,
      businessId,
      ownerUid,
      supplierId: demoSuppliers[0].id,
      supplierName: demoSuppliers[0].name,
      supplierGSTIN: demoSuppliers[0].gstin,
      supplierPhone: demoSuppliers[0].phone,
      invoiceNumber: 'GWD-2026-904',
      invoiceDate: todayStr,
      items: [
        {
          productId: demoProducts[0].id,
          productName: demoProducts[0].name,
          hsn: '1006',
          quantity: 20,
          unit: 'BAG',
          purchaseRate: 420,
          discount: 0,
          taxableAmount: 8400,
          gstRate: 5,
          cgst: 210,
          sgst: 210,
          igst: 0,
          lineTotal: 8820,
        },
      ],
      subtotal: 8400,
      totalDiscount: 0,
      taxableTotal: 8400,
      isInterstate: false,
      totalCGST: 210,
      totalSGST: 210,
      totalIGST: 0,
      totalTax: 420,
      grandTotal: 8820,
      paidAmount: 5000,
      balanceDue: 3820,
      paymentStatus: 'PARTIAL',
      paymentMethod: 'UPI',
      notes: 'Delivered via tempo',
      needsVerification: false,
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 2 Demo Sales
  const demoSales: Sale[] = [
    {
      id: `demo_sale_1_${businessId}`,
      businessId,
      ownerUid,
      invoiceNumber: 'INV-000001',
      customerId: demoCustomers[0].id,
      customerName: demoCustomers[0].name,
      customerPhone: demoCustomers[0].phone,
      customerAddress: demoCustomers[0].address,
      customerGSTIN: demoCustomers[0].gstin,
      invoiceDate: todayStr,
      items: [
        {
          productId: demoProducts[0].id,
          productName: demoProducts[0].name,
          hsn: '1006',
          quantity: 2,
          unit: 'BAG',
          sellingRate: 510,
          discount: 20,
          taxableAmount: 1000,
          gstRate: 5,
          cgst: 25,
          sgst: 25,
          igst: 0,
          lineTotal: 1050,
        },
        {
          productId: demoProducts[1].id,
          productName: demoProducts[1].name,
          hsn: '2501',
          quantity: 5,
          unit: 'PKT',
          sellingRate: 28,
          discount: 0,
          taxableAmount: 140,
          gstRate: 5,
          cgst: 3.5,
          sgst: 3.5,
          igst: 0,
          lineTotal: 147,
        },
      ],
      isInterstate: false,
      subtotal: 1160,
      totalDiscount: 20,
      taxableTotal: 1140,
      totalCGST: 28.5,
      totalSGST: 28.5,
      totalIGST: 0,
      totalTax: 57,
      roundOff: 0,
      grandTotal: 1197,
      paidAmount: 1197,
      balanceDue: 0,
      paymentStatus: 'PAID',
      paymentMethod: 'UPI',
      notes: 'Counter delivery',
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  saveToLocalCache(`products_${businessId}`, demoProducts);
  saveToLocalCache(`customers_${businessId}`, demoCustomers);
  saveToLocalCache(`suppliers_${businessId}`, demoSuppliers);
  saveToLocalCache(`purchases_${businessId}`, demoPurchases);
  saveToLocalCache(`sales_${businessId}`, demoSales);

  if (!isCloudActive(ownerUid)) {
    return;
  }

  for (const prod of demoProducts) {
    await saveProduct(prod);
  }
  for (const cust of demoCustomers) {
    await saveCustomer(cust);
  }
  for (const sup of demoSuppliers) {
    await saveSupplier(sup);
  }
  for (const pur of demoPurchases) {
    try {
      await setDoc(doc(db, 'purchases', pur.id), cleanFirestoreData(pur));
    } catch (e) {
      console.warn('Seed purchase error:', e);
    }
  }
  for (const s of demoSales) {
    try {
      await setDoc(doc(db, 'sales', s.id), cleanFirestoreData(s));
    } catch (e) {
      console.warn('Seed sale error:', e);
    }
  }
}

export async function purgeDemoData(businessId: string, ownerUid: string): Promise<void> {
  // Clear local caches
  saveToLocalCache(`products_${businessId}`, []);
  saveToLocalCache(`customers_${businessId}`, []);
  saveToLocalCache(`suppliers_${businessId}`, []);
  saveToLocalCache(`purchases_${businessId}`, []);
  saveToLocalCache(`sales_${businessId}`, []);
  saveToLocalCache(`payments_${businessId}`, []);
  saveToLocalCache(`movements_${businessId}`, []);

  if (!isCloudActive(ownerUid)) {
    return;
  }

  // Delete all items where isDemo === true or id contains "demo_"
  const colls = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'payments', 'stockMovements'];
  for (const colName of colls) {
    try {
      const q = query(
        collection(db, colName),
        where('ownerUid', '==', ownerUid),
        where('businessId', '==', businessId)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        if (d.id.startsWith('demo_') || d.data().isDemo === true) {
          await deleteDoc(d.ref);
        }
      }
    } catch (e) {
      console.warn(`Error purging demo from ${colName}:`, e);
    }
  }
}

// -------------------------------------------------------------
// QUOTATIONS (VENDOR & CUSTOMER)
// -------------------------------------------------------------
export async function getQuotations(businessId: string, ownerUid: string): Promise<Quotation[]> {
  const cached = getFromLocalCache<Quotation[]>(`quotations_${businessId}`) || [];
  if (!isCloudActive(ownerUid)) {
    return cached;
  }

  const path = 'quotations';
  try {
    const q = query(
      collection(db, path),
      where('ownerUid', '==', ownerUid),
      where('businessId', '==', businessId)
    );
    const snap = await getDocs(q);
    const quotations: Quotation[] = [];
    snap.forEach((d) => quotations.push(d.data() as Quotation));
    quotations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    saveToLocalCache(`quotations_${businessId}`, quotations);
    return quotations;
  } catch (err) {
    if (cached.length > 0) return cached;
    console.warn('Firestore getQuotations error, using cached:', err);
    return cached;
  }
}

export async function saveQuotation(quotation: Quotation): Promise<void> {
  updateLocalList<Quotation>(`quotations_${quotation.businessId}`, quotation);

  if (!isCloudActive(quotation.ownerUid)) {
    return;
  }

  const path = `quotations/${quotation.id}`;
  try {
    await setDoc(doc(db, path), cleanFirestoreData(quotation), { merge: true });
  } catch (err) {
    console.error('Firestore saveQuotation error:', err);
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteQuotation(quotationId: string, businessId: string, ownerUid: string): Promise<void> {
  removeFromLocalList<Quotation>(`quotations_${businessId}`, quotationId);

  if (!isCloudActive(ownerUid)) {
    return;
  }

  const path = `quotations/${quotationId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (err) {
    console.error('Firestore deleteQuotation error:', err);
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

