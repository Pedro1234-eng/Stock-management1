import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Search,
  Filter,
  Layers,
  Calendar,
  AlertCircle,
  SlidersHorizontal,
  RefreshCw,
  PlusCircle,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Product, StockBatch } from '../types/index.ts';
import { Modal } from '../components/Modal.tsx';
import { useToast } from '../components/Toast.tsx';
import { BatchExpiryTimeline, ExpiryBatchItem } from '../components/BatchExpiryTimeline.tsx';
import { BatchAuditExportModal } from '../components/BatchAuditExportModal.tsx';
import { exportBatchesToCSV, exportBatchesToPDF } from '../utils/batchAuditExporter.ts';

export const StockBatchesPage: React.FC = () => {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [batches, setBatches] = useState<any[]>([]);
  const [expiryBatches, setExpiryBatches] = useState<ExpiryBatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingExpiry, setLoadingExpiry] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Manual Adjustment Modal State
  const [adjustBatch, setAdjustBatch] = useState<any | null>(null);
  const [adjustType, setAdjustType] = useState<'SUBTRACT' | 'ADD'>('SUBTRACT');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  const loadExpiryData = async () => {
    setLoadingExpiry(true);
    try {
      const exp = await api.getExpiryBatches(180);
      setExpiryBatches(exp);
    } catch (err: any) {
      console.error('Failed to load expiry batches:', err);
    } finally {
      setLoadingExpiry(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, exp] = await Promise.all([
        api.getProducts(),
        api.getExpiryBatches(180),
      ]);
      setProducts(prods);
      setExpiryBatches(exp);

      if (selectedProductId) {
        const b = await api.getProductBatches(Number(selectedProductId));
        setBatches(b);
      } else if (prods.length > 0) {
        setSelectedProductId(prods[0].id);
        const b = await api.getProductBatches(prods[0].id);
        setBatches(b);
      }
    } catch (err: any) {
      toast.error('Failed to load batches', err.message);
    } finally {
      setLoading(false);
      setLoadingExpiry(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProductId]);

  const handleProductChange = async (id: number) => {
    setSelectedProductId(id);
    setLoading(true);
    try {
      const b = await api.getProductBatches(id);
      setBatches(b);
    } catch (err: any) {
      toast.error('Failed to load batches', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdjust = (batch: any) => {
    setAdjustBatch(batch);
    setAdjustType('SUBTRACT');
    setAdjustQty('');
    setAdjustReason('');
  };

  const handleConfirmAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustBatch || !adjustQty || !adjustReason.trim()) {
      toast.warning('Validation Error', 'Quantity and Reason are required.');
      return;
    }

    const qtyNum = parseInt(adjustQty, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      toast.warning('Invalid Quantity', 'Please enter a valid positive quantity.');
      return;
    }

    setSubmittingAdjust(true);
    try {
      await api.adjustStock({
        productId: adjustBatch.product_id,
        batchId: adjustBatch.id,
        adjustmentType: adjustType,
        quantity: qtyNum,
        reason: adjustReason.trim(),
      });

      toast.success(
        'Adjustment Recorded',
        `Stock batch ${adjustBatch.batch_number} adjusted successfully.`
      );
      setAdjustBatch(null);
      // Reload batches and expiry data
      loadExpiryData();
      if (selectedProductId) {
        const b = await api.getProductBatches(Number(selectedProductId));
        setBatches(b);
      }
    } catch (err: any) {
      toast.error('Adjustment Failed', err.message);
    } finally {
      setSubmittingAdjust(false);
    }
  };

  const handleQuickExportCSV = () => {
    if (!currentProd || batches.length === 0) {
      toast.warning('No Batches', 'No batches available to export for this product.');
      return;
    }
    const formatted = batches.map((b) => ({
      ...b,
      product_name: currentProd.name,
      sku: currentProd.sku,
      barcode: currentProd.barcode,
      unit: currentProd.unit,
      purchase_price: parseFloat(b.purchase_price) || 0,
      quantity_remaining: Number(b.quantity_remaining) || 0,
    }));
    exportBatchesToCSV(formatted, {
      scopeName: `${currentProd.name} (${currentProd.sku})`,
    });
    toast.success('CSV Exported', `Downloaded batch worksheet for ${currentProd.sku}.`);
  };

  const handleQuickExportPDF = () => {
    if (!currentProd || batches.length === 0) {
      toast.warning('No Batches', 'No batches available to export for this product.');
      return;
    }
    const formatted = batches.map((b) => ({
      ...b,
      product_name: currentProd.name,
      sku: currentProd.sku,
      barcode: currentProd.barcode,
      unit: currentProd.unit,
      purchase_price: parseFloat(b.purchase_price) || 0,
      quantity_remaining: Number(b.quantity_remaining) || 0,
    }));
    exportBatchesToPDF(formatted, {
      scopeName: `${currentProd.name} (${currentProd.sku})`,
    });
    toast.success('PDF Exported', `Downloaded audit PDF for ${currentProd.sku}.`);
  };

  const currentProd = products.find((p) => p.id === Number(selectedProductId));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-blue-400" />
            <span>FIFO Batch Tracking & Audit</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Audit individual purchase lots, expiry timetables, and execute audited physical count reconciliations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20"
            title="Export batch inventory to CSV or PDF for physical inventory audit"
          >
            <Download className="w-4 h-4" />
            <span>Export for Audit (CSV / PDF)</span>
          </button>

          <button
            onClick={loadData}
            className="p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700/60"
            title="Refresh batch data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Batch Expiration Timeline & Risk Radar Component */}
      <BatchExpiryTimeline
        batches={expiryBatches}
        selectedProductId={selectedProductId}
        products={products}
        onSelectProduct={handleProductChange}
        onOpenAdjust={handleOpenAdjust}
        onRefresh={loadData}
        loading={loadingExpiry}
      />

      {/* Product Selector */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">
            Select Product:
          </span>
          <select
            value={selectedProductId}
            onChange={(e) => handleProductChange(Number(e.target.value))}
            className="w-full sm:w-80 bg-slate-950 border border-slate-700 text-xs text-slate-100 rounded-xl px-3 py-2 outline-none focus:border-blue-500 font-semibold"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        {currentProd && (
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-slate-400">
              Total In Stock:{' '}
              <strong className="text-emerald-400 text-sm">{currentProd.current_stock}</strong> {currentProd.unit}
            </div>
            <div className="text-slate-400">
              Selling Price:{' '}
              <strong className="text-white text-sm">${currentProd.selling_price.toFixed(2)}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Batches Table with Audit Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Table Toolbar with Quick Export Controls */}
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Purchase Batches for</span>
              <span className="text-blue-400 font-mono font-semibold">{currentProd?.sku}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
                {batches.length} {batches.length === 1 ? 'lot' : 'lots'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              FIFO allocation order &mdash; earliest received purchase lots are deducted first during sales.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleQuickExportCSV}
              disabled={batches.length === 0}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-emerald-500/50 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-40"
              title="Export current product batches to CSV for audit"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleQuickExportPDF}
              disabled={batches.length === 0}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-blue-500/50 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-40"
              title="Export current product batches to PDF for audit"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              title="Open physical inventory audit sheet modal with warehouse-wide options"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Audit Worksheet Modal</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">FIFO Rank</th>
                <th className="py-3.5 px-4">Batch Number</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Purchase Date</th>
                <th className="py-3.5 px-4">Expiry Date</th>
                <th className="py-3.5 px-4 text-right">Unit Cost</th>
                <th className="py-3.5 px-4 text-right">Received</th>
                <th className="py-3.5 px-4 text-right font-bold text-white">Remaining</th>
                <th className="py-3.5 px-4 text-right">Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading FIFO batches...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No batches found for this product. Use "Stock In" to create an intake lot.
                  </td>
                </tr>
              ) : (
                batches.map((batch, idx) => {
                  const isExhausted = batch.quantity_remaining === 0;
                  const isNextInLine = !isExhausted && batches.findIndex((b) => b.quantity_remaining > 0) === idx;

                  return (
                    <tr
                      key={batch.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isExhausted ? 'opacity-40 bg-slate-950/30' : ''
                      }`}
                    >
                      {/* FIFO Rank */}
                      <td className="py-3.5 px-4">
                        {isNextInLine ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            #1 NEXT FIFO
                          </span>
                        ) : isExhausted ? (
                          <span className="text-[10px] font-mono text-slate-500">EXHAUSTED</span>
                        ) : (
                          <span className="font-mono text-slate-400">#{idx + 1}</span>
                        )}
                      </td>

                      {/* Batch Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                        {batch.batch_number}
                      </td>

                      {/* Supplier */}
                      <td className="py-3.5 px-4 text-slate-400">
                        {batch.supplier_name || 'Direct / Consignment'}
                      </td>

                      {/* Purchase Date */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono">
                        {new Date(batch.purchase_date).toLocaleDateString()}
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono">
                        {batch.expiry_date ? (() => {
                          const expiryTime = new Date(batch.expiry_date).getTime();
                          const nowTime = new Date().getTime();
                          const daysLeft = Math.ceil((expiryTime - nowTime) / (1000 * 60 * 60 * 24));
                          const isExpired = daysLeft < 0;
                          const isCritical30 = !isExpired && daysLeft <= 30;

                          return (
                            <div className="flex flex-col gap-1">
                              <span className="flex items-center gap-1.5 text-slate-200">
                                <Clock className={`w-3.5 h-3.5 ${isExpired ? 'text-rose-400' : isCritical30 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
                                <span>{new Date(batch.expiry_date).toLocaleDateString()}</span>
                              </span>
                              {isExpired ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 w-fit">
                                  EXPIRED ({Math.abs(daysLeft)}d ago)
                                </span>
                              ) : isCritical30 ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500/25 text-amber-300 border border-amber-500/50 w-fit animate-pulse">
                                  &le; 30d ({daysLeft === 0 ? 'TODAY' : `${daysLeft}d left`})
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500">
                                  {daysLeft} days left
                                </span>
                              )}
                            </div>
                          );
                        })() : (
                          <span className="text-slate-600">No Expiry</span>
                        )}
                      </td>

                      {/* Purchase Price */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-200">
                        ${batch.purchase_price.toFixed(2)}
                      </td>

                      {/* Received */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                        {batch.quantity_received}
                      </td>

                      {/* Remaining */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-emerald-400">
                        {batch.quantity_remaining}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenAdjust(batch)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <SlidersHorizontal className="w-3 h-3" /> Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Stock Adjustment Modal */}
      <Modal
        isOpen={Boolean(adjustBatch)}
        onClose={() => setAdjustBatch(null)}
        title={`Adjust Stock for Batch: ${adjustBatch?.batch_number}`}
        subtitle={`Product: ${currentProd?.name} (Current Remaining: ${adjustBatch?.quantity_remaining})`}
        maxWidth="md"
      >
        <form onSubmit={handleConfirmAdjust} className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            <strong>Audited Reconciliation:</strong> All manual adjustments create a permanent record in the stock movement ledger and system audit logs.
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Adjustment Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustType('SUBTRACT')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  adjustType === 'SUBTRACT'
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                Subtract (Damage, Loss, Return)
              </button>
              <button
                type="button"
                onClick={() => setAdjustType('ADD')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  adjustType === 'ADD'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                Add (Audit Surplus)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Quantity to Adjust *
            </label>
            <input
              type="number"
              min="1"
              required
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              placeholder="e.g. 5"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Reason / Justification *
            </label>
            <textarea
              required
              rows={3}
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Forklift tore 2 bags during warehouse relocation, written off by supervisor."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setAdjustBatch(null)}
              className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingAdjust}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              {submittingAdjust ? 'Applying...' : 'Confirm Adjustment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Physical Audit Export Modal */}
      <BatchAuditExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        currentProductBatches={batches}
        currentProduct={currentProd}
        products={products}
      />
    </div>
  );
};
