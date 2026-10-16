import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Package,
  Boxes,
  DollarSign,
  AlertTriangle,
  XCircle,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  ShoppingCart,
  RefreshCw,
  Layers,
  Clock,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { DashboardData } from '../types/index.ts';
import { NavTab } from '../components/Sidebar.tsx';

interface DashboardPageProps {
  onNavigate: (tab: NavTab) => void;
  onRestockProduct: (productId: number) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onRestockProduct,
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboard();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Loading inventory intelligence...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl my-6">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Could not load dashboard data</h3>
        <p className="text-xs text-slate-400 mb-4">{error}</p>
        <button
          onClick={loadDashboard}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  const { metrics, categoryBreakdown, topSelling, recentMovements, salesTrend } = data;
  const maxSale = Math.max(...salesTrend.map((s) => s.sales), 100);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span>Inventory Command Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time PostgreSQL stock tracking, FIFO batch valuation, and point-of-sale analytics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboard}
            className="p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition-colors border border-slate-700/60"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('stock-entry')}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
          >
            <PlusCircle className="w-4 h-4" /> Stock Intake (IN)
          </button>
          <button
            onClick={() => onNavigate('sales')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20"
          >
            <ShoppingCart className="w-4 h-4" /> POS / Stock Out
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stock Quantity */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Stock Units
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-white font-mono">
            {metrics.totalStockQuantity.toLocaleString()}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>Across {metrics.totalProducts} products</span>
            <button
              onClick={() => onNavigate('products')}
              className="text-blue-400 hover:underline flex items-center gap-0.5 text-[11px]"
            >
              View catalog <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Inventory Value */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Inventory Cost Value
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-white font-mono">
            ${metrics.inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>FIFO Batch Valuation</span>
            <button
              onClick={() => onNavigate('reports')}
              className="text-emerald-400 hover:underline flex items-center gap-0.5 text-[11px]"
            >
              Valuation report <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Today's Sales */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Today's Sales Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-white font-mono">
            ${metrics.todaySales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>{metrics.todayInvoices} invoices today</span>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-amber-400 hover:underline flex items-center gap-0.5 text-[11px]"
            >
              Invoices <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Stock Alerts (Low & Out) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Stock Warnings
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div className="text-2xl font-black text-amber-400 font-mono">
              {metrics.lowStockCount} <span className="text-xs font-normal text-slate-400">low</span>
            </div>
            <div className="text-2xl font-black text-rose-400 font-mono">
              {metrics.outOfStockCount} <span className="text-xs font-normal text-slate-400">out</span>
            </div>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
            <span>Requires reorder</span>
            <button
              onClick={() => onNavigate('alerts')}
              className="text-rose-400 hover:underline flex items-center gap-0.5 text-[11px] font-semibold"
            >
              Review alerts <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Charts & Categorical Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend (7-Days) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                7-Day Sales Trend
              </h3>
              <p className="text-xs text-slate-400">Daily revenue and invoice transaction volume</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-3 h-3 rounded-xs bg-blue-500 inline-block" /> Sales ($)
            </div>
          </div>

          {/* Bar Chart Representation */}
          <div className="h-48 flex items-end gap-3 pt-6 pb-2 border-b border-slate-800">
            {salesTrend.map((trend, i) => {
              const heightPct = Math.max(12, Math.round((trend.sales / maxSale) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <div className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${trend.sales.toFixed(0)}
                  </div>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full bg-gradient-to-t from-blue-700 to-blue-500 rounded-t-lg group-hover:from-blue-600 group-hover:to-blue-400 transition-all duration-300 relative shadow-sm"
                  >
                    {trend.invoice_count > 0 && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-blue-300 font-mono">
                        {trend.invoice_count}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 group-hover:text-slate-200">
                    {trend.day_label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between pt-3 text-xs text-slate-500">
            <span>Past 7 days aggregated from live invoices</span>
            <button
              onClick={() => onNavigate('reports')}
              className="text-blue-400 hover:underline"
            >
              Open comprehensive financial report &rarr;
            </button>
          </div>
        </div>

        {/* Category Valuation Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
              Stock Value by Category
            </h3>
            <p className="text-xs text-slate-400 mb-5">Inventory cost allocation</p>

            <div className="space-y-4">
              {categoryBreakdown.slice(0, 5).map((cat, idx) => {
                const totalVal = metrics.inventoryValue || 1;
                const pct = Math.round((cat.category_value / totalVal) * 100);
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200 truncate">{cat.category_name}</span>
                      <span className="font-mono text-slate-300">
                        ${cat.category_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-amber-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{cat.total_units} units in stock</span>
                      <span>{pct}% of inventory</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => onNavigate('products')}
            className="w-full mt-6 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl transition-colors border border-slate-700/60"
          >
            Explore Category Breakdown
          </button>
        </div>
      </div>

      {/* Bottom Grid: Top Selling & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Top Selling Products
              </h3>
              <p className="text-xs text-slate-400">Ranked by total quantity sold</p>
            </div>
            <button
              onClick={() => onNavigate('sales')}
              className="text-xs text-blue-400 hover:underline font-medium"
            >
              New Sale
            </button>
          </div>

          <div className="space-y-3">
            {topSelling.length > 0 ? (
              topSelling.map((prod, idx) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-mono text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-200">{prod.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{prod.sku}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold font-mono text-emerald-400">
                      ${prod.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-400">{prod.total_sold} units sold</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">No sales recorded yet.</p>
            )}
          </div>
        </div>

        {/* Recent Stock Movement Audit */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Recent Stock Movements
              </h3>
              <p className="text-xs text-slate-400">FIFO IN/OUT ledger audit stream</p>
            </div>
            <button
              onClick={() => onNavigate('movements')}
              className="text-xs text-blue-400 hover:underline font-medium"
            >
              Full Ledger &rarr;
            </button>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {recentMovements.length > 0 ? (
              recentMovements.map((mov) => {
                const isOut = mov.movement_type === 'OUT';
                return (
                  <div
                    key={mov.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/30 border border-slate-800/80 hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                          isOut
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {mov.movement_type}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-200 truncate">
                          {mov.product_name}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                          <span className="font-mono">{mov.reference || 'Stock Update'}</span>
                          <span>&bull;</span>
                          <span>{new Date(mov.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-xs font-bold font-mono ${
                          isOut ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {isOut ? '-' : '+'}{mov.quantity} {mov.unit}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        ${Number(mov.unit_price).toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">No movements recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
