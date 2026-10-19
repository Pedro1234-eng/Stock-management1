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
  Table,
  SlidersHorizontal,
  X,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { useToast } from '../components/Toast.tsx';
import { BatchProfitMarginSection } from '../components/BatchProfitMarginSection.tsx';
import { ReportExportModal } from '../components/ReportExportModal.tsx';
import { BatchProfitabilityReport } from '../types/index.ts';
import {
  exportSalesOrdersToCSV,
  exportDetailedSalesItemsToCSV,
  exportInventoryValuationToCSV,
  exportPhysicalBatchInventoryToCSV,
  exportSupplierPurchasesToCSV,
  exportProfitReportToCSV,
  exportBatchProfitabilityToCSV,
} from '../utils/reportCsvExporter.ts';

export const ReportsPage: React.FC = () => {
  const toast = useToast();
  const [activeReport, setActiveReport] = useState<
    'valuation' | 'sales' | 'purchases' | 'profit' | 'batch_profit'
  >('valuation');
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
  const [dateFilterPreset, setDateFilterPreset] = useState<'all' | '7d' | '30d' | 'month' | 'custom'>('all');

  // Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportModalCategory, setExportModalCategory] = useState<
    'sales' | 'inventory' | 'profit' | 'purchases' | 'batch_profit'
  >('sales');

  const applyDatePreset = (preset: 'all' | '7d' | '30d' | 'month' | 'custom') => {
    setDateFilterPreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

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

  // =========================================================================
  // CSV EXPORT HANDLERS
  // =========================================================================

  const handleExportSalesSummary = async () => {
    try {
      let data = salesData;
      if (data.length === 0 || activeReport !== 'sales') {
        data = await api.getSalesReport(startDate || undefined, endDate || undefined);
      }
      if (!data || data.length === 0) {
        toast.warning('No Sales Records', 'No sales orders found for export.');
        return;
      }
      exportSalesOrdersToCSV(data, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      toast.success(
        'Sales Summary Exported',
        `Successfully downloaded ${data.length} sales orders to CSV.`
      );
    } catch (err: any) {
      toast.error('Export Failed', err.message);
    }
  };

  const handleExportDetailedSales = async () => {
    try {
      const items = await api.getDetailedSalesItems(startDate || undefined, endDate || undefined);
      if (!items || items.length === 0) {
        toast.warning('No Line Items', 'No sold item line records found for export.');
        return;
      }
      exportDetailedSalesItemsToCSV(items, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      toast.success(
        'Detailed Sales Exported',
        `Successfully downloaded ${items.length} itemized transaction lines to CSV.`
      );
    } catch (err: any) {
      toast.error('Export Failed', err.message);
    }
  };

  const handleExportInventoryValuation = async () => {
    try {
      let data = stockValuation;
      if (data.length === 0 || activeReport !== 'valuation') {
        data = await api.getStockSummary();
      }
      if (!data || data.length === 0) {
        toast.warning('Inventory Empty', 'No inventory records found for export.');
        return;
      }
      exportInventoryValuationToCSV(data);
      toast.success(
        'Inventory Exported',
        `Successfully downloaded ${data.length} product lines with valuation to CSV.`
      );
    } catch (err: any) {
      toast.error('Export Failed', err.message);
    }
  };

  const handleExportPhysicalBatches = async () => {
    try {
      const batches = await api.getAllBatches();
      if (!batches || batches.length === 0) {
        toast.warning('No Batches', 'No physical inventory batches found for export.');
        return;
      }
      exportPhysicalBatchInventoryToCSV(batches);
      toast.success(
        'Batches Exported',
        `Successfully downloaded ${batches.length} physical inventory batches to CSV.`
      );
    } catch (err: any) {
      toast.error('Export Failed', err.message);
    }
  };

  const handleExportPurchases = async () => {
    try {
      let data = purchasesData;
      if (data.length === 0 || activeReport !== 'purchases') {
        data = await api.getPurchasesReport();
      }
      if (!data || data.length === 0) {
        toast.warning('No Purchases', 'No supplier procurement data found for export.');
        return;
      }
      exportSupplierPurchasesToCSV(data);
      toast.success(
        'Purchases Exported',
        `Successfully downloaded procurement data for ${data.length} suppliers to CSV.`
      );
    } catch (err: any) {
      toast.error('Export Failed', err.message);
    }
  };

  const handleExportProfit = async () => {
    try {
      let data = profitData;
      if (!data || activeReport !== 'profit') {
        data = await api.getProfitReport(startDate || undefined, endDate || undefined);
      }
      if (!data || !data.items || data.items.length === 0) {
        toast.warning('No Profit Records', 'No profit margin data found for export.');
        return;
      }
      exportProfitReportToCSV(data, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      toast.success(
        'Profit Report Exported',
        `Successfully downloaded profit margins for ${data.items.length} products to CSV.`
      );
    } catch (err: any) {
      toast.error('Export Failed', err.message);
    }
  };

  const handleExportBatchMargins = async () => {
    try {
      let data = batchProfitData;
      if (!data || activeReport !== 'batch_profit') {
        data = await api.getBatchProfitabilityReport({
          status: batchStatusFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
      }
      if (!data || !data.batches || data.batches.length === 0) {
        toast.warning('No Batches', 'No batch profitability records found for export.');
        return;
      }
      exportBatchProfitabilityToCSV(data, {
        statusFilter: batchStatusFilter === 'completed' ? 'Completed Batches' : 'All Batches',
      });
      toast.success(
        'Batch Margins Exported',
        `Successfully downloaded profitability metrics for ${data.batches.length} batches to CSV.`
      );
    } catch (err: any) {
      toast.error('Export Failed', err.message);
    }
  };

  const handleExportActiveView = () => {
    if (activeReport === 'valuation') {
      handleExportInventoryValuation();
    } else if (activeReport === 'sales') {
      handleExportSalesSummary();
    } else if (activeReport === 'purchases') {
      handleExportPurchases();
    } else if (activeReport === 'profit') {
      handleExportProfit();
    } else if (activeReport === 'batch_profit') {
      handleExportBatchMargins();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <span>Business Intelligence & Financial Reports</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            FIFO cost valuation, revenue analysis, supplier purchasing volume, and gross margin analytics with universal CSV exports.
          </p>
        </div>

        {/* Global Export Action Suite */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadCurrentReport}
            className="p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700/60 transition-colors"
            title="Refresh Report Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Quick Sales Export */}
          <button
            onClick={handleExportSalesSummary}
            className="px-3.5 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-blue-500/30 shadow-sm"
            title="Download sales orders as CSV"
          >
            <DollarSign className="w-4 h-4 text-blue-400" />
            <span>Export Sales CSV</span>
          </button>

          {/* Quick Inventory Export */}
          <button
            onClick={handleExportInventoryValuation}
            className="px-3.5 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-emerald-500/30 shadow-sm"
            title="Download warehouse inventory valuation as CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Inventory CSV</span>
          </button>

          {/* Export Center Modal Trigger */}
          <button
            onClick={() => {
              setExportModalCategory(
                activeReport === 'valuation' ? 'inventory' : activeReport
              );
              setIsExportModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-amber-500/30 shadow-sm"
            title="Open CSV Export Center with date filters, detailed line items, and audit options"
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            <span>Export Options...</span>
          </button>

          {/* Export Active Tab */}
          <button
            onClick={handleExportActiveView}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 border border-slate-700 shadow-sm"
            title="Export currently active report tab to CSV"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Export Active View</span>
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

      {/* Date Filter Bar for Time-Sensitive Reports */}
      {['sales', 'profit', 'batch_profit'].includes(activeReport) && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5 mr-1">
              <Calendar className="w-3.5 h-3.5 text-blue-400" /> Filter Period:
            </span>
            <button
              onClick={() => applyDatePreset('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                dateFilterPreset === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => applyDatePreset('7d')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                dateFilterPreset === '7d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => applyDatePreset('30d')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                dateFilterPreset === '30d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => applyDatePreset('month')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                dateFilterPreset === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              This Month
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setDateFilterPreset('custom');
                  setStartDate(e.target.value);
                }}
                className="bg-transparent text-slate-200 text-xs focus:outline-hidden"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setDateFilterPreset('custom');
                  setEndDate(e.target.value);
                }}
                className="bg-transparent text-slate-200 text-xs focus:outline-hidden"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => applyDatePreset('all')}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                title="Clear date filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. Valuation Report View */}
      {activeReport === 'valuation' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Stock Valuation by Item (Cost vs Potential Retail)</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                FIFO inventory cost, potential retail margin, and reorder levels.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportInventoryValuation}
                className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 border border-emerald-500/30"
                title="Download this valuation table as CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Valuation CSV</span>
              </button>
              <button
                onClick={handleExportPhysicalBatches}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 border border-slate-700"
                title="Download physical batch lot audit as CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                <span>Export Batches CSV</span>
              </button>
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
                      ${Number(item.cost_valuation || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-400 font-bold">
                      ${Number(item.retail_valuation || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Sales Report View */}
      {activeReport === 'sales' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-400" />
                <span>Sales Orders & Payment Performance</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Summary of customer orders, payment channels, and realized gross revenues.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportSalesSummary}
                className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 border border-blue-500/30"
                title="Download sales orders summary as CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Orders CSV</span>
              </button>
              <button
                onClick={handleExportDetailedSales}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 border border-slate-700"
                title="Download detailed SKU sales line items as CSV"
              >
                <Table className="w-3.5 h-3.5 text-amber-400" />
                <span>Export Line Items CSV</span>
              </button>
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
                      ${Number(inv.total || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Purchases Report View */}
      {activeReport === 'purchases' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-400" />
                <span>Procurement & Intake Volume by Supplier</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Supplier batch fulfillment, total units received, and cumulative purchase spend.
              </p>
            </div>

            <button
              onClick={handleExportPurchases}
              className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 border border-blue-500/30 self-start sm:self-auto"
              title="Download supplier procurement volume as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Purchases CSV</span>
            </button>
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
                      {Number(sup.total_units_received || 0).toLocaleString()} units
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      ${Number(sup.total_purchased_value || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Profit & Margin View */}
      {activeReport === 'profit' && profitData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>FIFO Gross Profit & Margin by Product</span>
            </h3>
            <button
              onClick={handleExportProfit}
              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 border border-emerald-500/30"
              title="Download profit margins as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Profit Margins CSV</span>
            </button>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Revenue</span>
              <div className="text-xl font-black font-mono text-white mt-1">
                ${Number(profitData.summary?.totalRevenue || 0).toFixed(2)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">FIFO COGS (Cost)</span>
              <div className="text-xl font-black font-mono text-rose-400 mt-1">
                ${Number(profitData.summary?.totalCogs || 0).toFixed(2)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Gross Profit</span>
              <div className="text-xl font-black font-mono text-emerald-400 mt-1">
                ${Number(profitData.summary?.grossProfit || 0).toFixed(2)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Gross Margin</span>
              <div className="text-xl font-black font-mono text-blue-400 mt-1">
                {Number(profitData.summary?.profitMarginPct || 0)}%
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
                      <td className="py-3 px-4 text-right text-slate-200">
                        ${Number(it.total_revenue || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-400">
                        ${Number(it.total_cogs || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-bold">
                        ${Number(it.gross_profit || 0).toFixed(2)}
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

      {/* 5. Batch Profitability & Cost vs Realized Sales Comparison Section */}
      {activeReport === 'batch_profit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Comparing purchase cost vs. realized sales prices per completed/active batch
            </span>
            <button
              onClick={handleExportBatchMargins}
              className="px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-purple-500/30"
              title="Download batch margins and realized sales to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Batch Margins CSV</span>
            </button>
          </div>

          <BatchProfitMarginSection
            data={batchProfitData}
            loading={loading}
            onRefresh={loadCurrentReport}
            statusFilter={batchStatusFilter}
            setStatusFilter={(st) => setBatchStatusFilter(st)}
          />
        </div>
      )}

      {/* Comprehensive Report Export Modal */}
      <ReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        defaultCategory={exportModalCategory}
        currentStartDate={startDate}
        currentEndDate={endDate}
      />
    </div>
  );
};
