import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  CheckCircle2,
  Filter,
  Search,
  ArrowUpDown,
  Download,
  Info,
  Layers,
  Calendar,
  Building,
  Tag,
  ArrowRight,
  Maximize2,
  Percent,
} from 'lucide-react';
import { BatchProfitabilityItem, BatchProfitabilityReport } from '../types/index.ts';

interface BatchProfitMarginSectionProps {
  data: BatchProfitabilityReport | null;
  loading: boolean;
  onRefresh: () => void;
  statusFilter: 'completed' | 'all';
  setStatusFilter: (status: 'completed' | 'all') => void;
}

export const BatchProfitMarginSection: React.FC<BatchProfitMarginSectionProps> = ({
  data,
  loading,
  onRefresh,
  statusFilter,
  setStatusFilter,
}) => {
  // View mode: Unit Economics ($ per unit) vs Total Batch Value ($ total)
  const [viewMetric, setViewMetric] = useState<'unit' | 'total'>('unit');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'margin_desc' | 'margin_asc' | 'profit_desc' | 'revenue_desc' | 'date_desc'>('margin_desc');
  const [hoveredBatchId, setHoveredBatchId] = useState<number | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

  const batches = data?.batches || [];
  const summary = data?.summary;

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    batches.forEach((b) => {
      if (b.category_name) set.add(b.category_name);
    });
    return Array.from(set).sort();
  }, [batches]);

  // Filtered & sorted batches
  const filteredBatches = useMemo(() => {
    return batches
      .filter((b) => {
        if (categoryFilter !== 'ALL' && b.category_name !== categoryFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesBatch = b.batch_number.toLowerCase().includes(q);
          const matchesProduct = b.product_name.toLowerCase().includes(q);
          const matchesSku = b.sku.toLowerCase().includes(q);
          const matchesSupplier = b.supplier_name?.toLowerCase().includes(q);
          if (!matchesBatch && !matchesProduct && !matchesSku && !matchesSupplier) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'margin_desc') return b.profit_margin_pct - a.profit_margin_pct;
        if (sortBy === 'margin_asc') return a.profit_margin_pct - b.profit_margin_pct;
        if (sortBy === 'profit_desc') return b.realized_profit - a.realized_profit;
        if (sortBy === 'revenue_desc') return b.realized_sales_revenue - a.realized_sales_revenue;
        if (sortBy === 'date_desc') return new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime();
        return 0;
      });
  }, [batches, categoryFilter, searchQuery, sortBy]);

  // Selected batch for deep inspection
  const activeBatch = useMemo(() => {
    if (selectedBatchId) {
      return batches.find((b) => b.batch_id === selectedBatchId) || batches[0];
    }
    if (hoveredBatchId) {
      return batches.find((b) => b.batch_id === hoveredBatchId) || batches[0];
    }
    return batches[0] || null;
  }, [selectedBatchId, hoveredBatchId, batches]);

  // Calculations for chart scaling
  const maxChartValue = useMemo(() => {
    if (filteredBatches.length === 0) return 100;
    if (viewMetric === 'unit') {
      const maxVal = Math.max(
        ...filteredBatches.map((b) => Math.max(b.unit_purchase_price, b.realized_unit_price))
      );
      return Math.ceil(maxVal * 1.15);
    } else {
      const maxVal = Math.max(
        ...filteredBatches.map((b) => Math.max(b.total_purchase_cost, b.realized_sales_revenue))
      );
      return Math.ceil(maxVal * 1.15);
    }
  }, [filteredBatches, viewMetric]);

  // CSV export handler for this report
  const exportBatchProfitCSV = () => {
    if (filteredBatches.length === 0) return;
    const headers = [
      'Batch Number',
      'Product Name',
      'SKU',
      'Category',
      'Supplier',
      'Purchase Date',
      'Units Received',
      'Units Sold',
      'Unit Purchase Cost ($)',
      'Realized Unit Sale Price ($)',
      'Total Batch Cost ($)',
      'Total Realized Revenue ($)',
      'Realized Gross Profit ($)',
      'Profit Margin (%)',
      'Markup (%)',
      'Status',
    ];

    const rows = filteredBatches.map((b) => [
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
      b.is_completed ? 'Completed (100% Depleted)' : 'Active / In Progress',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `batch_profit_margin_report_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Overview Metric Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
              <span>Batches Analyzed</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-2xl font-black font-mono text-white mt-1">
              {summary.totalCompletedBatches}
              <span className="text-xs text-slate-400 font-sans ml-1">
                / {summary.totalAnalyzedBatches} batches
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {summary.totalCompletedBatches} fully exhausted cycles
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
              <span>Realized Revenue</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black font-mono text-white mt-1">
              ${summary.totalRealizedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              From {summary.totalUnitsSold.toLocaleString()} units sold
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
              <span>Original Cost (COGS)</span>
              <span className="w-2 h-2 rounded-full bg-rose-400" />
            </div>
            <div className="text-2xl font-black font-mono text-rose-300 mt-1">
              ${summary.totalPurchaseCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Historical procurement cost
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
              <span>Realized Profit</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
              +${summary.totalRealizedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-emerald-500/80 mt-0.5">
              Net gross margin realized
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden col-span-2 lg:col-span-1">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
              <span>Average Margin</span>
              <Percent className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-2xl font-black font-mono text-blue-400 mt-1 flex items-baseline gap-1">
              {summary.overallMarginPct}%
              <span className="text-[10px] font-sans px-1.5 py-0.5 bg-blue-500/10 text-blue-300 rounded-md border border-blue-500/20">
                Healthy
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Weighted gross margin %
            </p>
          </div>
        </div>
      )}

      {/* Main Visualization & Interactive Chart Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Top Control Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                <BarChart3 className="w-4 h-4" />
              </span>
              <h3 className="font-black text-sm text-white tracking-tight">
                Batch Profit Margin Comparison: Purchase Cost vs. Realized Sales
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Side-by-side bar chart benchmarking procurement purchase cost against actual realized selling prices for closed inventory batches.
            </p>
          </div>

          {/* Interactive Metric Switcher & Export */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Metric Mode: Unit Price vs Total Revenue */}
            <div className="inline-flex p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                onClick={() => setViewMetric('unit')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMetric === 'unit'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Unit Economics ($/unit)
              </button>
              <button
                onClick={() => setViewMetric('total')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMetric === 'total'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Total Batch Value ($)
              </button>
            </div>

            {/* Scope Filter: Completed vs All */}
            <div className="inline-flex p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'completed'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Completed (100% Depleted)
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Batches with Sales
              </button>
            </div>

            <button
              onClick={exportBatchProfitCSV}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
              title="Download CSV report of batch margins"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Filters & Search Row */}
        <div className="p-3.5 bg-slate-950/30 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search batch # or product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-hidden focus:border-blue-500 w-44 sm:w-56"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-hidden focus:border-blue-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Sort Order */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-hidden focus:border-blue-500"
            >
              <option value="margin_desc">Highest Margin % first</option>
              <option value="margin_asc">Lowest Margin % first</option>
              <option value="profit_desc">Highest Realized Profit ($)</option>
              <option value="revenue_desc">Highest Sales Revenue ($)</option>
              <option value="date_desc">Newest Batch Date</option>
            </select>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-rose-500/80 border border-rose-400 inline-block" />
              <span className="text-slate-400">
                {viewMetric === 'unit' ? 'Unit Purchase Cost' : 'Total Batch Cost'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-500 border border-emerald-400 inline-block shadow-xs shadow-emerald-500/50" />
              <span className="text-slate-300 font-medium">
                {viewMetric === 'unit' ? 'Realized Sale Price' : 'Realized Sales Revenue'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                +XX%
              </span>
              <span className="text-slate-400">Margin %</span>
            </div>
          </div>
        </div>

        {/* Interactive Bar Chart Canvas */}
        <div className="p-4 sm:p-6 bg-slate-900/40">
          {loading ? (
            <div className="h-72 flex items-center justify-center text-slate-400 gap-2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Computing batch profitability & margins...</span>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-xl">
              <Info className="w-8 h-8 text-slate-500 mb-2" />
              <p className="text-sm font-semibold text-slate-300">No completed batches match the criteria</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Try switching to "All Batches with Sales" or clear the category and search filters.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Responsive Bar Chart View */}
              <div className="relative pt-6 pb-2">
                {/* Y-Axis Gridlines & Reference Markers */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 border-b border-slate-700">
                  <div className="border-b border-slate-600 flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>${maxChartValue.toLocaleString()}</span>
                  </div>
                  <div className="border-b border-slate-700 flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>${(maxChartValue * 0.75).toFixed(0)}</span>
                  </div>
                  <div className="border-b border-slate-700 flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>${(maxChartValue * 0.5).toFixed(0)}</span>
                  </div>
                  <div className="border-b border-slate-700 flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>${(maxChartValue * 0.25).toFixed(0)}</span>
                  </div>
                  <div className="border-b border-slate-700 flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>$0</span>
                  </div>
                </div>

                {/* Bars Container */}
                <div className="h-64 sm:h-72 flex items-end gap-2 sm:gap-4 overflow-x-auto pb-6 pt-8 px-2 relative z-10 scrollbar-thin">
                  {filteredBatches.map((batch) => {
                    const costVal = viewMetric === 'unit' ? batch.unit_purchase_price : batch.total_purchase_cost;
                    const salesVal = viewMetric === 'unit' ? batch.realized_unit_price : batch.realized_sales_revenue;

                    const costHeightPct = Math.max(6, Math.min(100, Math.round((costVal / maxChartValue) * 100)));
                    const salesHeightPct = Math.max(8, Math.min(100, Math.round((salesVal / maxChartValue) * 100)));

                    const isHovered = hoveredBatchId === batch.batch_id;
                    const isSelected = selectedBatchId === batch.batch_id;

                    // Margin color badge
                    const marginColor =
                      batch.profit_margin_pct >= 40
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : batch.profit_margin_pct >= 30
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

                    return (
                      <div
                        key={batch.batch_id}
                        onMouseEnter={() => setHoveredBatchId(batch.batch_id)}
                        onMouseLeave={() => setHoveredBatchId(null)}
                        onClick={() => setSelectedBatchId(batch.batch_id === selectedBatchId ? null : batch.batch_id)}
                        className={`flex-1 min-w-[76px] sm:min-w-[96px] max-w-[130px] flex flex-col items-center h-full justify-end cursor-pointer group relative rounded-xl p-1 transition-all ${
                          isSelected
                            ? 'bg-blue-950/40 ring-2 ring-blue-500/60 shadow-lg'
                            : isHovered
                            ? 'bg-slate-800/40'
                            : ''
                        }`}
                      >
                        {/* Profit Margin Pill pinned above the taller bar */}
                        <div className="mb-2 text-center transition-transform group-hover:scale-105">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded-md font-mono text-[10px] font-black border tracking-tight shadow-xs ${marginColor}`}
                          >
                            +{batch.profit_margin_pct}%
                          </span>
                        </div>

                        {/* Dual Bar Pair: Cost vs Realized Sales */}
                        <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                          {/* Purchase Cost Bar */}
                          <div className="flex-1 flex flex-col items-center justify-end h-full group/bar">
                            <div
                              style={{ height: `${costHeightPct}%` }}
                              className="w-full bg-gradient-to-t from-rose-950 via-rose-800 to-rose-600/90 rounded-t-md border-t border-x border-rose-500/60 transition-all duration-300 group-hover:from-rose-900 group-hover:to-rose-500 relative flex items-start justify-center pt-1"
                            >
                              <span className="text-[9px] font-mono text-rose-200 font-bold opacity-0 group-hover:opacity-100 transition-opacity truncate px-0.5">
                                ${costVal >= 100 ? costVal.toFixed(0) : costVal.toFixed(1)}
                              </span>
                            </div>
                          </div>

                          {/* Realized Sales Bar */}
                          <div className="flex-1 flex flex-col items-center justify-end h-full group/bar">
                            <div
                              style={{ height: `${salesHeightPct}%` }}
                              className="w-full bg-gradient-to-t from-emerald-950 via-emerald-700 to-emerald-400 rounded-t-md border-t border-x border-emerald-400/80 transition-all duration-300 group-hover:from-emerald-800 group-hover:to-emerald-300 shadow-xs shadow-emerald-500/20 relative flex items-start justify-center pt-1"
                            >
                              <span className="text-[9px] font-mono text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity truncate px-0.5">
                                ${salesVal >= 100 ? salesVal.toFixed(0) : salesVal.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Batch Lot Code & Product Name */}
                        <div className="mt-2 text-center w-full">
                          <div className="text-[10px] font-mono font-bold text-slate-200 truncate group-hover:text-blue-400">
                            {batch.batch_number}
                          </div>
                          <div className="text-[9px] text-slate-400 truncate max-w-[85px] mx-auto">
                            {batch.product_name}
                          </div>
                        </div>

                        {/* Floating Tooltip Card */}
                        {isHovered && (
                          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-64 p-3 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-30 pointer-events-none text-left">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                              <span className="font-mono font-bold text-xs text-white">
                                {batch.batch_number}
                              </span>
                              {batch.is_completed ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  100% Depleted
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  In Progress
                                </span>
                              )}
                            </div>

                            <p className="text-xs font-semibold text-slate-200 mt-1.5">
                              {batch.product_name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {batch.sku} • {batch.category_name}
                            </p>

                            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono">
                              <div>
                                <span className="text-slate-400 block text-[9px]">ORIGINAL COST</span>
                                <span className="text-rose-400 font-bold">
                                  ${batch.unit_purchase_price.toFixed(2)} / {batch.unit}
                                </span>
                                <span className="text-slate-400 block text-[9px] mt-0.5">
                                  Total: ${batch.total_purchase_cost.toFixed(2)}
                                </span>
                              </div>

                              <div>
                                <span className="text-slate-400 block text-[9px]">REALIZED SALE</span>
                                <span className="text-emerald-400 font-bold">
                                  ${batch.realized_unit_price.toFixed(2)} / {batch.unit}
                                </span>
                                <span className="text-slate-400 block text-[9px] mt-0.5">
                                  Total: ${batch.realized_sales_revenue.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                              <span className="text-[10px] font-medium text-slate-400">Profit Margin:</span>
                              <div className="flex items-center gap-1 font-mono font-bold text-emerald-400">
                                <span>+${batch.realized_profit.toFixed(2)}</span>
                                <span className="text-emerald-300">({batch.profit_margin_pct}%)</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Selected Batch Drill-Down Card */}
        {activeBatch && (
          <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-white">
                    {activeBatch.batch_number}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-semibold text-slate-200">
                    {activeBatch.product_name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {activeBatch.sku}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3">
                  <span>Purchased: {new Date(activeBatch.purchase_date).toLocaleDateString()}</span>
                  <span>Supplier: {activeBatch.supplier_name || 'Standard'}</span>
                  <span>
                    Volume: {activeBatch.units_sold} / {activeBatch.quantity_received} {activeBatch.unit} (100% Sold)
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Economics Breakdown */}
            <div className="flex items-center gap-4 text-xs font-mono bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
              <div>
                <span className="text-[9px] text-slate-400 block font-sans">PURCHASE COST</span>
                <span className="text-rose-400 font-bold">
                  ${activeBatch.unit_purchase_price.toFixed(2)}
                  <span className="text-slate-400 text-[10px]"> (${activeBatch.total_purchase_cost.toFixed(0)})</span>
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600" />
              <div>
                <span className="text-[9px] text-slate-400 block font-sans">REALIZED SALE</span>
                <span className="text-emerald-400 font-bold">
                  ${activeBatch.realized_unit_price.toFixed(2)}
                  <span className="text-slate-400 text-[10px]"> (${activeBatch.realized_sales_revenue.toFixed(0)})</span>
                </span>
              </div>
              <div className="pl-2 border-l border-slate-800">
                <span className="text-[9px] text-slate-400 block font-sans">PROFIT / MARGIN</span>
                <span className="text-emerald-300 font-black">
                  +${activeBatch.realized_profit.toFixed(2)}{' '}
                  <span className="text-blue-400">({activeBatch.profit_margin_pct}%)</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Batch Profitability Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-100">
              Completed Batch Ledger & Unit Economics
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
              {filteredBatches.length} records
            </span>
          </div>

          <div className="text-xs text-slate-400">
            Click any row to inspect & compare in chart
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] font-bold uppercase text-slate-400">
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Product Name & SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Completed Units</th>
                <th className="py-3 px-4 text-right">Unit Purchase Cost</th>
                <th className="py-3 px-4 text-right">Realized Unit Sale</th>
                <th className="py-3 px-4 text-right">Total Batch Cost</th>
                <th className="py-3 px-4 text-right">Realized Sales Total</th>
                <th className="py-3 px-4 text-right font-bold text-emerald-400">Realized Profit</th>
                <th className="py-3 px-4 text-right font-bold text-white">Profit Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
              {filteredBatches.map((b) => {
                const isSelected = selectedBatchId === b.batch_id;
                const marginBadgeClass =
                  b.profit_margin_pct >= 40
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : b.profit_margin_pct >= 30
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20';

                return (
                  <tr
                    key={b.batch_id}
                    onClick={() => setSelectedBatchId(b.batch_id === selectedBatchId ? null : b.batch_id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-900/20 hover:bg-blue-900/30'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{b.batch_number}</span>
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-semibold text-slate-100">{b.product_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{b.sku}</div>
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-400">
                      {b.category_name || 'General'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-200">
                        {b.units_sold} / {b.quantity_received}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-sans">
                        {b.unit} (100% sold)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-rose-400">
                      ${b.unit_purchase_price.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-400 font-bold">
                      ${b.realized_unit_price.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-300">
                      ${b.total_purchase_cost.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-100 font-bold">
                      ${b.realized_sales_revenue.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-400">
                      +${b.realized_profit.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md font-bold text-xs border ${marginBadgeClass}`}
                      >
                        +{b.profit_margin_pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
