import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  FileText,
  Filter,
} from 'lucide-react';
import { Sale, Purchase, Product, Customer, Supplier, Payment, Business } from '../../types';
import { formatCurrency, round2 } from '../../utils/calculations';

interface ReportsViewProps {
  sales: Sale[];
  purchases: Purchase[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  payments: Payment[];
  business: Business | null;
}

type ReportType =
  | 'gst'
  | 'sales'
  | 'purchases'
  | 'stock'
  | 'profit'
  | 'receivables'
  | 'payables'
  | 'payments';

export const ReportsView: React.FC<ReportsViewProps> = ({
  sales,
  purchases,
  products,
  customers,
  suppliers,
  payments,
  business,
}) => {
  const [reportType, setReportType] = useState<ReportType>('gst');
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year' | 'all'>('month');

  // Filter calculations based on period
  const reportData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const parseDate = (dStr: string) => {
      if (dStr.includes('/')) {
        const [d, m, y] = dStr.split('/').map(Number);
        return new Date(y, m - 1, d);
      }
      return new Date(dStr);
    };

    const inPeriod = (dStr: string) => {
      const dt = parseDate(dStr);
      if (isNaN(dt.getTime())) return true;

      if (selectedPeriod === 'month') {
        return dt.getFullYear() === currentYear && dt.getMonth() === currentMonth;
      }
      if (selectedPeriod === 'quarter') {
        const threeMonthsAgo = new Date(currentYear, currentMonth - 3, 1);
        return dt >= threeMonthsAgo;
      }
      if (selectedPeriod === 'year') {
        return dt.getFullYear() === currentYear;
      }
      return true;
    };

    const fSales = sales.filter((s) => inPeriod(s.invoiceDate));
    const fPurchases = purchases.filter((p) => inPeriod(p.invoiceDate));
    const fPayments = payments.filter((p) => inPeriod(p.date));

    // GST Summary numbers
    const totalTaxableSales = round2(fSales.reduce((sum, s) => sum + s.taxableTotal, 0));
    const outputCGST = round2(fSales.reduce((sum, s) => sum + s.totalCGST, 0));
    const outputSGST = round2(fSales.reduce((sum, s) => sum + s.totalSGST, 0));
    const outputIGST = round2(fSales.reduce((sum, s) => sum + s.totalIGST, 0));
    const totalOutputTax = round2(outputCGST + outputSGST + outputIGST);

    const totalTaxablePurchases = round2(fPurchases.reduce((sum, p) => sum + p.taxableTotal, 0));
    const inputCGST = round2(fPurchases.reduce((sum, p) => sum + p.totalCGST, 0));
    const inputSGST = round2(fPurchases.reduce((sum, p) => sum + p.totalSGST, 0));
    const inputIGST = round2(fPurchases.reduce((sum, p) => sum + p.totalIGST, 0));
    const totalInputTax = round2(inputCGST + inputSGST + inputIGST);

    const netTaxPayable = round2(totalOutputTax - totalInputTax);

    // Stock value
    const totalStockVal = round2(
      products.reduce((sum, p) => sum + p.currentStock * (p.purchasePrice || p.sellingPrice), 0)
    );
    const lowStockItems = products.filter((p) => p.currentStock <= p.minimumStock);

    // Receivables & Payables
    const totalReceivables = round2(customers.reduce((sum, c) => sum + c.currentBalance, 0));
    const totalPayables = round2(suppliers.reduce((sum, s) => sum + s.currentBalance, 0));

    return {
      filteredSales: fSales,
      filteredPurchases: fPurchases,
      filteredPayments: fPayments,
      totalTaxableSales,
      outputCGST,
      outputSGST,
      outputIGST,
      totalOutputTax,
      totalTaxablePurchases,
      inputCGST,
      inputSGST,
      inputIGST,
      totalInputTax,
      netTaxPayable,
      totalStockVal,
      lowStockItems,
      totalReceivables,
      totalPayables,
    };
  }, [sales, purchases, payments, products, customers, suppliers, selectedPeriod]);

  // Export to CSV helper
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    let filename = 'report.csv';

    if (reportType === 'sales') {
      csvContent += 'Invoice Number,Customer Name,Date,Taxable Total,CGST,SGST,IGST,Grand Total,Status\n';
      reportData.filteredSales.forEach((s) => {
        csvContent += `"${s.invoiceNumber}","${s.customerName}","${s.invoiceDate}",${s.taxableTotal},${s.totalCGST},${s.totalSGST},${s.totalIGST},${s.grandTotal},"${s.paymentStatus}"\n`;
      });
      filename = `sales_report_${selectedPeriod}.csv`;
    } else if (reportType === 'purchases') {
      csvContent += 'Invoice Number,Supplier Name,Date,Taxable Total,CGST,SGST,IGST,Grand Total,Status\n';
      reportData.filteredPurchases.forEach((p) => {
        csvContent += `"${p.invoiceNumber}","${p.supplierName}","${p.invoiceDate}",${p.taxableTotal},${p.totalCGST},${p.totalSGST},${p.totalIGST},${p.grandTotal},"${p.paymentStatus}"\n`;
      });
      filename = `purchase_report_${selectedPeriod}.csv`;
    } else if (reportType === 'stock') {
      csvContent += 'Product Name,SKU,HSN,Unit,Purchase Price,Selling Price,Current Stock,Stock Value,Low Stock Alert\n';
      products.forEach((p) => {
        const val = p.currentStock * p.purchasePrice;
        csvContent += `"${p.name}","${p.sku || ''}","${p.hsn || ''}","${p.unit}",${p.purchasePrice},${p.sellingPrice},${p.currentStock},${val},${p.currentStock <= p.minimumStock ? 'YES' : 'NO'}\n`;
      });
      filename = 'inventory_stock_valuation.csv';
    } else {
      // GST Summary CSV
      csvContent += 'Category,Taxable Amount,CGST,SGST,IGST,Total Tax\n';
      csvContent += `Sales (Output Tax),${reportData.totalTaxableSales},${reportData.outputCGST},${reportData.outputSGST},${reportData.outputIGST},${reportData.totalOutputTax}\n`;
      csvContent += `Purchases (Input Tax Credit),${reportData.totalTaxablePurchases},${reportData.inputCGST},${reportData.inputSGST},${reportData.inputIGST},${reportData.totalInputTax}\n`;
      csvContent += `Net GST Balance,${reportData.totalTaxableSales - reportData.totalTaxablePurchases},,,,${reportData.netTaxPayable}\n`;
      filename = `gst_summary_${selectedPeriod}.csv`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-24 max-w-7xl mx-auto px-3.5 sm:px-6 pt-3">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span>Business Reports & GST Summary</span>
          </h2>
          <p className="text-xs text-slate-500">
            Exportable business summaries, tax breakdowns, and financial ledgers
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>EXPORT CSV REPORT</span>
        </button>
      </div>

      {/* Period Selector & Report Type Tabs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto">
          {(
            [
              { id: 'gst', label: 'GST Summary' },
              { id: 'sales', label: 'Sales Report' },
              { id: 'purchases', label: 'Purchases' },
              { id: 'stock', label: 'Stock Valuation' },
              { id: 'receivables', label: 'Receivables' },
              { id: 'payables', label: 'Payables' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setReportType(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                reportType === t.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 shrink-0 self-end md:self-auto">
          {(['month', 'quarter', 'year', 'all'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedPeriod(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                selectedPeriod === p ? 'bg-blue-100 text-blue-800 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {p === 'month' && 'This Month'}
              {p === 'quarter' && 'This Quarter'}
              {p === 'year' && 'This Year'}
              {p === 'all' && 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Report 1: GST SUMMARY VIEW */}
      {reportType === 'gst' && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              <span className="font-bold">GST Notice:</span> This report is calculated directly from your sales and purchase records as a business summary. It helps in preparing GSTR-1 and GSTR-3B filings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Output GST Box (Sales) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-sm text-slate-900">Output Tax (Sales Invoices)</h3>
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">
                  {reportData.filteredSales.length} Sales Bills
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Taxable Sales:</span>
                  <span className="font-bold font-mono text-slate-900">
                    {formatCurrency(reportData.totalTaxableSales)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Output CGST:</span>
                  <span className="font-mono">{formatCurrency(reportData.outputCGST)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Output SGST:</span>
                  <span className="font-mono">{formatCurrency(reportData.outputSGST)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Output IGST:</span>
                  <span className="font-mono">{formatCurrency(reportData.outputIGST)}</span>
                </div>
                <div className="pt-2 border-t flex justify-between font-black text-sm text-emerald-700">
                  <span>Total Output Tax Collected:</span>
                  <span className="font-mono">{formatCurrency(reportData.totalOutputTax)}</span>
                </div>
              </div>
            </div>

            {/* Input Tax Credit Box (Purchases) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-sm text-slate-900">Input Tax Credit (ITC - Purchases)</h3>
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
                  {reportData.filteredPurchases.length} Purchase Bills
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Taxable Purchases:</span>
                  <span className="font-bold font-mono text-slate-900">
                    {formatCurrency(reportData.totalTaxablePurchases)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Input CGST:</span>
                  <span className="font-mono">{formatCurrency(reportData.inputCGST)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Input SGST:</span>
                  <span className="font-mono">{formatCurrency(reportData.inputSGST)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Input IGST:</span>
                  <span className="font-mono">{formatCurrency(reportData.inputIGST)}</span>
                </div>
                <div className="pt-2 border-t flex justify-between font-black text-sm text-blue-700">
                  <span>Total Input Tax Credit (ITC):</span>
                  <span className="font-mono">{formatCurrency(reportData.totalInputTax)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net GST Balance Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Net GST Liability Estimate</span>
              <p className="text-xs text-slate-300 mt-0.5">
                Output Tax ({formatCurrency(reportData.totalOutputTax)}) minus Input Tax Credit ({formatCurrency(reportData.totalInputTax)})
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-emerald-400">
                {formatCurrency(reportData.netTaxPayable)}
              </span>
              <p className="text-[11px] text-slate-400">
                {reportData.netTaxPayable >= 0 ? 'Estimated Tax Payable' : 'ITC Surplus Carry-Forward'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Report 2: STOCK VALUATION */}
      {reportType === 'stock' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-3 gap-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Current Stock Inventory Valuation</h3>
              <p className="text-xs text-slate-500">Valued at latest purchase rates</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400">Total Stock Value:</span>
              <span className="text-lg font-black text-emerald-600 ml-2 font-mono">
                {formatCurrency(reportData.totalStockVal)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                <tr>
                  <th className="p-2.5">Product</th>
                  <th className="p-2.5">Stock</th>
                  <th className="p-2.5">Cost Rate</th>
                  <th className="p-2.5">Selling Rate</th>
                  <th className="p-2.5 text-right">Inventory Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const val = p.currentStock * p.purchasePrice;
                  return (
                    <tr key={p.id}>
                      <td className="p-2.5 font-bold text-slate-800">{p.name}</td>
                      <td className="p-2.5">
                        <span className={p.currentStock <= p.minimumStock ? 'text-rose-600 font-bold' : ''}>
                          {p.currentStock} {p.unit}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono">{formatCurrency(p.purchasePrice)}</td>
                      <td className="p-2.5 font-mono">{formatCurrency(p.sellingPrice)}</td>
                      <td className="p-2.5 font-mono font-bold text-slate-900 text-right">
                        {formatCurrency(val)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 3: RECEIVABLES */}
      {reportType === 'receivables' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Customer Receivables & Outstanding</h3>
              <p className="text-xs text-slate-500">Amounts owed by customers to your business</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400">Total Pending:</span>
              <span className="text-lg font-black text-amber-700 ml-2 font-mono">
                {formatCurrency(reportData.totalReceivables)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                <tr>
                  <th className="p-2.5">Customer</th>
                  <th className="p-2.5">Phone</th>
                  <th className="p-2.5 text-right">Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers
                  .filter((c) => c.currentBalance > 0)
                  .map((c) => (
                    <tr key={c.id}>
                      <td className="p-2.5 font-bold text-slate-800">{c.name}</td>
                      <td className="p-2.5 text-slate-500">{c.phone || '-'}</td>
                      <td className="p-2.5 font-bold text-amber-700 font-mono text-right">
                        {formatCurrency(c.currentBalance)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 4: PAYABLES */}
      {reportType === 'payables' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Supplier Payables</h3>
              <p className="text-xs text-slate-500">Amounts owed to suppliers for purchases</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400">Total Payable:</span>
              <span className="text-lg font-black text-rose-600 ml-2 font-mono">
                {formatCurrency(reportData.totalPayables)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                <tr>
                  <th className="p-2.5">Supplier</th>
                  <th className="p-2.5">Phone</th>
                  <th className="p-2.5 text-right">Payable Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers
                  .filter((s) => s.currentBalance > 0)
                  .map((s) => (
                    <tr key={s.id}>
                      <td className="p-2.5 font-bold text-slate-800">{s.name}</td>
                      <td className="p-2.5 text-slate-500">{s.phone || '-'}</td>
                      <td className="p-2.5 font-bold text-rose-600 font-mono text-right">
                        {formatCurrency(s.currentBalance)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 5: SALES INVOICES LIST */}
      {reportType === 'sales' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-bold text-sm text-slate-900">Sales Invoices for Selected Period</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                <tr>
                  <th className="p-2.5">Invoice #</th>
                  <th className="p-2.5">Customer</th>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5 text-right">Taxable</th>
                  <th className="p-2.5 text-right">Tax</th>
                  <th className="p-2.5 text-right">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.filteredSales.map((s) => (
                  <tr key={s.id}>
                    <td className="p-2.5 font-mono font-bold text-slate-900">{s.invoiceNumber}</td>
                    <td className="p-2.5">{s.customerName}</td>
                    <td className="p-2.5 text-slate-500">{s.invoiceDate}</td>
                    <td className="p-2.5 font-mono text-right">{formatCurrency(s.taxableTotal)}</td>
                    <td className="p-2.5 font-mono text-right">{formatCurrency(s.totalTax)}</td>
                    <td className="p-2.5 font-mono font-bold text-emerald-700 text-right">
                      {formatCurrency(s.grandTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 6: PURCHASES LIST */}
      {reportType === 'purchases' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-bold text-sm text-slate-900">Purchase Bills for Selected Period</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                <tr>
                  <th className="p-2.5">Bill #</th>
                  <th className="p-2.5">Supplier</th>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5 text-right">Taxable</th>
                  <th className="p-2.5 text-right">Tax</th>
                  <th className="p-2.5 text-right">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.filteredPurchases.map((p) => (
                  <tr key={p.id}>
                    <td className="p-2.5 font-mono font-bold text-slate-900">{p.invoiceNumber}</td>
                    <td className="p-2.5">{p.supplierName}</td>
                    <td className="p-2.5 text-slate-500">{p.invoiceDate}</td>
                    <td className="p-2.5 font-mono text-right">{formatCurrency(p.taxableTotal)}</td>
                    <td className="p-2.5 font-mono text-right">{formatCurrency(p.totalTax)}</td>
                    <td className="p-2.5 font-mono font-bold text-blue-700 text-right">
                      {formatCurrency(p.grandTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
