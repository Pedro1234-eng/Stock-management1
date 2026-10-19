import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Calendar,
  Layers,
  DollarSign,
  TrendingUp,
  Truck,
  CheckCircle2,
  Table,
  Filter,
} from 'lucide-react';
import { Modal } from './Modal.tsx';
import { api } from '../services/api.ts';
import { useToast } from './Toast.tsx';
import {
  exportSalesOrdersToCSV,
  exportDetailedSalesItemsToCSV,
  exportInventoryValuationToCSV,
  exportPhysicalBatchInventoryToCSV,
  exportSupplierPurchasesToCSV,
  exportProfitReportToCSV,
  exportBatchProfitabilityToCSV,
} from '../utils/reportCsvExporter.ts';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: 'sales' | 'inventory' | 'valuation' | 'profit' | 'purchases' | 'batch_profit';
  currentStartDate?: string;
  currentEndDate?: string;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  isOpen,
  onClose,
  defaultCategory = 'sales',
  currentStartDate = '',
  currentEndDate = '',
}) => {
  const toast = useToast();
  const [exportType, setExportType] = useState<
    'sales_summary' | 'sales_detailed' | 'inventory_valuation' | 'inventory_batches' | 'profit' | 'batch_profit' | 'purchases'
  >(
    defaultCategory === 'sales'
      ? 'sales_summary'
      : defaultCategory === 'valuation' || defaultCategory === 'inventory'
      ? 'inventory_valuation'
      : defaultCategory === 'profit'
      ? 'profit'
      : defaultCategory === 'purchases'
      ? 'purchases'
      : defaultCategory === 'batch_profit'
      ? 'batch_profit'
      : 'sales_summary'
  );

  const [dateScope, setDateScope] = useState<'all' | 'custom'>('all');
  const [startDate, setStartDate] = useState(currentStartDate);
  const [endDate, setEndDate] = useState(currentEndDate);
  const [exporting, setExporting] = useState(false);

  const handleExecuteExport = async () => {
    setExporting(true);
    try {
      const startParam = dateScope === 'custom' && startDate ? startDate : undefined;
      const endParam = dateScope === 'custom' && endDate ? endDate : undefined;

      if (exportType === 'sales_summary') {
        const sales = await api.getSalesReport(startParam, endParam);
        if (!sales || sales.length === 0) {
          toast.warning('No Records Found', 'No sales transactions found for the selected period.');
          return;
        }
        exportSalesOrdersToCSV(sales, {
          startDate: startParam,
          endDate: endParam,
          scopeTitle: 'Sales Orders Summary',
        });
        toast.success(
          'Sales Summary Exported',
          `Successfully exported ${sales.length} sales orders to CSV.`
        );
      } else if (exportType === 'sales_detailed') {
        const items = await api.getDetailedSalesItems(startParam, endParam);
        if (!items || items.length === 0) {
          toast.warning('No Records Found', 'No sold item line records found for the selected period.');
          return;
        }
        exportDetailedSalesItemsToCSV(items, {
          startDate: startParam,
          endDate: endParam,
          scopeTitle: 'Granular Sales Line Items',
        });
        toast.success(
          'Detailed Sales Exported',
          `Successfully exported ${items.length} line items across invoices to CSV.`
        );
      } else if (exportType === 'inventory_valuation') {
        const inventory = await api.getStockSummary();
        if (!inventory || inventory.length === 0) {
          toast.warning('Inventory Empty', 'No inventory valuation data found.');
          return;
        }
        exportInventoryValuationToCSV(inventory, {
          scopeTitle: 'Master Warehouse Stock & Valuation Snapshot',
        });
        toast.success(
          'Inventory Valuation Exported',
          `Successfully exported ${inventory.length} product lines with FIFO valuation.`
        );
      } else if (exportType === 'inventory_batches') {
        const batches = await api.getAllBatches();
        if (!batches || batches.length === 0) {
          toast.warning('No Batches Found', 'No physical inventory batches found.');
          return;
        }
        exportPhysicalBatchInventoryToCSV(batches, {
          scopeTitle: 'Complete Physical Batch & Lot Inventory',
        });
        toast.success(
          'Batch Inventory Exported',
          `Successfully exported ${batches.length} physical inventory batches.`
        );
      } else if (exportType === 'profit') {
        const profit = await api.getProfitReport(startParam, endParam);
        if (!profit || !profit.items || profit.items.length === 0) {
          toast.warning('No Records Found', 'No profit margin data available for the selected dates.');
          return;
        }
        exportProfitReportToCSV(profit, {
          startDate: startParam,
          endDate: endParam,
        });
        toast.success(
          'Profit Report Exported',
          `Successfully exported profit margins for ${profit.items.length} products.`
        );
      } else if (exportType === 'batch_profit') {
        const batchProfit = await api.getBatchProfitabilityReport({
          status: 'all',
          startDate: startParam,
          endDate: endParam,
        });
        if (!batchProfit || !batchProfit.batches || batchProfit.batches.length === 0) {
          toast.warning('No Batches Found', 'No batch profitability records available.');
          return;
        }
        exportBatchProfitabilityToCSV(batchProfit, { statusFilter: 'All Batches' });
        toast.success(
          'Batch Margins Exported',
          `Successfully exported profitability metrics for ${batchProfit.batches.length} batches.`
        );
      } else if (exportType === 'purchases') {
        const purchases = await api.getPurchasesReport();
        if (!purchases || purchases.length === 0) {
          toast.warning('No Data', 'No supplier purchasing volume found.');
          return;
        }
        exportSupplierPurchasesToCSV(purchases, {
          scopeTitle: 'Supplier Procurement Overview',
        });
        toast.success(
          'Purchases Report Exported',
          `Successfully exported purchasing data for ${purchases.length} suppliers.`
        );
      }

      onClose();
    } catch (err: any) {
      toast.error('Export Failed', err.message || 'An error occurred while generating CSV.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Reports & Intelligence to CSV"
      subtitle="Generate RFC-4180 compliant CSV files with UTF-8 BOM for Microsoft Excel, Google Sheets, or Python."
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Dataset Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
            Select Data to Export
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {/* Sales Summary */}
            <button
              type="button"
              onClick={() => setExportType('sales_summary')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                exportType === 'sales_summary'
                  ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm'
                  : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  exportType === 'sales_summary' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>Sales Orders Summary</span>
                  {exportType === 'sales_summary' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                  Invoice numbers, customers, dates, totals, payments, and fulfillment status.
                </p>
              </div>
            </button>

            {/* Sales Detailed Items */}
            <button
              type="button"
              onClick={() => setExportType('sales_detailed')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                exportType === 'sales_detailed'
                  ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm'
                  : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  exportType === 'sales_detailed' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Table className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>Detailed Sales Line Items</span>
                  {exportType === 'sales_detailed' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                  Itemized sales: each product sold, quantity, unit price, discounts, and revenue.
                </p>
              </div>
            </button>

            {/* Inventory Valuation */}
            <button
              type="button"
              onClick={() => setExportType('inventory_valuation')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                exportType === 'inventory_valuation'
                  ? 'bg-emerald-600/15 border-emerald-500 text-white shadow-sm'
                  : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  exportType === 'inventory_valuation'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>Inventory Valuation & Stock</span>
                  {exportType === 'inventory_valuation' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                  SKUs, stock on hand, FIFO cost valuation, potential retail value, and gross spread.
                </p>
              </div>
            </button>

            {/* Physical Batches */}
            <button
              type="button"
              onClick={() => setExportType('inventory_batches')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                exportType === 'inventory_batches'
                  ? 'bg-emerald-600/15 border-emerald-500 text-white shadow-sm'
                  : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  exportType === 'inventory_batches'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>Physical Batches & Lot Audit</span>
                  {exportType === 'inventory_batches' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                  Lot numbers, suppliers, purchase dates, expiration dates, and remaining stock.
                </p>
              </div>
            </button>

            {/* Profit Margin & COGS */}
            <button
              type="button"
              onClick={() => setExportType('profit')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                exportType === 'profit'
                  ? 'bg-amber-600/15 border-amber-500 text-white shadow-sm'
                  : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  exportType === 'profit' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>Gross Profit & FIFO COGS</span>
                  {exportType === 'profit' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                  Product-level realized revenue, FIFO cost of goods sold, and margin percentages.
                </p>
              </div>
            </button>

            {/* Batch Profitability */}
            <button
              type="button"
              onClick={() => setExportType('batch_profit')}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                exportType === 'batch_profit'
                  ? 'bg-purple-600/15 border-purple-500 text-white shadow-sm'
                  : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  exportType === 'batch_profit' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Filter className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>Batch Profit Margins</span>
                  {exportType === 'batch_profit' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                  Original purchase price vs. realized sales prices per inventory batch.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Date Filters (applicable to sales and profit) */}
        {['sales_summary', 'sales_detailed', 'profit', 'batch_profit'].includes(exportType) && (
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" /> Date Filtering
              </span>
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-750">
                <button
                  type="button"
                  onClick={() => setDateScope('all')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                    dateScope === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All-Time
                </button>
                <button
                  type="button"
                  onClick={() => setDateScope('custom')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                    dateScope === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Date Range
                </button>
              </div>
            </div>

            {dateScope === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-xs text-slate-100 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-lg text-xs text-slate-100 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Format Spec Note */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-300">Enterprise CSV Specification:</span>{' '}
            Includes UTF-8 Byte Order Mark (BOM) for seamless opening in Microsoft Excel and Google
            Sheets without encoding glitches, complete with RFC 4180 escaping and structured financial metadata headers.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecuteExport}
            disabled={exporting}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-60"
          >
            {exporting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Preparing CSV File...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download CSV File</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
