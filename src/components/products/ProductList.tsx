import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  History,
  Edit2,
  Trash2,
  X,
  Tag,
  Barcode,
} from 'lucide-react';
import { Product, StockMovement, Business } from '../../types';
import { formatCurrency, round2 } from '../../utils/calculations';

interface ProductListProps {
  products: Product[];
  stockMovements: StockMovement[];
  business: Business | null;
  ownerUid: string;
  onSaveProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onScanPurchaseBill: () => void;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  stockMovements,
  business,
  ownerUid,
  onSaveProduct,
  onDeleteProduct,
  onScanPurchaseBill,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Edit / Add Modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Detail / Movement ledger modal state
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const minThreshold = business?.lowStockThreshold ?? 5;

    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.hsn && p.hsn.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filterCategory !== 'all' && p.category !== filterCategory) return false;

      if (showLowStockOnly) {
        const threshold = p.minimumStock !== undefined ? p.minimumStock : minThreshold;
        if (p.currentStock > threshold) return false;
      }

      return true;
    });
  }, [products, searchQuery, filterCategory, showLowStockOnly, business]);

  // Product Movements for viewing detail
  const productMovements = useMemo(() => {
    if (!viewingProduct) return [];
    return stockMovements
      .filter((m) => m.productId === viewingProduct.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [viewingProduct, stockMovements]);

  const handleOpenAdd = () => {
    setEditingProduct({
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      businessId: business?.id || `biz_${ownerUid}`,
      ownerUid,
      name: '',
      sku: '',
      barcode: '',
      hsn: '',
      category: '',
      unit: 'PCS',
      purchasePrice: 0,
      sellingPrice: 0,
      gstRate: business?.defaultGstRate || 18,
      openingStock: 0,
      currentStock: 0,
      minimumStock: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name.trim()) return;

    try {
      await onSaveProduct({
        ...editingProduct,
        name: editingProduct.name.trim(),
        purchasePrice: Number(editingProduct.purchasePrice) || 0,
        sellingPrice: Number(editingProduct.sellingPrice) || 0,
        currentStock: Number(editingProduct.currentStock) || 0,
        minimumStock: Number(editingProduct.minimumStock) || 0,
        updatedAt: new Date().toISOString(),
      });
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (err) {
      console.error('Save product error:', err);
      alert('Failed to save product.');
    }
  };

  const handleDelete = async (e: React.MouseEvent, prod: Product) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${prod.name}"?`)) return;
    try {
      await onDeleteProduct(prod.id);
      if (viewingProduct?.id === prod.id) setViewingProduct(null);
    } catch (err) {
      console.error('Delete product error:', err);
      alert('Failed to delete product.');
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-7xl mx-auto px-3.5 sm:px-6 pt-3">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-blue-600" />
            <span>Products & Stock Inventory</span>
          </h2>
          <p className="text-xs text-slate-500">
            {products.length} products • Real-time stock audit ledger & reorder alerts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onScanPurchaseBill}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-bold text-xs"
          >
            <span>Scan Bill to Restock</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>ADD PRODUCT</span>
          </button>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search product name, SKU, barcode, HSN..."
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              showLowStockOnly
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Only</span>
          </button>

          {categories.length > 0 && (
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Boxes className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No products found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery
              ? `No items match "${searchQuery}".`
              : 'Add your first product or scan a purchase bill to auto-populate inventory.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Product</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProducts.map((prod) => {
            const isLow = prod.currentStock <= prod.minimumStock;
            return (
              <div
                key={prod.id}
                onClick={() => setViewingProduct(prod)}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:border-blue-400 cursor-pointer transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {prod.name}
                    </h4>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                        isLow
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {isLow ? 'LOW STOCK' : 'IN STOCK'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                    {prod.category && <span>{prod.category} • </span>}
                    {prod.hsn && <span>HSN: {prod.hsn} • </span>}
                    <span>GST: {prod.gstRate}%</span>
                  </div>
                </div>

                {/* Stock & Pricing */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Current Stock</span>
                    <p className={`font-black text-sm ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                      {prod.currentStock} <span className="font-normal text-xs text-slate-500">{prod.unit}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Selling Price</span>
                    <p className="font-black text-sm text-emerald-600 font-mono">
                      {formatCurrency(prod.sellingPrice)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>Cost: {formatCurrency(prod.purchasePrice)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProduct(prod);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                      title="Edit Product"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, prod)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingProduct.id.startsWith('prod_') && editingProduct.name === ''
                  ? 'Add New Product'
                  : 'Edit Product Details'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="e.g. Fortune Mustard Oil 1L"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={editingProduct.category || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    placeholder="e.g. Grocery"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Measurement Unit</label>
                  <select
                    value={editingProduct.unit}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none"
                  >
                    <option value="PCS">PCS</option>
                    <option value="KG">KG</option>
                    <option value="GM">GM</option>
                    <option value="LTR">LTR</option>
                    <option value="BOX">BOX</option>
                    <option value="PKT">PKT</option>
                    <option value="BAG">BAG</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Purchase Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.purchasePrice || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, purchasePrice: Number(e.target.value) })
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Selling Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={editingProduct.sellingPrice || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, sellingPrice: Number(e.target.value) })
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GST Rate %</label>
                  <select
                    value={editingProduct.gstRate}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, gstRate: Number(e.target.value) })
                    }
                    className="w-full px-2 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:outline-none"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={editingProduct.hsn || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, hsn: e.target.value })}
                    placeholder="e.g. 1512"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Current Stock</label>
                  <input
                    type="number"
                    step="any"
                    value={editingProduct.currentStock}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, currentStock: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Low Stock Alert At</label>
                  <input
                    type="number"
                    value={editingProduct.minimumStock}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, minimumStock: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Detail & Stock Audit Movement History Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">{viewingProduct.name}</h3>
                <p className="text-xs text-slate-400">
                  Stock Ledger & Audit Movement History
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Current Stock</span>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {viewingProduct.currentStock} {viewingProduct.unit}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Selling Price</span>
                  <p className="font-extrabold text-emerald-600 text-sm mt-0.5 font-mono">
                    {formatCurrency(viewingProduct.sellingPrice)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Last Purchase Price</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5 font-mono">
                    {formatCurrency(viewingProduct.purchasePrice)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">GST Rate</span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">
                    {viewingProduct.gstRate}%
                  </p>
                </div>
              </div>

              {/* Movement History */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>Stock Movement Audit Log ({productMovements.length})</span>
                </h4>

                {productMovements.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 border border-slate-200 rounded-xl bg-slate-50">
                    No transactions recorded for this item yet. Stock will update automatically when purchases or sales occur.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5">Ref #</th>
                          <th className="p-2.5 text-center">Change</th>
                          <th className="p-2.5 text-right">Balance Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {productMovements.map((mov) => (
                          <tr key={mov.id}>
                            <td className="p-2.5 text-slate-600">{mov.date}</td>
                            <td className="p-2.5 font-bold">
                              <span
                                className={`inline-block px-1.5 py-0.2 rounded text-[10px] ${
                                  mov.type === 'PURCHASE'
                                    ? 'bg-blue-100 text-blue-800'
                                    : mov.type === 'SALE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-800'
                                }`}
                              >
                                {mov.type}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                              {mov.referenceNumber || '-'}
                            </td>
                            <td
                              className={`p-2.5 text-center font-bold font-mono ${
                                mov.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-900 font-mono">
                              {mov.newStock} {viewingProduct.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
