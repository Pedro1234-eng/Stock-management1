import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  Boxes,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertOctagon,
  X,
  Filter,
  Layers,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Modal } from './Modal.tsx';
import { Product } from '../types/index.ts';
import { api, getOperatorProfile } from '../services/api.ts';
import {
  exportBatchesToCSV,
  exportBatchesToPDF,
  getExpiryStatusLabel,
  BatchAuditExportItem,
} from '../utils/batchAuditExporter.ts';
import { useToast } from './Toast.tsx';

interface BatchAuditExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProductBatches: any[];
  currentProduct: Product | undefined;
  products: Product[];
}

export const BatchAuditExportModal: React.FC<BatchAuditExportModalProps> = ({
  isOpen,
  onClose,
  currentProductBatches,
  currentProduct,
  products,
}) => {
  const toast = useToast();
  const operator = getOperatorProfile();

  const [exportScope, setExportScope] = useState<'current' | 'all'>('current');
  const [activeOnly, setActiveOnly] = useState<boolean>(true);
  const [allBatches, setAllBatches] = useState<BatchAuditExportItem[]>([]);
  const [loadingAll, setLoadingAll] = useState<boolean>(false);
  const [previewTab, setPreviewTab] = useState<'options' | 'preview'>('options');

  // Load all batches when user chooses 'all' scope
  useEffect(() => {
    if (isOpen && exportScope === 'all' && allBatches.length === 0) {
      loadAllBatches();
    }
  }, [isOpen, exportScope]);

  const loadAllBatches = async () => {
    setLoadingAll(true);
    try {
      const data = await api.getAllBatches({ activeOnly: false });
      setAllBatches(data);
    } catch (err: any) {
      toast.error('Failed to load warehouse batches', err.message);
    } finally {
      setLoadingAll(false);
    }
  };

  // Prepare batches for export based on scope and activeOnly filter
  const targetBatches: BatchAuditExportItem[] = useMemo(() => {
    let source: any[] = [];
    if (exportScope === 'current') {
      source = currentProductBatches.map((b) => ({
        ...b,
        product_name: currentProduct?.name || 'Selected Product',
        sku: currentProduct?.sku || '',
        barcode: currentProduct?.barcode || '',
        unit: currentProduct?.unit || 'pcs',
        purchase_price: parseFloat(b.purchase_price) || 0,
        quantity_remaining: Number(b.quantity_remaining) || 0,
      }));
    } else {
      source = allBatches;
    }

    if (activeOnly) {
      return source.filter((b) => Number(b.quantity_remaining) > 0);
    }
    return source;
  }, [exportScope, currentProductBatches, currentProduct, allBatches, activeOnly]);

  const summary = useMemo(() => {
    const totalLots = targetBatches.length;
    const totalUnits = targetBatches.reduce((acc, b) => acc + (Number(b.quantity_remaining) || 0), 0);
    const totalValuation = targetBatches.reduce(
      (acc, b) => acc + (Number(b.quantity_remaining) || 0) * (Number(b.purchase_price) || 0),
      0
    );

    const critical30 = targetBatches.filter((b) => {
      if (!b.expiry_date) return false;
      const days = b.days_until_expiry !== null && b.days_until_expiry !== undefined
        ? b.days_until_expiry
        : Math.ceil((new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 30;
    }).length;

    const expired = targetBatches.filter((b) => {
      if (!b.expiry_date) return false;
      const days = b.days_until_expiry !== null && b.days_until_expiry !== undefined
        ? b.days_until_expiry
        : Math.ceil((new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return days < 0;
    }).length;

    return { totalLots, totalUnits, totalValuation, critical30, expired };
  }, [targetBatches]);

  const scopeLabel = exportScope === 'current'
    ? (currentProduct ? `${currentProduct.name} (${currentProduct.sku})` : 'Selected Product')
    : 'Warehouse-Wide Batch Inventory';

  const handleExportCSV = () => {
    if (targetBatches.length === 0) {
      toast.warning('No Batches', 'There are no batches to export under the current filter.');
      return;
    }
    try {
      exportBatchesToCSV(targetBatches, {
        scopeName: scopeLabel,
        operatorName: operator.name,
      });
      toast.success('CSV Downloaded', `Exported ${targetBatches.length} batches for audit.`);
    } catch (err: any) {
      toast.error('CSV Export Failed', err.message);
    }
  };

  const handleExportPDF = () => {
    if (targetBatches.length === 0) {
      toast.warning('No Batches', 'There are no batches to export under the current filter.');
      return;
    }
    try {
      exportBatchesToPDF(targetBatches, {
        scopeName: scopeLabel,
        operatorName: operator.name,
      });
      toast.success('PDF Generated', `Downloaded audit worksheet for ${targetBatches.length} batches.`);
    } catch (err: any) {
      toast.error('PDF Export Failed', err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Batch Inventory for Physical Audit"
      subtitle="Generate audit worksheets, count sheets, and discrepancy logs in CSV or print-ready PDF formats."
      maxWidth="4xl"
    >
      <div className="space-y-5">
        {/* Top Scope & Filter Bar */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Audit Scope
              </span>
              <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setExportScope('current')}
                  disabled={!currentProduct}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    exportScope === 'current'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 disabled:opacity-40'
                  }`}
                >
                  Current Product {currentProduct ? `(${currentProduct.sku})` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setExportScope('all')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    exportScope === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Warehouse Products
                </button>
              </div>
            </div>

            {/* Active Lots Toggle */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Stock Status Filter
              </span>
              <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveOnly(true)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    activeOnly
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Active Lots Only (&gt; 0 Units)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveOnly(false)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    !activeOnly
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Include Exhausted Lots
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics of selection */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800/80">
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Audit Lots</span>
              <span className="text-sm font-black font-mono text-white">
                {loadingAll ? 'Loading...' : summary.totalLots}
              </span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">System Units</span>
              <span className="text-sm font-black font-mono text-emerald-400">
                {loadingAll ? '...' : summary.totalUnits.toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Cost Valuation</span>
              <span className="text-sm font-bold font-mono text-slate-200">
                ${summary.totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Expiry Alerts</span>
              <span className="text-xs font-mono font-bold flex items-center gap-1.5 mt-0.5">
                {summary.critical30 > 0 ? (
                  <span className="text-amber-400 font-bold">{summary.critical30} &le;30d</span>
                ) : (
                  <span className="text-slate-500">0 &le;30d</span>
                )}
                {summary.expired > 0 && (
                  <span className="text-rose-400 font-bold">({summary.expired} expired)</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: CSV, PDF, Print */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. CSV Export Card */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={targetBatches.length === 0 || loadingAll}
            className="p-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 transition-all text-left flex flex-col justify-between group disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2.5 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                Export to CSV
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Download comma-separated audit file for Excel, Google Sheets, or ERP reconciliations.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-400">
              <span>Download .CSV</span>
              <Download className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* 2. PDF Download Card */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={targetBatches.length === 0 || loadingAll}
            className="p-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/50 transition-all text-left flex flex-col justify-between group disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-2.5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                Export to PDF
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Generate formatted landscape PDF worksheet with physical count tally boxes and manager sign-off lines.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-blue-400">
              <span>Download .PDF</span>
              <Download className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* 3. Print / Save as PDF Card */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={targetBatches.length === 0 || loadingAll}
            className="p-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/50 transition-all text-left flex flex-col justify-between group disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-2.5 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Printer className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                Print Audit Sheet
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Print physical clipboard count sheet directly or use browser "Save as PDF".
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-purple-400">
              <span>Browser Print / PDF</span>
              <Printer className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>

        {/* Printable Paper Preview Container (Rendered on screen & visible for window.print) */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2 print:hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Worksheet Live Preview ({targetBatches.length} lots)
            </span>
            <span className="text-[11px] text-slate-500">
              Includes physical count tallies and variance reconciliation fields
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-800 bg-white text-slate-900 p-6 shadow-inner print:max-h-none print:p-0 print:border-none print:shadow-none">
            {/* Header of Printable Sheet */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4 flex justify-between items-start">
              <div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Apex Stock & Building Supply Ltd
                </h2>
                <h3 className="text-xs font-bold text-slate-700 tracking-wide uppercase mt-0.5">
                  Physical Inventory Batch Audit Worksheet
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Scope: <strong className="text-slate-800">{scopeLabel}</strong> | Date: {new Date().toLocaleDateString()} | Auditor: {operator.name}
                </p>
              </div>

              <div className="text-right text-[11px] font-mono">
                <div className="font-bold text-slate-800">TOTAL LOTS: {targetBatches.length}</div>
                <div className="text-slate-600">UNITS: {summary.totalUnits.toLocaleString()}</div>
                <div className="text-slate-600">VALUATION: ${summary.totalValuation.toFixed(2)}</div>
              </div>
            </div>

            {/* Worksheet Table */}
            {targetBatches.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No batches to display under selected criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-100 text-[10px] font-bold uppercase text-slate-700">
                      <th className="py-2 px-2 w-8 text-center">#</th>
                      <th className="py-2 px-2">Product & SKU</th>
                      <th className="py-2 px-2 font-mono">Batch Number</th>
                      <th className="py-2 px-2">Expiry Date</th>
                      <th className="py-2 px-2 text-right">Unit Cost</th>
                      <th className="py-2 px-2 text-right font-bold text-slate-900">System Qty</th>
                      <th className="py-2 px-2 text-center bg-amber-50/60 font-bold text-slate-900 border-x border-slate-300">
                        Physical Count
                      </th>
                      <th className="py-2 px-2 text-center bg-slate-50 font-bold text-slate-800">
                        Variance (+/-)
                      </th>
                      <th className="py-2 px-2">Auditor Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {targetBatches.map((batch, idx) => {
                      const cost = Number(batch.purchase_price) || 0;
                      const expiryLabel = getExpiryStatusLabel(batch.days_until_expiry, batch.expiry_date);
                      const isExpired = batch.days_until_expiry !== null && batch.days_until_expiry !== undefined && batch.days_until_expiry < 0;
                      const isCritical30 = !isExpired && batch.days_until_expiry !== null && batch.days_until_expiry !== undefined && batch.days_until_expiry <= 30;

                      return (
                        <tr key={batch.id || idx} className="hover:bg-slate-50">
                          <td className="py-2 px-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2 px-2">
                            <div className="font-bold text-slate-900 leading-tight">{batch.product_name}</div>
                            <div className="text-[10px] font-mono text-slate-500">{batch.sku}</div>
                          </td>
                          <td className="py-2 px-2 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {batch.batch_number}
                          </td>
                          <td className="py-2 px-2 whitespace-nowrap">
                            <div className="font-mono text-slate-700">
                              {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : 'N/A'}
                            </div>
                            {batch.expiry_date && (
                              <div
                                className={`text-[9px] font-bold ${
                                  isExpired
                                    ? 'text-rose-600'
                                    : isCritical30
                                    ? 'text-amber-600'
                                    : 'text-slate-500'
                                }`}
                              >
                                {expiryLabel}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-slate-700">
                            ${cost.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-black text-slate-900">
                            {batch.quantity_remaining} <span className="font-normal text-[10px] text-slate-500">{batch.unit}</span>
                          </td>
                          <td className="py-2 px-2 text-center bg-amber-50/40 border-x border-slate-300 font-mono text-slate-400">
                            [ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ]
                          </td>
                          <td className="py-2 px-2 text-center bg-slate-50/50 font-mono text-slate-400">
                            [ &nbsp; &nbsp; &nbsp; ]
                          </td>
                          <td className="py-2 px-2 text-slate-400 text-[10px]">
                            ................................
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Auditor Signature Box at bottom */}
            <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-[10px] text-slate-600">
              <div>
                <p className="font-semibold text-slate-800">Lead Auditor Certification:</p>
                <p className="text-[9px] text-slate-500 mb-6">Counts verified as true physical stock on warehouse floor.</p>
                <div className="border-b border-slate-400 w-48 mb-1"></div>
                <p>Signature & Date: {operator.name}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-800">Warehouse Manager Sign-off:</p>
                <p className="text-[9px] text-slate-500 mb-6">Approved for reconciliation adjustments in system.</p>
                <div className="border-b border-slate-400 w-48 ml-auto mb-1"></div>
                <p>Manager Signature & Date</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Close / Footer */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
