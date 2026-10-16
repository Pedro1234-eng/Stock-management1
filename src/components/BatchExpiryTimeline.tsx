import React, { useState, useMemo } from 'react';
import {
  Clock,
  AlertTriangle,
  AlertOctagon,
  Calendar,
  Layers,
  List,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  DollarSign,
  Boxes,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Product } from '../types/index.ts';

export interface ExpiryBatchItem {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  unit: string;
  supplier_id?: number | null;
  supplier_name?: string;
  batch_number: string;
  purchase_date: string;
  expiry_date: string;
  quantity_received: number;
  quantity_remaining: number;
  purchase_price: number;
  days_until_expiry: number;
}

interface BatchExpiryTimelineProps {
  batches: ExpiryBatchItem[];
  selectedProductId: number | '';
  products: Product[];
  onSelectProduct: (productId: number) => void;
  onOpenAdjust: (batch: any) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export const BatchExpiryTimeline: React.FC<BatchExpiryTimelineProps> = ({
  batches,
  selectedProductId,
  products,
  onSelectProduct,
  onOpenAdjust,
  onRefresh,
  loading = false,
}) => {
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [scope, setScope] = useState<'all' | 'selected'>('all');
  const [filterTier, setFilterTier] = useState<'ALL' | 'CRITICAL' | 'APPROACHING' | 'SAFE' | 'EXPIRED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter batches based on scope, search, and urgency tier
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      // 1. Scope filter
      if (scope === 'selected' && selectedProductId) {
        if (b.product_id !== Number(selectedProductId)) return false;
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = b.product_name?.toLowerCase().includes(q);
        const matchSku = b.sku?.toLowerCase().includes(q);
        const matchBatch = b.batch_number?.toLowerCase().includes(q);
        const matchSupplier = b.supplier_name?.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchBatch && !matchSupplier) return false;
      }

      // 3. Urgency Tier filter
      const days = b.days_until_expiry;
      if (filterTier === 'EXPIRED') return days < 0;
      if (filterTier === 'CRITICAL') return days >= 0 && days <= 30;
      if (filterTier === 'APPROACHING') return days > 30 && days <= 60;
      if (filterTier === 'SAFE') return days > 60;

