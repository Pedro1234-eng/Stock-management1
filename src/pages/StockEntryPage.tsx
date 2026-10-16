import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Barcode,
  Truck,
  Calendar,
  DollarSign,
  Package,
  Boxes,
  CheckCircle2,
  Search,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Product, Supplier } from '../types/index.ts';
import { useToast } from '../components/Toast.tsx';

interface StockEntryPageProps {
  initialProductId?: number | null;
  onSuccess: () => void;
}

export const StockEntryPage: React.FC<StockEntryPageProps> = ({
  initialProductId,
  onSuccess,
}) => {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<number | ''>(
    initialProductId || ''
  );
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>('');
  const [batchNumber, setBatchNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState<string>('');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // Quick product barcode search input
  const [searchCode, setSearchCode] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [prods, sups] = await Promise.all([
          api.getProducts(),
          api.getSuppliers(),
        ]);
        setProducts(prods);
        setSuppliers(sups);

        if (initialProductId) {
          setSelectedProductId(initialProductId);
        } else if (prods.length > 0) {
          setSelectedProductId(prods[0].id);
        }

        if (sups.length > 0) {
          setSelectedSupplierId(sups[0].id);
        }

        generateBatchCode();
      } catch (err: any) {
        toast.error('Failed to load form data', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [initialProductId]);

  const generateBatchCode = () => {
    const d = new Date();
    const rand = Math.floor(100 + Math.random() * 900);
    const code = `BATCH-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${rand}`;
    setBatchNumber(code);
  };

  const handleBarcodeLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    try {
      // Try barcode first, then SKU
      try {
        const prod = await api.lookupBarcode(searchCode.trim());
        setSelectedProductId(prod.id);
        toast.info('Product Found', `Selected: ${prod.name}`);
        setSearchCode('');
        return;
      } catch {
        // try SKU
        const prodSku = await api.lookupSku(searchCode.trim());
        setSelectedProductId(prodSku.id);
        toast.info('Product Found', `Selected: ${prodSku.name}`);
        setSearchCode('');
      }
    } catch {
      toast.warning('Product Not Found', `No product with code "${searchCode}" in database.`);
    }
  };

  const selectedProduct = products.find((p) => p.id === Number(selectedProductId));

  const totalCost =
    (parseFloat(quantity) || 0) * (parseFloat(purchasePrice) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      toast.warning('Validation Error', 'Please select a product.');
      return;
    }
    if (!batchNumber.trim()) {
      toast.warning('Validation Error', 'Please enter a batch number.');
      return;
    }
    const qtyNum = parseInt(quantity, 10);
    const priceNum = parseFloat(purchasePrice);

    if (isNaN(qtyNum) || qtyNum <= 0) {
      toast.warning('Validation Error', 'Quantity must be greater than zero.');
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      toast.warning('Validation Error', 'Purchase price cannot be negative.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createStockEntry({
        productId: Number(selectedProductId),
        supplierId: selectedSupplierId ? Number(selectedSupplierId) : null,
        batchNumber: batchNumber.trim(),
        purchaseDate,
        expiryDate: expiryDate ? expiryDate : null,
        quantity: qtyNum,
        purchasePrice: priceNum,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success(
        'Stock Intake Recorded',
        `Added ${qtyNum} ${selectedProduct?.unit || 'units'} of ${selectedProduct?.name} under batch ${batchNumber}.`
      );

      // Reset fields
      setQuantity('');
      setPurchasePrice('');
      setReference('');
      setNotes('');
      generateBatchCode();
      onSuccess();
    } catch (err: any) {
      toast.error('Stock Entry Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <PlusCircle className="w-6 h-6 text-emerald-400" />
          <span>Stock Intake Entry (IN)</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Receive incoming purchase batches from suppliers. Automatically logs FIFO batch numbers and updates inventory valuation.
        </p>
      </div>

      {/* Barcode Quick Lookup Card */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 shrink-0">
          <Barcode className="w-4 h-4 text-amber-400" />
          <span>Quick Barcode / SKU Scan:</span>
        </div>
        <form onSubmit={handleBarcodeLookup} className="flex-1 flex gap-2 w-full">
          <input
            type="text"
            placeholder="Scan or type barcode (e.g. 890123456001)"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors shrink-0"
          >
            Find
          </button>
        </form>
      </div>

      {/* Main Intake Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Selection */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Target Product *
              </label>
              <select
                required
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none focus:border-blue-500"
              >
                <option value="">-- Select Product --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) - In Stock: {p.current_stock} {p.unit}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Details Preview */}
            {selectedProduct && (
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Current Available Stock:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {selectedProduct.current_stock} {selectedProduct.unit}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Retail Selling Price:</span>
                  <span className="font-mono text-slate-200 font-medium">
                    ${selectedProduct.selling_price.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Barcode:</span>
                  <span className="font-mono text-amber-400">{selectedProduct.barcode}</span>
                </div>
              </div>
            )}

            {/* Supplier */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-400" />
                <span>Supplier / Vendor</span>
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none focus:border-blue-500"
              >
                <option value="">No Supplier / Local Consignment</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Purchase Reference / PO */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Purchase Order / Invoice Ref
              </label>
              <input
                type="text"
                placeholder="e.g. PO-2026-009 or BILL-8912"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Batch & Financial Parameters */}
          <div className="space-y-4">
            {/* Batch Number */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Batch Number (FIFO identifier) *
                </label>
                <button
                  type="button"
                  onClick={generateBatchCode}
                  className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Auto-generate
                </button>
              </div>
              <input
                type="text"
                required
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
                placeholder="e.g. BATCH-2026-01"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono font-bold uppercase outline-none focus:border-blue-500"
              />
            </div>

            {/* Dates: Purchase and Expiry */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" /> Purchase Date *
                </label>
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" /> Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Quantity and Purchase Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Quantity Received *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono font-bold outline-none focus:border-blue-500 text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Unit Purchase Cost ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="e.g. 10.50"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono font-bold outline-none focus:border-blue-500 text-right"
                />
              </div>
            </div>

            {/* Total Batch Cost Calculation Display */}
            <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-900/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-200">
                Total Batch Purchase Cost:
              </span>
              <span className="text-base font-black font-mono text-emerald-400">
                ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Intake Remarks / Receiving Notes
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Condition of goods, bay location, forklift inspector..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none focus:border-blue-500"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Updates inventory quantity atomically & logs audit movement</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <PlusCircle className="w-4 h-4" />
            )}
            <span>Confirm Stock Intake (IN)</span>
          </button>
        </div>
      </form>
    </div>
  );
};
