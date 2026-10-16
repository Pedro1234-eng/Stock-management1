import React from 'react';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  ShoppingCart,
  FileText,
  Boxes,
  ArrowLeftRight,
  AlertTriangle,
  BarChart3,
  Users,
  Shield,
  Layers,
  ChevronRight,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'products'
  | 'stock-entry'
  | 'sales'
  | 'invoices'
  | 'batches'
  | 'movements'
  | 'alerts'
  | 'reports'
  | 'master-data';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  lowStockCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  lowStockCount = 0,
}) => {
  const menuItems: { id: NavTab; label: string; icon: React.ElementType; badge?: number; color?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products Catalog', icon: Package },
    { id: 'stock-entry', label: 'Stock Intake (IN)', icon: PlusCircle, color: 'text-emerald-400' },
    { id: 'sales', label: 'Stock Out & POS', icon: ShoppingCart, color: 'text-amber-400' },
    { id: 'invoices', label: 'Sales Invoices', icon: FileText },
    { id: 'batches', label: 'FIFO Batches', icon: Boxes },
    { id: 'movements', label: 'Stock Movements', icon: ArrowLeftRight },
    {
      id: 'alerts',
      label: 'Inventory Alerts',
      icon: AlertTriangle,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      color: lowStockCount > 0 ? 'text-amber-400' : undefined,
    },
    { id: 'reports', label: 'Financial & Reports', icon: BarChart3 },
    { id: 'master-data', label: 'Suppliers & Customers', icon: Users },
  ];

  const handleTabClick = (tab: NavTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 bg-slate-900/50">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>ApexStock</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                PRO
              </span>
            </div>
            <div className="text-[11px] text-slate-400 truncate">FIFO Inventory Engine</div>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Inventory Operations
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : item.color || 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                      isActive
                        ? 'bg-white text-blue-700'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* System & FIFO Engine Status in Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                PostgreSQL Live
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1 rounded">
                CONNECTED
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              FIFO batch ordering active. Stock transactions protected by SQL atomicity.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