      return true;
    });
  }, [batches, scope, selectedProductId, searchQuery, filterTier]);

  // Key metrics calculation
  const metrics = useMemo(() => {
    const relevant = scope === 'selected' && selectedProductId
      ? batches.filter((b) => b.product_id === Number(selectedProductId))
      : batches;

    const expired = relevant.filter((b) => b.days_until_expiry < 0);
    const critical30 = relevant.filter((b) => b.days_until_expiry >= 0 && b.days_until_expiry <= 30);
    const approaching = relevant.filter((b) => b.days_until_expiry > 30 && b.days_until_expiry <= 60);
    const safe = relevant.filter((b) => b.days_until_expiry > 60);

    const valueAtRisk30 = critical30.reduce(
      (sum, b) => sum + (b.quantity_remaining * (b.purchase_price || 0)),
      0
    );
    const expiredLoss = expired.reduce(
      (sum, b) => sum + (b.quantity_remaining * (b.purchase_price || 0)),
      0
    );

    return {
      total: relevant.length,
      expiredCount: expired.length,
      critical30Count: critical30.length,
      approachingCount: approaching.length,
      safeCount: safe.length,
      valueAtRisk30,
      expiredLoss,
    };
  }, [batches, scope, selectedProductId]);

  // Color & Badge helper based on days remaining
  const getUrgencyConfig = (days: number) => {
    if (days < 0) {
      return {
        tier: 'EXPIRED',
        label: `Expired ${Math.abs(days)}d ago`,
        subLabel: 'Immediate write-off / quarantine',
        textColor: 'text-rose-400',
        borderColor: 'border-rose-500/50',
        bgCard: 'bg-rose-950/20',
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        accentBar: 'bg-rose-500',
        glowRing: 'ring-1 ring-rose-500/50 shadow-rose-900/30',
        icon: AlertOctagon,
        isCritical30: false,
        isExpired: true,
      };
    }
    if (days <= 30) {
      return {
        tier: 'CRITICAL',
        label: days === 0 ? 'Expires TODAY!' : days === 1 ? 'Expires TOMORROW!' : `Expires in ${days} days`,
        subLabel: 'Within 30-day threshold',
        textColor: 'text-amber-300',
        borderColor: 'border-amber-500/60',
        bgCard: 'bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900',
        badgeBg: 'bg-amber-500/25 text-amber-300 border-amber-500/50 font-black',
        accentBar: 'bg-amber-500',
        glowRing: 'ring-1 ring-amber-500/50 shadow-lg shadow-amber-950/40',
        icon: AlertTriangle,
        isCritical30: true,
        isExpired: false,
      };
    }
    if (days <= 60) {
      return {
        tier: 'APPROACHING',
        label: `Expires in ${days} days`,
        subLabel: '31–60 days window',
        textColor: 'text-yellow-300',
        borderColor: 'border-yellow-500/30',
        bgCard: 'bg-slate-900/90',
        badgeBg: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30 font-semibold',
        accentBar: 'bg-yellow-400',
        glowRing: 'border-yellow-500/20',
        icon: Clock,
        isCritical30: false,
        isExpired: false,
      };
    }
    return {
      tier: 'SAFE',
      label: `Expires in ${days} days`,
      subLabel: '> 60 days remaining',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      bgCard: 'bg-slate-900/90',
      badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-medium',
      accentBar: 'bg-emerald-500',
      glowRing: 'border-emerald-500/20',
      icon: CheckCircle2,
      isCritical30: false,
      isExpired: false,
    };
  };

  const selectedProductObj = products.find((p) => p.id === Number(selectedProductId));

  // Time groupings for timeline mode
  const timelineGroups = useMemo(() => {
    const expiredList: ExpiryBatchItem[] = [];
    const criticalList: ExpiryBatchItem[] = [];
    const approachingList: ExpiryBatchItem[] = [];
    const safeList: ExpiryBatchItem[] = [];

    filteredBatches.forEach((b) => {
      if (b.days_until_expiry < 0) expiredList.push(b);
      else if (b.days_until_expiry <= 30) criticalList.push(b);
      else if (b.days_until_expiry <= 60) approachingList.push(b);
      else safeList.push(b);
    });

    return [
      {
        id: 'expired',
        title: 'Overdue & Expired',
        subtitle: 'Past expiry date – Requires physical audit / write-off',
        items: expiredList,
        accent: 'rose',
        badgeStyle: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        dotColor: 'bg-rose-500',
        timelineLine: 'border-rose-500/40',
        isCritical: false,
      },
      {
        id: 'critical',
        title: 'Critical Expiry: Next 30 Days',
        subtitle: 'High Priority – Sell or discount before expiration date',
        items: criticalList,
        accent: 'amber',
        badgeStyle: 'bg-amber-500/25 text-amber-300 border-amber-500/50',
        dotColor: 'bg-amber-400 ring-4 ring-amber-500/30 animate-pulse',
        timelineLine: 'border-amber-500/50',
        isCritical: true,
      },
      {
        id: 'approaching',
        title: 'Approaching Expiry: 31 – 60 Days',
        subtitle: 'Monitor stock velocity and FIFO rotation schedule',
        items: approachingList,
        accent: 'yellow',
        badgeStyle: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        dotColor: 'bg-yellow-400',
        timelineLine: 'border-yellow-500/30',
        isCritical: false,
      },
      {
        id: 'safe',
        title: 'Stable Shelf Life: > 60 Days',
        subtitle: 'Healthy shelf life buffer',
        items: safeList,
        accent: 'emerald',
        badgeStyle: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        dotColor: 'bg-emerald-400',
        timelineLine: 'border-emerald-500/30',
        isCritical: false,
      },
    ].filter((group) => group.items.length > 0 || filterTier === 'ALL');
  }, [filteredBatches, filterTier]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-all">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                Batch Expiration Timeline & Risk Radar
              </h2>
              {metrics.critical30Count > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {metrics.critical30Count} {metrics.critical30Count === 1 ? 'batch' : 'batches'} &le; 30d
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological horizon tracking perishable FIFO inventory lots, highlighting items within the 30-day critical window.
            </p>
          </div>
        </div>

        {/* View Controls & Collapse */}
        <div className="flex items-center gap-2 self-end lg:self-auto flex-wrap">
          {/* Scope Selector: All vs Current Product */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-1 flex items-center text-xs">
            <button
              onClick={() => setScope('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                scope === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Batches
            </button>
            <button
              onClick={() => setScope('selected')}
              disabled={!selectedProductId}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                scope === 'selected'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              Current Product {selectedProductObj ? `(${selectedProductObj.sku})` : ''}
            </button>
          </div>

          {/* View Toggle: Timeline vs List */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-1 flex items-center text-xs">
            <button
              onClick={() => setViewMode('timeline')}
              title="Timeline Visual Flow"
              className={`p-1.5 px-2.5 rounded-lg flex items-center gap-1.5 font-semibold transition-all ${
                viewMode === 'timeline'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Timeline</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Priority List View"
              className={`p-1.5 px-2.5 rounded-lg flex items-center gap-1.5 font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Refresh expiry data"
              className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Toggle Expand / Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-colors"
            title={isExpanded ? 'Collapse Timeline' : 'Expand Timeline'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content Area */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* Summary KPI Mini-Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* 1. Critical &le; 30 Days (Highlight Tier) */}
            <div
              onClick={() => setFilterTier(filterTier === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                filterTier === 'CRITICAL'
                  ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-950/30'
                  : 'bg-gradient-to-br from-amber-950/20 via-slate-950 to-slate-950 border-amber-500/30 hover:border-amber-500/60'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-amber-400 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  &le; 30 Days Window
                </span>
                <span className="text-base font-black font-mono">{metrics.critical30Count}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-[11px] text-slate-400">At-Risk Valuation:</span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  ${metrics.valueAtRisk30.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* 2. Approaching (31 - 60 Days) */}
            <div
              onClick={() => setFilterTier(filterTier === 'APPROACHING' ? 'ALL' : 'APPROACHING')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                filterTier === 'APPROACHING'
                  ? 'bg-yellow-950/40 border-yellow-500 shadow-lg'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-yellow-300 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-yellow-400" />
                  31 – 60 Days
                </span>
                <span className="text-base font-black font-mono">{metrics.approachingCount}</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Rotation window</div>
            </div>

            {/* 3. Expired Batches (< 0 Days) */}
            <div
              onClick={() => setFilterTier(filterTier === 'EXPIRED' ? 'ALL' : 'EXPIRED')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                filterTier === 'EXPIRED'
                  ? 'bg-rose-950/40 border-rose-500 shadow-lg'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-rose-400 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  Overdue / Expired
                </span>
                <span className="text-base font-black font-mono">{metrics.expiredCount}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-[11px] text-slate-400">Loss to Write Off:</span>
                <span className="text-xs font-mono font-bold text-rose-300">
                  ${metrics.expiredLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* 4. Safe / Healthy (> 60 Days) */}
            <div
              onClick={() => setFilterTier(filterTier === 'SAFE' ? 'ALL' : 'SAFE')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                filterTier === 'SAFE'
                  ? 'bg-emerald-950/40 border-emerald-500 shadow-lg'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-emerald-400 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Safe (&gt; 60 Days)
                </span>
                <span className="text-base font-black font-mono">{metrics.safeCount}</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Total tracked: {metrics.total}</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            {/* Quick Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
              <button
                onClick={() => setFilterTier('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border ${
                  filterTier === 'ALL'
                    ? 'bg-slate-800 text-white border-slate-600'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                All Horizons ({batches.length})
              </button>
              <button
                onClick={() => setFilterTier('CRITICAL')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                  filterTier === 'CRITICAL'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md'
                    : 'bg-amber-950/20 text-amber-300 border-amber-500/30 hover:border-amber-500/60'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                &le; 30 Days ({metrics.critical30Count})
              </button>
              <button
                onClick={() => setFilterTier('APPROACHING')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border ${
                  filterTier === 'APPROACHING'
                    ? 'bg-yellow-500 text-slate-950 border-yellow-400'
                    : 'bg-slate-950 text-yellow-400/80 border-slate-800 hover:border-yellow-500/40'
                }`}
              >
                31 – 60 Days ({metrics.approachingCount})
              </button>
              <button
                onClick={() => setFilterTier('EXPIRED')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border ${
                  filterTier === 'EXPIRED'
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-slate-950 text-rose-400/80 border-slate-800 hover:border-rose-500/40'
                }`}
              >
                Expired ({metrics.expiredCount})
              </button>
            </div>

            {/* Search Box */}
            <div className="relative min-w-[200px] sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search batch or product..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="py-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-blue-400" />
              Scanning inventory lots & calculating expiry horizons...
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredBatches.length === 0 && (
            <div className="py-12 text-center rounded-xl bg-slate-950/40 border border-slate-800/80">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-white">No Batches Match Selected Filter</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {filterTier === 'CRITICAL'
                  ? 'Great news! No inventory lots are currently expiring within the 30-day critical threshold.'
                  : 'No active stock batches found with the current filter criteria.'}
              </p>
              {filterTier !== 'ALL' && (
                <button
                  onClick={() => setFilterTier('ALL')}
                  className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-colors"
                >
                  Show All Horizons
                </button>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* VIEW 1: CHRONOLOGICAL TIMELINE VIEW                 */}
          {/* ==================================================== */}
          {!loading && viewMode === 'timeline' && filteredBatches.length > 0 && (
            <div className="space-y-6 pt-2">
              {timelineGroups.map((group) => {
                if (group.items.length === 0) return null;

                return (
                  <div key={group.id} className="relative">
                    {/* Horizon Section Header */}
                    <div className="flex items-center gap-3 mb-3.5">
                      <div className={`w-3 h-3 rounded-full ${group.dotColor} shrink-0`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                            {group.title}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${group.badgeStyle}`}>
                            {group.items.length} {group.items.length === 1 ? 'batch' : 'batches'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{group.subtitle}</p>
                      </div>
                    </div>

                    {/* Timeline Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pl-5 border-l-2 border-slate-800">
                      {group.items.map((batch) => {
                        const cfg = getUrgencyConfig(batch.days_until_expiry);
                        const IconComponent = cfg.icon;
                        const valuation = batch.quantity_remaining * (batch.purchase_price || 0);
                        const isCurrentProduct = Number(selectedProductId) === batch.product_id;

                        return (
                          <div
                            key={batch.id}
                            className={`relative rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between ${cfg.bgCard} ${cfg.borderColor} ${cfg.glowRing} ${
                              cfg.isCritical30 ? 'shadow-md shadow-amber-950/30' : ''
                            }`}
                          >
                            {/* Top row: Urgency Badge + Expiry Date */}
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2.5">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] border ${cfg.badgeBg}`}>
                                  <IconComponent className="w-3.5 h-3.5 shrink-0" />
                                  <span>{cfg.label}</span>
                                </span>

                                <div className="text-right">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                                    Expires
                                  </span>
                                  <span className="font-mono text-xs font-bold text-slate-200">
                                    {new Date(batch.expiry_date).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>

                              {/* Product & SKU */}
                              <div className="mb-2">
                                <h4 className="font-bold text-sm text-white line-clamp-1" title={batch.product_name}>
                                  {batch.product_name}
                                </h4>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                  <span className="font-mono font-semibold text-blue-400">{batch.sku}</span>
                                  <span>&bull;</span>
                                  <span className="font-mono text-slate-300 font-semibold">{batch.batch_number}</span>
                                </div>
                              </div>

                              {/* Supplier */}
                              {batch.supplier_name && (
                                <p className="text-[11px] text-slate-400 mb-3 truncate">
                                  Supplier: <span className="text-slate-300">{batch.supplier_name}</span>
                                </p>
                              )}

                              {/* Visual Shelf-life Bar */}
                              <div className="space-y-1 mb-3">
                                <div className="flex items-center justify-between text-[10px] text-slate-400">
                                  <span>Shelf Life Urgency</span>
                                  <span className={cfg.textColor}>
                                    {batch.days_until_expiry < 0
                                      ? 'Exceeded'
                                      : batch.days_until_expiry <= 30
                                      ? 'Critical (<30d)'
                                      : `${batch.days_until_expiry}d left`}
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                  <div
                                    className={`h-full transition-all ${cfg.accentBar}`}
                                    style={{
                                      width: `${
                                        batch.days_until_expiry < 0
                                          ? 100
                                          : Math.max(10, Math.min(100, ((90 - batch.days_until_expiry) / 90) * 100))
                                      }%`,
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Stock & Financial Stats */}
                              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs mb-3 font-mono">
                                <div>
                                  <span className="text-[10px] uppercase text-slate-400 block font-sans">Remaining</span>
                                  <span className="font-black text-sm text-emerald-400">
                                    {batch.quantity_remaining} <span className="text-[10px] font-normal text-slate-400 font-sans">{batch.unit}</span>
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] uppercase text-slate-400 block font-sans">Cost Value</span>
                                  <span className="font-bold text-xs text-slate-200">
                                    ${valuation.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Card Action Buttons */}
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                              <button
                                onClick={() => onOpenAdjust(batch)}
                                className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                title="Open physical audit adjustment or write-off"
                              >
                                <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                                <span>Adjust / Write Off</span>
                              </button>

                              {!isCurrentProduct && (
                                <button
                                  onClick={() => onSelectProduct(batch.product_id)}
                                  className="py-1.5 px-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                                  title="Switch product table to this item"
                                >
                                  <span>View Product</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ==================================================== */}
          {/* VIEW 2: HIGH-DENSITY PRIORITY LIST VIEW             */}
          {/* ==================================================== */}
          {!loading && viewMode === 'list' && filteredBatches.length > 0 && (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Urgency Status</th>
                      <th className="py-3 px-4">Product Name & SKU</th>
                      <th className="py-3 px-4">Batch Number</th>
                      <th className="py-3 px-4">Expiry Date</th>
                      <th className="py-3 px-4 text-right">Remaining Units</th>
                      <th className="py-3 px-4 text-right">Cost Value</th>
                      <th className="py-3 px-4 text-right">Supplier</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredBatches.map((batch) => {
                      const cfg = getUrgencyConfig(batch.days_until_expiry);
                      const IconComponent = cfg.icon;
                      const valuation = batch.quantity_remaining * (batch.purchase_price || 0);
                      const isCurrentProduct = Number(selectedProductId) === batch.product_id;

                      return (
                        <tr
                          key={batch.id}
                          className={`hover:bg-slate-850/60 transition-colors ${
                            cfg.isCritical30 ? 'bg-amber-950/15' : ''
                          }`}
                        >
                          {/* Urgency Badge */}
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] border whitespace-nowrap ${cfg.badgeBg}`}>
                              <IconComponent className="w-3 h-3" />
                              <span>{cfg.label}</span>
                            </span>
                          </td>

                          {/* Product */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-white line-clamp-1">{batch.product_name}</div>
                            <div className="font-mono text-[10px] text-blue-400">{batch.sku}</div>
                          </td>

                          {/* Batch Number */}
                          <td className="py-3 px-4 font-mono font-bold text-slate-200">
                            {batch.batch_number}
                          </td>

                          {/* Expiry Date */}
                          <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{new Date(batch.expiry_date).toLocaleDateString()}</span>
                            </div>
                          </td>

                          {/* Units */}
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                            {batch.quantity_remaining} {batch.unit}
                          </td>

                          {/* Valuation */}
                          <td className="py-3 px-4 text-right font-mono text-slate-200">
                            ${valuation.toFixed(2)}
                          </td>

                          {/* Supplier */}
                          <td className="py-3 px-4 text-right text-slate-400 truncate max-w-[140px]">
                            {batch.supplier_name || 'Direct'}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onOpenAdjust(batch)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1"
                                title="Adjust stock or record damage write-off"
                              >
                                <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                                <span>Adjust</span>
                              </button>

                              {!isCurrentProduct && (
                                <button
                                  onClick={() => onSelectProduct(batch.product_id)}
                                  className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1"
                                  title="View in product batch table"
                                >
                                  <span>View</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
