import React, { useState, useMemo } from 'react';
import { Product, Supplier, Purchase } from '../../types';
import { Tag, Search, TrendingDown, Building2, ShoppingBag, Filter, ShieldCheck, Columns3, ListOrdered, Download, Printer } from 'lucide-react';

interface VendorPriceListViewProps {
  products: Product[];
  suppliers: Supplier[];
  purchases: Purchase[];
  onNavigateToPurchases?: () => void;
}

interface ItemVendorRate {
  productId?: string;
  productName: string;
  hsn?: string | null;
  unit: string;
  supplierId: string;
  supplierName: string;
  lastRate: number;
  lastQuantity: number;
  lastDate: string;
  invoiceNumber: string;
}

export const VendorPriceListView: React.FC<VendorPriceListViewProps> = ({
  products,
  suppliers,
  purchases,
  onNavigateToPurchases,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('ALL');
  const [displayMode, setDisplayMode] = useState<'current' | 'history'>('current');

  // Aggregate item-wise rates across all purchases
  const itemVendorRates = useMemo(() => {
    const map = new Map<string, ItemVendorRate[]>(); // key: normalized product name

    for (const pur of purchases) {
      const supName = pur.supplierName || 'Unknown Vendor';
      const supId = pur.supplierId || 'unknown';
      const date = pur.invoiceDate || pur.createdAt.split('T')[0];
      const invNo = pur.invoiceNumber || 'N/A';

      if (Array.isArray(pur.items)) {
        for (const item of pur.items) {
          const pName = (item.productName || 'Unnamed Item').trim();
          const key = pName.toLowerCase();
          const rate = Number(item.purchaseRate) || 0;
          if (rate <= 0) continue;

          if (!map.has(key)) {
            map.set(key, []);
          }

          const list = map.get(key)!;
          const existingIdx = list.findIndex((x) => x.supplierId === supId);
          if (existingIdx >= 0) {
            if (date >= list[existingIdx].lastDate) {
              list[existingIdx] = {
                productId: item.productId,
                productName: pName,
                hsn: item.hsn,
                unit: item.unit || 'PCS',
                supplierId: supId,
                supplierName: supName,
                lastRate: rate,
                lastQuantity: item.quantity,
                lastDate: date,
                invoiceNumber: invNo,
              };
            }
          } else {
            list.push({
              productId: item.productId,
              productName: pName,
              hsn: item.hsn,
              unit: item.unit || 'PCS',
              supplierId: supId,
              supplierName: supName,
              lastRate: rate,
              lastQuantity: item.quantity,
              lastDate: date,
              invoiceNumber: invNo,
            });
          }
        }
      }
    }

    const result: Array<{
      productName: string;
      hsn?: string | null;
      unit: string;
      rates: ItemVendorRate[];
      lowestRate: number;
      highestRate: number;
    }> = [];

    map.forEach((rates, key) => {
      if (rates.length === 0) return;
      const validRates = rates.map((r) => r.lastRate);
      const lowest = Math.min(...validRates);
      const highest = Math.max(...validRates);

      result.push({
        productName: rates[0].productName,
        hsn: rates[0].hsn,
        unit: rates[0].unit,
        rates: rates.sort((a, b) => a.lastRate - b.lastRate),
        lowestRate: lowest,
        highestRate: highest,
      });
    });

    return result.sort((a, b) => a.productName.localeCompare(b.productName));
  }, [purchases]);

  // Unique list of active vendor names from the item rates or suppliers list
  const activeVendors = useMemo(() => {
    const vSet = new Set<string>();
    itemVendorRates.forEach((item) => {
      item.rates.forEach((r) => vSet.add(r.supplierName));
    });
    return Array.from(vSet).sort();
  }, [itemVendorRates]);

  const filteredItems = useMemo(() => {
    return itemVendorRates.filter((item) => {
      const matchesSearch =
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.rates.some((r) => r.supplierName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.hsn && item.hsn.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSupplier =
        selectedSupplierFilter === 'ALL' ||
        item.rates.some((r) => r.supplierId === selectedSupplierFilter);

      return matchesSearch && matchesSupplier;
    });
  }, [itemVendorRates, searchQuery, selectedSupplierFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Product Name,HSN Code,Unit,Vendor Name,Purchase Rate (INR),Last Qty,Invoice Number,Last Date,Lowest Rate Flag\n';

    filteredItems.forEach((item) => {
      item.rates.forEach((r, idx) => {
        const isLowest = idx === 0 ? 'YES' : 'NO';
        csvContent += `"${item.productName}","${item.hsn || ''}","${item.unit}","${r.supplierName}",${r.lastRate},${r.lastQuantity},"${r.invoiceNumber}","${r.lastDate}","${isLowest}"\n`;
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vendor_price_list_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print / PDF export
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 pb-24 space-y-5 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-purple-100 font-semibold text-xs mb-2">
            <Tag className="w-3.5 h-3.5" />
            <span>Vendor Price Comparison</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Item-Wise Vendor Price List</h2>
          <p className="text-purple-100 text-xs sm:text-sm mt-1 max-w-xl">
            Compare purchase rates across different vendors. Export or print price lists easily.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl backdrop-blur-md transition-all flex items-center gap-1.5 border border-white/20"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl backdrop-blur-md transition-all flex items-center gap-1.5 border border-white/20"
            title="Print or Save as PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>
          {onNavigateToPurchases && (
            <button
              type="button"
              onClick={onNavigateToPurchases}
              className="px-4 py-2.5 bg-white text-purple-900 hover:bg-purple-50 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <ShoppingBag className="w-4 h-4 text-purple-700" />
              <span>Purchase Bills</span>
            </button>
          )}
        </div>
      </div>

      {/* Controls Bar: Search, Supplier Filter & Toggle */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name, HSN code, or vendor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Supplier Filter */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedSupplierFilter}
              onChange={(e) => setSelectedSupplierFilter(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-slate-800 font-semibold cursor-pointer"
            >
              <option value="ALL">All Vendors ({suppliers.length})</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle between Current Prices and Comparative History */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setDisplayMode('current')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                displayMode === 'current'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Current Prices</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                displayMode === 'history'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Comparative History</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-4 text-2xl">
            🏷️
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">No Vendor Price Records Found</h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto mb-5">
            {purchases.length === 0
              ? 'No purchase bills have been recorded yet. Scan or add purchase bills to automatically build your item-wise vendor price list.'
              : 'No items match your current search query or vendor filter.'}
          </p>
          {purchases.length === 0 && onNavigateToPurchases && (
            <button
              type="button"
              onClick={onNavigateToPurchases}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all"
            >
              Add First Purchase Bill
            </button>
          )}
        </div>
      ) : displayMode === 'current' ? (
        // Current Prices Mode (Cards with supplier breakdown)
        <div className="grid grid-cols-1 gap-4">
          {filteredItems.map((item, idx) => {
            const bestVendor = item.rates[0];
            const hasMultipleVendors = item.rates.length > 1;

            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden"
              >
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm shrink-0">
                      📦
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{item.productName}</h3>
                        {item.hsn && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-200 text-slate-700">
                            HSN: {item.hsn}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Unit: <strong className="text-slate-700">{item.unit}</strong> • Supplied by{' '}
                        <strong className="text-purple-700">{item.rates.length}</strong> vendor(s)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                    <TrendingDown className="w-4 h-4 text-emerald-600" />
                    <div>
                      <p className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">Best Rate</p>
                      <p className="text-xs font-black text-emerald-800">
                        ₹{bestVendor.lastRate.toFixed(2)} <span className="font-normal text-[10px]">by {bestVendor.supplierName}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100 uppercase font-semibold text-[10px] tracking-wider">
                        <th className="pb-2.5 font-semibold">Vendor Name</th>
                        <th className="pb-2.5 font-semibold">Purchase Rate</th>
                        <th className="pb-2.5 font-semibold">Last Qty</th>
                        <th className="pb-2.5 font-semibold">Invoice No</th>
                        <th className="pb-2.5 font-semibold">Last Purchased Date</th>
                        <th className="pb-2.5 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {item.rates.map((rateEntry, rIdx) => {
                        const isCheapest = rIdx === 0 && hasMultipleVendors;
                        return (
                          <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 font-semibold text-slate-800 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>{rateEntry.supplierName}</span>
                              {isCheapest && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                  <ShieldCheck className="w-3 h-3" /> Cheapest
                                </span>
                              )}
                            </td>
                            <td className="py-3 font-extrabold text-purple-700">
                              ₹{rateEntry.lastRate.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">/ {item.unit}</span>
                            </td>
                            <td className="py-3 text-slate-600 font-medium">
                              {rateEntry.lastQuantity} {item.unit}
                            </td>
                            <td className="py-3 font-mono text-slate-600 text-[11px]">
                              {rateEntry.invoiceNumber}
                            </td>
                            <td className="py-3 text-slate-500 text-[11px]">
                              {rateEntry.lastDate}
                            </td>
                            <td className="py-3 text-right">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  rIdx === 0
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {rIdx === 0 ? 'Lowest' : `+₹{(rateEntry.lastRate - item.lowestRate).toFixed(2)}`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Comparative History Mode (Side-by-Side Matrix Table across Vendors)
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Side-by-Side Vendor Price Matrix</h3>
              <p className="text-xs text-slate-500">Compare how different suppliers charge for the exact same products side-by-side.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-3.5">Product Name</th>
                  <th className="p-3.5">Unit</th>
                  {activeVendors.map((vendorName, vIdx) => (
                    <th key={vIdx} className="p-3.5 text-center border-l border-slate-200">
                      {vendorName}
                    </th>
                  ))}
                  <th className="p-3.5 text-right border-l border-slate-200">Lowest Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.map((item, idx) => {
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">
                        {item.productName}
                        {item.hsn && (
                          <span className="block text-[10px] font-mono text-slate-400 font-normal">
                            HSN: {item.hsn}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">{item.unit}</td>
                      {activeVendors.map((vendorName, vIdx) => {
                        const foundRate = item.rates.find((r) => r.supplierName === vendorName);
                        const isLowest = foundRate && foundRate.lastRate === item.lowestRate;

                        return (
                          <td
                            key={vIdx}
                            className={`p-3.5 text-center border-l border-slate-200 ${
                              isLowest ? 'bg-emerald-50/60 font-black text-emerald-800' : 'text-slate-700 font-medium'
                            }`}
                          >
                            {foundRate ? (
                              <div>
                                <span className={isLowest ? 'text-emerald-700 text-sm' : 'text-slate-800 font-semibold'}>
                                  ₹{foundRate.lastRate.toFixed(2)}
                                </span>
                                <span className="block text-[9px] text-slate-400">{foundRate.lastDate}</span>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-3.5 text-right border-l border-slate-200 font-black text-emerald-700 bg-emerald-50/20">
                        ₹{item.lowestRate.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
