import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Download,
  Calendar,
  Layers,
  Truck,
  RefreshCw,
  Percent,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { useToast } from '../components/Toast.tsx';
import { BatchProfitMarginSection } from '../components/BatchProfitMarginSection.tsx';
import { BatchProfitabilityReport } from '../types/index.ts';
import { exportInventoryReportToCSV } from '../utils/backupExporter.ts';

export const ReportsPage: React.FC = () => {
  const toast = useToast();
  const [activeReport, setActiveReport] = useState<'valuation' | 'sales' | 'purchases' | 'profit' | 'batch_profit'>('valuation');
  const [loading, setLoading] = useState(true);

  // Report Data States
  const [stockValuation, setStockValuation] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [purchasesData, setPurchasesData] = useState<any[]>([]);
  const [profitData, setProfitData] = useState<any>(null);
  const [batchProfitData, setBatchProfitData] = useState<BatchProfitabilityReport | null>(null);
  const [batchStatusFilter, setBatchStatusFilter] = useState<'completed' | 'all'>('completed');

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadCurrentReport = async () => {
    setLoading(true);
    try {
      if (activeReport === 'valuation') {
        const data = await api.getStockSummary();
        setStockValuation(data);
      } else if (activeReport === 'sales') {
        const data = await api.getSalesReport(startDate || undefined, endDate || undefined);
        setSalesData(data);
      } else if (activeReport === 'purchases') {
        const data = await api.getPurchasesReport();
        setPurchasesData(data);
      } else if (activeReport === 'profit') {
        const data = await api.getProfitReport(startDate || undefined, endDate || undefined);
        setProfitData(data);
      } else if (activeReport === 'batch_profit') {
        const data = await api.getBatchProfitabilityReport({
          status: batchStatusFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        setBatchProfitData(data);
      }
    } catch (err: any) {
      toast.error('Failed to load report data', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentReport();
  }, [activeReport, startDate, endDate, batchStatusFilter]);

  const handleBackupFullInventory = async () => {
    try {
      let data = stockValuation;
      if (data.length === 0) {
        data = await api.getStockSummary();
      }
      if (data.length === 0) {
        toast.warning('No Inventory Records', 'Inventory database is currently empty.');
        return;
      }
      exportInventoryReportToCSV(data, {
        scopeTitle: 'Master Inventory & Valuation Backup',
      });
      toast.success(
        'Inventory Report Backed Up',
        `Successfully exported ${data.length} product inventory lines with valuation to CSV.`
      );
    } catch (err: any) {
      toast.error('Backup Failed', err.message);
    }
  };

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = `report_${activeReport}_${new Date().toISOString().split('T')[0]}.csv`;

    if (activeReport === 'valuation') {
      if (stockValuation.length === 0) {
        toast.warning('Empty Report', 'No inventory valuation data to export.');
        return;
      }
      exportInventoryReportToCSV(stockValuation, {
        scopeTitle: 'Warehouse Inventory Valuation Snapshot',
      });
      toast.success('Inventory Backup Complete', 'Inventory report exported to CSV successfully.');
      return;
    } else if (activeReport === 'sales') {
      headers = ['Invoice #', 'Date', 'Customer', 'Items Count', 'Payment Method', 'Total Revenue ($)', 'Status'];
      rows = salesData.map((s) => [
        s.invoice_number,
        new Date(s.created_at).toISOString(),
        `"${(s.customer_name || 'Walk-in').replace(/"/g, '""')}"`,
        s.items_count,
        s.payment_method,
        s.total,
        s.status,
      ]);
    } else if (activeReport === 'purchases') {
      headers = ['Supplier Name', 'Batches Received', 'Total Units Received', 'Total Purchased Value ($)'];
      rows = purchasesData.map((p) => [
        `"${p.supplier_name.replace(/"/g, '""')}"`,
        p.batches_count,
        p.total_units_received,
        p.total_purchased_value,
      ]);
    } else if (activeReport === 'profit' && profitData) {
      headers = ['Product Name', 'SKU', 'Units Sold', 'Total Revenue ($)', 'FIFO COGS ($)', 'Gross Profit ($)', 'Margin (%)'];
      rows = (profitData.items || []).map((p: any) => [
        `"${p.product_name.replace(/"/g, '""')}"`,
        p.sku,
        p.units_sold,
        p.total_revenue,
        p.total_cogs,
        p.gross_profit,
        p.profit_margin_pct,
      ]);
    } else if (activeReport === 'batch_profit' && batchProfitData) {
      headers = [
        'Batch Number',
        'Product Name',
        'SKU',
        'Category',
        'Supplier',
        'Purchase Date',
        'Units Received',
        'Units Sold',
        'Unit Purchase Cost ($)',
        'Realized Unit Sale ($)',
        'Total Batch Cost ($)',
        'Realized Revenue ($)',
        'Realized Profit ($)',
        'Margin (%)',
        'Markup (%)',
        'Status',
      ];
      rows = (batchProfitData.batches || []).map((b: any) => [
        `"${b.batch_number}"`,
        `"${b.product_name.replace(/"/g, '""')}"`,
        `"${b.sku}"`,
        `"${b.category_name || 'General'}"`,
        `"${(b.supplier_name || 'N/A').replace(/"/g, '""')}"`,
        new Date(b.purchase_date).toISOString().split('T')[0],
        b.quantity_received,
        b.units_sold,
        b.unit_purchase_price.toFixed(2),
        b.realized_unit_price.toFixed(2),
        b.total_purchase_cost.toFixed(2),
        b.realized_sales_revenue.toFixed(2),
        b.realized_profit.toFixed(2),
        b.profit_margin_pct.toFixed(1),
        b.markup_pct.toFixed(1),
        b.is_completed ? 'Completed' : 'Active',
      ]);
    }

    if (rows.length === 0) {
      toast.warning('Empty Report', 'No data to export.');
      return;
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Export Complete', 'CSV report downloaded successfully.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <span>Business Intelligence & Financial Reports</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            FIFO cost valuation, revenue analysis, supplier purchasing volume, and gross margin analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCurrentReport}
            className="p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700/60 transition-colors"
            title="Refresh Report Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleBackupFullInventory}
            className="px-3.5 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-emerald-500/30 shadow-sm"
            title="Download full inventory valuation and stock report as CSV for local backup"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Inventory Backup CSV</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 border border-slate-700 shadow-sm"
            title="Export currently active report tab to CSV"
          >
            <Download className="w-4 h-4 text-blue-400" /> Export Active CSV
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <button
          onClick={() => setActiveReport('valuation')}
          className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border text-left ${
            activeReport === 'valuation'
              ? 'bg-blue-600 text-white border-blue-500 shadow-md'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[10px] text-blue-200 uppercase font-semibold">Inventory</div>
          <div className="text-sm">Stock Valuation</div>
        </button>

        <button
          onClick={() => setActiveReport('sales')}
          className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border text-left ${
            activeReport === 'sales'
              ? 'bg-blue-600 text-white border-blue-500 shadow-md'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[10px] text-blue-200 uppercase font-semibold">Revenue</div>
          <div className="text-sm">Sales Orders</div>
        </button>

        <button
          onClick={() => setActiveReport('purchases')}
          className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border text-left ${
            activeReport === 'purchases'
              ? 'bg-blue-600 text-white border-blue-500 shadow-md'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[10px] text-blue-200 uppercase font-semibold">Procurement</div>
          <div className="text-sm">Supplier Purchases</div>
        </button>

        <button
          onClick={() => setActiveReport('profit')}
          className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border text-left ${
            activeReport === 'profit'
              ? 'bg-blue-600 text-white border-blue-500 shadow-md'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[10px] text-blue-200 uppercase font-semibold">Margins</div>
          <div className="text-sm">FIFO Gross Profit</div>
        </button>

        <button
          onClick={() => setActiveReport('batch_profit')}
          className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border text-left col-span-2 sm:col-span-1 ${
            activeReport === 'batch_profit'
              ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-1 ring-blue-400/50'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-[10px] text-emerald-300 uppercase font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Batch Margins</span>
          </div>
          <div className="text-sm flex items-center justify-between">
            <span>Completed Batches</span>
          </div>
        </button>
      </div>

      {/* Valuation Report View */}
      {activeReport === 'valuation' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-100">
              Stock Valuation by Item (Cost vs Potential Retail)
            </h3>
            <div className="text-xs font-mono text-slate-400">
              Total Cost:{' '}
              <strong className="text-emerald-400">
                ${stockValuation.reduce((a, b) => a + b.cost_valuation, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] font-bold uppercase text-slate-400">
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">SKU / Code</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">In Stock Units</th>
                  <th className="py-3 px-4 text-right">Cost Valuation</th>
                  <th className="py-3 px-4 text-right font-bold text-white">Retail Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                {stockValuation.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-sans font-semibold text-slate-100">
                      {item.name}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{item.sku}</td>
                    <td className="py-3 px-4 font-sans text-slate-400">
                      {item.category_name || 'General'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-200">
                      {item.current_stock} {item.unit}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400">
                      ${item.cost_valuation.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-400 font-bold">
                      ${item.retail_valuation.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sales Report View */}
      {activeReport === 'sales' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-100">
              Sales Orders & Payment Performance
            </h3>
            <div className="text-xs font-mono text-slate-400">
              Total Revenue:{' '}
              <strong className="text-amber-400">
                ${salesData.reduce((a, b) => a + b.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] font-bold uppercase text-slate-400">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right font-bold text-white">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {salesData.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-100">
                      {inv.customer_name || 'Walk-in Retail'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">{inv.items_count}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {inv.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      ${inv.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Purchases Report View */}
      {activeReport === 'purchases' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-100">
              Procurement & Intake Volume by Supplier
            </h3>
            <div className="text-xs font-mono text-slate-400">
              Total Purchases:{' '}
              <strong className="text-emerald-400">
                ${purchasesData.reduce((a, b) => a + b.total_purchased_value, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] font-bold uppercase text-slate-400">
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4 text-center">Batches Intake Count</th>
                  <th className="py-3 px-4 text-right">Total Units Delivered</th>
                  <th className="py-3 px-4 text-right font-bold text-white">Purchased Value ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {purchasesData.map((sup) => (
                  <tr key={sup.supplier_id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-100">
                      {sup.supplier_name}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {sup.batches_count} batches
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {sup.total_units_received.toLocaleString()} units
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      ${sup.total_purchased_value.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Profit & Margin View */}
      {activeReport === 'profit' && profitData && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Revenue</span>
              <div className="text-xl font-black font-mono text-white mt-1">
                ${profitData.summary.totalRevenue.toFixed(2)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">FIFO COGS (Cost)</span>
              <div className="text-xl font-black font-mono text-rose-400 mt-1">
                ${profitData.summary.totalCogs.toFixed(2)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Gross Profit</span>
              <div className="text-xl font-black font-mono text-emerald-400 mt-1">
                ${profitData.summary.grossProfit.toFixed(2)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Gross Margin</span>
              <div className="text-xl font-black font-mono text-blue-400 mt-1">
                {profitData.summary.profitMarginPct}%
              </div>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] font-bold uppercase text-slate-400">
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4 text-center">Units Sold</th>
                    <th className="py-3 px-4 text-right">Revenue</th>
                    <th className="py-3 px-4 text-right">FIFO COGS</th>
                    <th className="py-3 px-4 text-right font-bold text-emerald-400">Gross Profit</th>
                    <th className="py-3 px-4 text-right font-bold text-white">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                  {profitData.items.map((it: any) => (
                    <tr key={it.product_id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-sans font-semibold text-slate-100">
                        {it.product_name}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{it.sku}</td>
                      <td className="py-3 px-4 text-center">{it.units_sold}</td>
                      <td className="py-3 px-4 text-right text-slate-200">${it.total_revenue.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-rose-400">${it.total_cogs.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-bold">
                        ${it.gross_profit.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-blue-400 font-bold">
                        {it.profit_margin_pct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Batch Profitability & Cost vs Realized Sales Comparison Section */}
      {activeReport === 'batch_profit' && (
        <BatchProfitMarginSection
          data={batchProfitData}
          loading={loading}
          onRefresh={loadCurrentReport}
          statusFilter={batchStatusFilter}
          setStatusFilter={(st) => setBatchStatusFilter(st)}
        />
      )}
    </div>
  );
};
