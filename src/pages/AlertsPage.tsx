import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  XCircle,
  Clock,
  PlusCircle,
  Package,
  Calendar,
  RefreshCw,
  Truck,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Product } from '../types/index.ts';
import { useToast } from '../components/Toast.tsx';

interface AlertsPageProps {
  onRestockProduct: (productId: number) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({ onRestockProduct }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'low' | 'out' | 'expiry'>('low');
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [outOfStock, setOutOfStock] = useState<Product[]>([]);
  const [expiryBatches, setExpiryBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const [low, out, expiry] = await Promise.all([
        api.getLowStock(),
        api.getOutOfStock(),
        api.getExpiryBatches(90),
      ]);
      setLowStock(low);
      setOutOfStock(out);
      setExpiryBatches(expiry);
    } catch (err: any) {
      toast.error('Failed to load alerts', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <span>Inventory Health & Stock Alerts</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated alerts for threshold breaches, depleted lines, and perishable batch expiry.
          </p>
        </div>

        <button
          onClick={loadAlerts}
          className="p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700/60"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs / Badges Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Low Stock Tab */}
        <button
          onClick={() => setActiveTab('low')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'low'
              ? 'bg-amber-950/30 border-amber-500/60 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Low Stock
            </span>
            <span className="text-xl font-black font-mono text-amber-400">
              {lowStock.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Stock level &le; minimum threshold</p>
        </button>

        {/* Out of Stock Tab */}
        <button
          onClick={() => setActiveTab('out')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'out'
              ? 'bg-rose-950/30 border-rose-500/60 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <XCircle className="w-4 h-4" /> Out of Stock
            </span>
            <span className="text-xl font-black font-mono text-rose-400">
              {outOfStock.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">0 units remaining in warehouse</p>
        </button>

        {/* Expiry Warnings Tab */}
        <button
          onClick={() => setActiveTab('expiry')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'expiry'
              ? 'bg-blue-950/30 border-blue-500/60 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Expiry Watch
            </span>
            <span className="text-xl font-black font-mono text-blue-400">
              {expiryBatches.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Batches expiring in &le; 90 days</p>
        </button>
      </div>

      {/* Content for Low Stock */}
      {activeTab === 'low' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Products Requiring Immediate Reorder</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">{lowStock.length} products</span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {loading ? (
              <div className="py-12 text-center text-slate-400">Checking stock levels...</div>
            ) : lowStock.length === 0 ? (
              <div className="py-12 text-center text-emerald-400 font-semibold text-xs">
                No low stock alerts! All products are adequately stocked.
              </div>
            ) : (
              lowStock.map((prod) => (
                <div
                  key={prod.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors"
                >
                  <div>
                    <div className="font-bold text-sm text-slate-100">{prod.name}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-amber-400 font-semibold">SKU: {prod.sku}</span>
                      <span>&bull;</span>
                      <span>Category: {prod.category_name || 'General'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm font-black font-mono text-amber-400">
                        {prod.current_stock} {prod.unit}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Alert Min: {prod.minimum_stock}
                      </div>
                    </div>

                    <button
                      onClick={() => onRestockProduct(prod.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Restock
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Content for Out of Stock */}
      {activeTab === 'out' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Out of Stock Products (Stock = 0)</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">{outOfStock.length} products</span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {loading ? (
              <div className="py-12 text-center text-slate-400">Checking stock levels...</div>
            ) : outOfStock.length === 0 ? (
              <div className="py-12 text-center text-emerald-400 font-semibold text-xs">
                Awesome! No products are completely out of stock.
              </div>
            ) : (
              outOfStock.map((prod) => (
                <div
                  key={prod.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors"
                >
                  <div>
                    <div className="font-bold text-sm text-slate-100">{prod.name}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-rose-400 font-semibold">SKU: {prod.sku}</span>
                      <span>&bull;</span>
                      <span>Barcode: {prod.barcode}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        0 UNITS
                      </span>
                    </div>

                    <button
                      onClick={() => onRestockProduct(prod.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Restock Now
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Content for Expiry Warnings */}
      {activeTab === 'expiry' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>FIFO Batches Nearing Expiry (&le; 90 Days)</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">{expiryBatches.length} batches</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] font-bold uppercase text-slate-400">
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Product Name & SKU</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Days Left</th>
                  <th className="py-3 px-4 text-right">Units Remaining</th>
                  <th className="py-3 px-4 text-right">Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Scanning batch expiry dates...
                    </td>
                  </tr>
                ) : expiryBatches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-emerald-400 font-semibold">
                      No perishable batches are expiring in the next 90 days.
                    </td>
                  </tr>
                ) : (
                  expiryBatches.map((b) => {
                    const days = parseInt(b.days_until_expiry, 10);
                    const isExpired = days <= 0;

                    return (
                      <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                          {b.batch_number}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-100">{b.product_name}</div>
                          <div className="text-[10px] font-mono text-slate-400">SKU: {b.sku}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {new Date(b.expiry_date).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4">
                          {isExpired ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              EXPIRED
                            </span>
                          ) : days <= 30 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              {days} days left
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {days} days left
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100">
                          {b.quantity_remaining} {b.unit}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-400">
                          {b.supplier_name || 'Direct'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
