import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Boxes,
  Barcode,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  Download,
  FileSpreadsheet,
  ChevronDown,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Product, Category, StockBatch } from '../types/index.ts';
import { Modal } from '../components/Modal.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { useToast } from '../components/Toast.tsx';
import { exportProductsToCSV } from '../utils/backupExporter.ts';

interface ProductsPageProps {
  onOpenStockEntryForProduct: (productId: number) => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  onOpenStockEntryForProduct,
}) => {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW' | 'OUT' | 'IN'>('ALL');

  // Modal states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    barcode: '',
    sku: '',
    name: '',
    description: '',
    categoryId: '',
    unit: 'pcs',
    sellingPrice: '',
    minimumStock: '10',
    imageUrl: '',
  });

  // Batch details modal
  const [selectedProductForBatches, setSelectedProductForBatches] = useState<Product | null>(null);
  const [productBatches, setProductBatches] = useState<StockBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Confirm delete/deactivate
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // CSV Backup Export State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const handleExportProducts = (scope: 'all' | 'filtered') => {
    const listToExport = scope === 'all' ? products : filteredProducts;
    if (listToExport.length === 0) {
      toast.warning('No Products to Export', 'There are no products matching the current criteria.');
      return;
    }
    exportProductsToCSV(listToExport, {
      scopeTitle: scope === 'all' ? 'Full Product Master Catalog' : `Filtered Products (${statusFilter !== 'ALL' ? statusFilter : 'Current View'})`,
      isFiltered: scope === 'filtered',
      totalCatalogCount: products.length,
    });
    toast.success(
      'Products Backup Downloaded',
      `Exported ${listToExport.length} product records to CSV for local backup.`
    );
    setIsExportMenuOpen(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        api.getProducts({
          category_id: selectedCategory ? Number(selectedCategory) : undefined,
          search: search.trim() || undefined,
        }),
        api.getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err: any) {
      toast.error('Failed to load products', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    const randCode = '890' + Math.floor(100000000 + Math.random() * 900000000);
    const randSku = 'SKU-' + Math.floor(1000 + Math.random() * 9000);
    setProductForm({
      barcode: randCode,
      sku: randSku,
      name: '',
      description: '',
      categoryId: categories[0]?.id ? String(categories[0].id) : '',
      unit: 'pcs',
      sellingPrice: '',
      minimumStock: '10',
      imageUrl: '',
    });
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setProductForm({
      barcode: p.barcode,
      sku: p.sku,
      name: p.name,
      description: p.description || '',
      categoryId: p.category_id ? String(p.category_id) : '',
      unit: p.unit,
      sellingPrice: String(p.selling_price),
      minimumStock: String(p.minimum_stock),
      imageUrl: p.image_url || '',
    });
    setIsAddEditOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.barcode || !productForm.sku || !productForm.sellingPrice) {
      toast.warning('Validation Error', 'Barcode, SKU, Name, and Selling Price are required.');
      return;
    }

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, {
          barcode: productForm.barcode,
          sku: productForm.sku,
          name: productForm.name,
          description: productForm.description,
          categoryId: productForm.categoryId ? Number(productForm.categoryId) : null,
          unit: productForm.unit,
          sellingPrice: Number(productForm.sellingPrice),
          minimumStock: Number(productForm.minimumStock),
          imageUrl: productForm.imageUrl,
        });
        toast.success('Product updated', `Product "${productForm.name}" updated successfully.`);
      } else {
        await api.createProduct({
          barcode: productForm.barcode,
          sku: productForm.sku,
          name: productForm.name,
          description: productForm.description,
          categoryId: productForm.categoryId ? Number(productForm.categoryId) : null,
          unit: productForm.unit,
          sellingPrice: Number(productForm.sellingPrice),
          minimumStock: Number(productForm.minimumStock),
          imageUrl: productForm.imageUrl,
        });
        toast.success('Product created', `Product "${productForm.name}" registered into catalog.`);
      }
      setIsAddEditOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Save failed', err.message);
    }
  };

  const handleDeactivate = async () => {
    if (!productToDelete) return;
    try {
      await api.deleteProduct(productToDelete.id);
      toast.success('Product deactivated', `Product "${productToDelete.name}" marked inactive.`);
      setProductToDelete(null);
      loadData();
    } catch (err: any) {
      toast.error('Deactivation failed', err.message);
    }
  };

  const handleViewBatches = async (p: Product) => {
    setSelectedProductForBatches(p);
    setLoadingBatches(true);
    try {
      const batches = await api.getProductBatches(p.id);
      setProductBatches(batches);
    } catch (err: any) {
      toast.error('Failed to load batches', err.message);
    } finally {
      setLoadingBatches(false);
    }
  };

  // Filter in memory for stock status
  const filteredProducts = products.filter((p) => {
    if (statusFilter === 'OUT') return p.current_stock === 0;
    if (statusFilter === 'LOW') return p.current_stock > 0 && p.current_stock <= p.minimum_stock;
    if (statusFilter === 'IN') return p.current_stock > p.minimum_stock;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-400" />
            <span>Product Master Catalog</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage barcodes, SKUs, category links, pricing, and FIFO batches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700/60 transition-colors"
            title="Refresh Catalog"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Export CSV Backup Menu */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 border border-slate-700 shadow-sm"
              title="Export products list to CSV for local backup"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Export CSV</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isExportMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsExportMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50">
                  <div className="px-2.5 py-1.5 border-b border-slate-800 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Backup Products to CSV
                    </span>
                  </div>
                  <button
                    onClick={() => handleExportProducts('filtered')}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-white group-hover:text-blue-400">Export Filtered List</div>
                      <div className="text-[10px] text-slate-400">{filteredProducts.length} visible items</div>
                    </div>
                    <FileSpreadsheet className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
                  </button>
                  <button
                    onClick={() => handleExportProducts('all')}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-white group-hover:text-emerald-400">Export Full Catalog</div>
                      <div className="text-[10px] text-slate-400">{products.length} total master records</div>
                    </div>
                    <Download className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name, SKU, or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 focus:border-blue-500 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : '')}
            className="bg-slate-950 border border-slate-700/80 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-700/80 text-xs text-slate-300 rounded-xl px-3 py-2 outline-none"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="IN">In Stock</option>
            <option value="LOW">Low Stock Alert (&le; Min)</option>
            <option value="OUT">Out of Stock (0 Units)</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Product & Category</th>
                <th className="py-3.5 px-4">Barcode / SKU</th>
                <th className="py-3.5 px-4 text-right">Selling Price</th>
                <th className="py-3.5 px-4 text-center">Stock Level</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
                    Fetching inventory catalog...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No products found matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOut = p.current_stock === 0;
                  const isLow = p.current_stock > 0 && p.current_stock <= p.minimum_stock;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Product Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-[10px]">
                            {p.category_name || 'General'}
                          </span>
                          <span>Unit: {p.unit}</span>
                        </div>
                      </td>

                      {/* Barcode & SKU */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <div className="text-slate-200 flex items-center gap-1.5">
                          <Barcode className="w-3.5 h-3.5 text-amber-400" />
                          <span>{p.barcode}</span>
                        </div>
                        <div className="text-slate-400 text-[10px] mt-0.5">
                          SKU: <span className="text-slate-300 font-semibold">{p.sku}</span>
                        </div>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100">
                        ${p.selling_price.toFixed(2)}
                      </td>

                      {/* Current Stock */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-mono font-black text-sm text-slate-100">
                          {p.current_stock} <span className="text-[10px] font-normal text-slate-400">{p.unit}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Min: {p.minimum_stock}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <XCircle className="w-3 h-3" /> OUT OF STOCK
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3" /> LOW STOCK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle className="w-3 h-3" /> IN STOCK
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewBatches(p)}
                            title="Inspect FIFO Batches"
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Boxes className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onOpenStockEntryForProduct(p.id)}
                            title="Add Stock Intake"
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Product"
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setProductToDelete(p)}
                            title="Deactivate Product"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Register New Product'}
        subtitle="Configure product details, category, pricing, and stock alert levels"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="e.g. Portland Cement 50kg"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={productForm.categoryId}
                onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-blue-500"
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Barcode Number *
              </label>
              <input
                type="text"
                required
                value={productForm.barcode}
                onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                placeholder="e.g. 890123456001"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                SKU / Catalog Code *
              </label>
              <input
                type="text"
                required
                value={productForm.sku}
                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. CEM-50KG-01"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono uppercase outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Selling Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={productForm.sellingPrice}
                onChange={(e) => setProductForm({ ...productForm, sellingPrice: e.target.value })}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Unit of Measure
              </label>
              <input
                type="text"
                value={productForm.unit}
                onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                placeholder="pcs, bags, box"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Min Stock Alert Level
              </label>
              <input
                type="number"
                value={productForm.minimumStock}
                onChange={(e) => setProductForm({ ...productForm, minimumStock: e.target.value })}
                placeholder="10"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description & Specifications
            </label>
            <textarea
              rows={2}
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              placeholder="Technical specs, brand, container size..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddEditOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl"
            >
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Inspect FIFO Batches Modal */}
      <Modal
        isOpen={Boolean(selectedProductForBatches)}
        onClose={() => setSelectedProductForBatches(null)}
        title={`FIFO Batches for: ${selectedProductForBatches?.name}`}
        subtitle={`Total Available: ${selectedProductForBatches?.current_stock} ${selectedProductForBatches?.unit}`}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
            <strong>First-In-First-Out Rule:</strong> Sales automatically consume inventory from the top oldest batch with remaining quantity.
          </div>

          {loadingBatches ? (
            <div className="py-8 text-center text-slate-400">Loading batches...</div>
          ) : productBatches.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              No batches recorded for this product yet. Record a Stock Intake (IN) to create the first batch.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2">Batch #</th>
                    <th className="py-2">Purchase Date</th>
                    <th className="py-2">Expiry Date</th>
                    <th className="py-2 text-right">Cost Price</th>
                    <th className="py-2 text-right">Received</th>
                    <th className="py-2 text-right font-bold text-white">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  {productBatches.map((b, idx) => (
                    <tr key={b.id} className={b.quantity_remaining === 0 ? 'opacity-40' : ''}>
                      <td className="py-2.5 font-bold text-slate-200">
                        {b.batch_number} {idx === 0 && b.quantity_remaining > 0 && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded ml-1 font-sans">
                            NEXT IN LINE
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-slate-400">
                        {new Date(b.purchase_date).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 text-slate-400">
                        {b.expiry_date ? new Date(b.expiry_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-2.5 text-right text-slate-200">
                        ${b.purchase_price.toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right text-slate-400">
                        {b.quantity_received}
                      </td>
                      <td className="py-2.5 text-right font-bold text-emerald-400">
                        {b.quantity_remaining}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-800">
            <button
              onClick={() => {
                if (selectedProductForBatches) {
                  onOpenStockEntryForProduct(selectedProductForBatches.id);
                  setSelectedProductForBatches(null);
                }
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Stock to this Product
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Deactivate Dialog */}
      <ConfirmDialog
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Product"
        message={`Are you sure you want to deactivate "${productToDelete?.name}"? Historical invoices and transactions will remain intact.`}
        confirmLabel="Deactivate"
        isDanger
      />
    </div>
  );
};
