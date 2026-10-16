import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar.tsx';
import { Navbar } from './components/Navbar.tsx';
import { ToastProvider, useToast } from './components/Toast.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { ProductsPage } from './pages/ProductsPage.tsx';
import { StockEntryPage } from './pages/StockEntryPage.tsx';
import { SalesPage } from './pages/SalesPage.tsx';
import { InvoicesPage } from './pages/InvoicesPage.tsx';
import { StockBatchesPage } from './pages/StockBatchesPage.tsx';
import { MovementsPage } from './pages/MovementsPage.tsx';
import { AlertsPage } from './pages/AlertsPage.tsx';
import { ReportsPage } from './pages/ReportsPage.tsx';
import { MasterDataPage } from './pages/MasterDataPage.tsx';
import { BarcodeScannerModal } from './components/BarcodeScannerModal.tsx';
import { api } from './services/api.ts';

function MainApp() {
  const toast = useToast();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [stockEntryProductId, setStockEntryProductId] = useState<number | null>(null);

  // Global low stock count for badges
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  const fetchAlertsCount = async () => {
    try {
      const low = await api.getLowStock();
      setLowStockCount(low.length);
    } catch {
      // silent background check
    }
  };

  useEffect(() => {
    fetchAlertsCount();
    const interval = setInterval(fetchAlertsCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRestockProduct = (productId: number) => {
    setStockEntryProductId(productId);
    setCurrentTab('stock-entry');
  };

  const handleScanBarcode = async (barcode: string) => {
    try {
      let product;
      try {
        product = await api.lookupBarcode(barcode);
      } catch {
        product = await api.lookupSku(barcode);
      }

      if (product) {
        toast.info(
          'Product Identified',
          `${product.name} (Stock: ${product.current_stock} ${product.unit}, $${product.selling_price.toFixed(2)})`
        );
        // Navigate to sales or product catalog
        setCurrentTab('sales');
      } else {
        toast.warning('Not Found', `No product found for code ${barcode}`);
      }
    } catch {
      toast.warning('Not Found', `Barcode "${barcode}" not registered in database.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white antialiased">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab !== 'stock-entry') setStockEntryProductId(null);
          setCurrentTab(tab);
        }}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        lowStockCount={lowStockCount}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <Navbar
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenQuickSale={() => setCurrentTab('sales')}
          onOpenStockEntry={() => {
            setStockEntryProductId(null);
            setCurrentTab('stock-entry');
          }}
          lowStockCount={lowStockCount}
        />

        {/* View Page Outlet */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onNavigate={(tab) => setCurrentTab(tab)}
              onRestockProduct={handleRestockProduct}
            />
          )}

          {currentTab === 'products' && (
            <ProductsPage
              onOpenStockEntryForProduct={handleRestockProduct}
            />
          )}

          {currentTab === 'stock-entry' && (
            <StockEntryPage
              initialProductId={stockEntryProductId}
              onSuccess={() => {
                fetchAlertsCount();
                setCurrentTab('batches');
              }}
            />
          )}

          {currentTab === 'sales' && (
            <SalesPage
              onSaleComplete={() => {
                fetchAlertsCount();
              }}
            />
          )}

          {currentTab === 'invoices' && <InvoicesPage />}

          {currentTab === 'batches' && <StockBatchesPage />}

          {currentTab === 'movements' && <MovementsPage />}

          {currentTab === 'alerts' && (
            <AlertsPage onRestockProduct={handleRestockProduct} />
          )}

          {currentTab === 'reports' && <ReportsPage />}

          {currentTab === 'master-data' && <MasterDataPage />}
        </main>
      </div>

      {/* Global Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanBarcode}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
