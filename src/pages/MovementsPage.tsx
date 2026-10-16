import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Filter,
  Download,
  Search,
  Calendar,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { StockMovement, Product } from '../types/index.ts';
import { useToast } from '../components/Toast.tsx';

export const MovementsPage: React.FC = () => {
  const toast = useToast();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [selectedType, setSelectedType] = useState<string>('');

  const loadMovements = async () => {
    setLoading(true);
    try {
      const [movs, prods] = await Promise.all([
        api.getStockMovements({
          productId: selectedProductId ? Number(selectedProductId) : undefined,
          movementType: selectedType || undefined,
          limit: 150,
        }),
        api.getProducts(),
      ]);
      setMovements(movs);
      setProducts(prods);
    } catch (err: any) {
      toast.error('Failed to load ledger', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, [selectedProductId, selectedType]);

  const handleExportCSV = () => {
    if (movements.length === 0) {
      toast.warning('Empty', 'No movements to export.');
      return;
    }

    const headers = [
      'ID',
      'Date',
      'Product',
      'SKU',
      'Movement Type',
      'Quantity',
      'Unit',
      'Unit Price ($)',
      'Reference',
      'Notes',
      'Operator',
    ];

    const rows = movements.map((m) => [
      m.id,
      new Date(m.created_at).toISOString(),
      `"${(m.product_name || '').replace(/"/g, '""')}"`,
      m.sku,
      m.movement_type,
      m.quantity,
      m.unit,
      m.unit_price,
      `"${(m.reference || '').replace(/"/g, '""')}"`,
      `"${(m.notes || '').replace(/"/g, '""')}"`,
      m.created_by || 'System',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `stock_movements_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Export Ready', 'Downloaded CSV movements ledger.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-blue-400" />
            <span>Stock Movement Audit Ledger</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable transaction record for every item added (IN), sold via FIFO (OUT), or adjusted.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadMovements}
            className="p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700/60"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 border border-slate-700"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Movement Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none"
          >
            <option value="">All Movement Types</option>
            <option value="IN">IN (Stock Intake)</option>
            <option value="OUT">OUT (FIFO Sales)</option>
            <option value="ADJUSTMENT">ADJUSTMENT (Audited)</option>
          </select>

          {/* Product Filter */}
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : '')}
            className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Showing {movements.length} latest entries
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Product & SKU</th>
                <th className="py-3.5 px-4 text-center">Type</th>
                <th className="py-3.5 px-4 text-right">Quantity</th>
                <th className="py-3.5 px-4 text-right">Unit Price</th>
                <th className="py-3.5 px-4">Reference</th>
                <th className="py-3.5 px-4">Notes / Batch</th>
                <th className="py-3.5 px-4 text-right">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading audit movements...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No movement records found.
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isOut = m.movement_type === 'OUT';
                  const isIn = m.movement_type === 'IN';

                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        {new Date(m.created_at).toLocaleDateString()} at{' '}
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Product */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-100">{m.product_name}</div>
                        <div className="text-[10px] font-mono text-slate-400">SKU: {m.sku}</div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            isOut
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : isIn
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {m.movement_type}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                        <span
                          className={
                            isOut
                              ? 'text-rose-400'
                              : isIn
                              ? 'text-emerald-400'
                              : 'text-amber-400'
                          }
                        >
                          {isOut ? '-' : '+'}{m.quantity} {m.unit}
                        </span>
                      </td>

                      {/* Unit Price */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-200">
                        ${Number(m.unit_price).toFixed(2)}
                      </td>

                      {/* Reference */}
                      <td className="py-3.5 px-4 font-mono text-blue-400">
                        {m.reference || '-'}
                      </td>

                      {/* Notes */}
                      <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                        {m.notes || (m.batch_number ? `Batch: ${m.batch_number}` : '-')}
                      </td>

                      {/* Operator */}
                      <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                        {m.created_by || 'System'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
