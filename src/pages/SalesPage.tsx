import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Receipt,
  Printer,
  Sparkles,
  Camera,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Product, Customer, InvoiceItem, Invoice } from '../types/index.ts';
import { useToast } from '../components/Toast.tsx';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal.tsx';
import { PrintInvoiceModal } from '../components/PrintInvoiceModal.tsx';

interface SalesPageProps {
  onSaleComplete: () => void;
}

export const SalesPage: React.FC<SalesPageProps> = ({ onSaleComplete }) => {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Cart / Line items
  const [cartItems, setCartItems] = useState<InvoiceItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<
    'Cash' | 'Mobile Money' | 'Card' | 'Bank Transfer' | 'Credit'
  >('Cash');
  const [discountAmount, setDiscountAmount] = useState<string>('0');
  const [taxRate, setTaxRate] = useState<number>(0.08); // 8% VAT
  const [saleNotes, setSaleNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Barcode
  const [productSearch, setProductSearch] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Invoice Print View after sale
  const [completedInvoice, setCompletedInvoice] = useState<Invoice | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [prods, custs] = await Promise.all([
          api.getProducts({ active: true }),
          api.getCustomers(),
        ]);
        setProducts(prods);
        setCustomers(custs);
      } catch (err: any) {
        toast.error('Failed to load catalog', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Quick Barcode Add
  const handleBarcodeScan = async (code: string) => {
    try {
      let product: Product | undefined;
      // Search in cached products first
      product = products.find(
        (p) => p.barcode === code || p.sku.toUpperCase() === code.toUpperCase()
      );

      if (!product) {
        // Query backend directly
        try {
          product = await api.lookupBarcode(code);
        } catch {
          product = await api.lookupSku(code);
        }
      }

      if (product) {
        addToCart(product);
        toast.info('Item Added', `${product.name} added to cart`);
        setBarcodeInput('');
      } else {
        toast.warning('Product Not Found', `No matching product for "${code}"`);
      }
    } catch {
      toast.warning('Not Found', `Product code "${code}" does not exist.`);
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      handleBarcodeScan(barcodeInput.trim());
    }
  };

  const addToCart = (product: Product) => {
    if (product.current_stock <= 0) {
      toast.warning(
        'Out of Stock',
        `Cannot sell "${product.name}". Available inventory is 0.`
      );
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.current_stock) {
          toast.warning(
            'Stock Limit Reached',
            `Only ${product.current_stock} units available in stock.`
          );
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.unitPrice - item.discount,
              }
            : item
        );
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            product_name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            unit: product.unit,
            unitPrice: product.selling_price,
            quantity: 1,
            discount: 0,
            total: product.selling_price,
            current_stock: product.current_stock,
          },
        ];
      }
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            const maxStock = item.current_stock || 9999;
            if (newQty > maxStock) {
              toast.warning(
                'Stock Limit Reached',
                `Only ${maxStock} units currently available in stock.`
              );
              return item;
            }
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              total: newQty * item.unitPrice - item.discount,
            };
          }
          return item;
        })
        .filter(Boolean) as InvoiceItem[]
    );
  };

  const removeFromCart = (productId: number) => {
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + item.total, 0);
  const discount = Math.min(subtotal, Math.max(0, parseFloat(discountAmount) || 0));
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = parseFloat((taxableAmount * taxRate).toFixed(2));
  const grandTotal = parseFloat((taxableAmount + tax).toFixed(2));

  // Filtered product suggestions
  const productSuggestions = products
    .filter(
      (p) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.barcode.includes(productSearch)
    )
    .slice(0, 8);

  // Submit Sale & Trigger FIFO Deduction
  const handleCompleteSale = async () => {
    if (cartItems.length === 0) {
      toast.warning('Cart is empty', 'Add at least one item to proceed.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createInvoice({
        customerId: selectedCustomerId ? Number(selectedCustomerId) : null,
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
        })),
        paymentMethod,
        discount,
        taxRate,
        notes: saleNotes.trim() || undefined,
      });

      toast.success(
        'Sale Completed!',
        `Invoice ${res.invoiceNumber} generated. FIFO stock allocated successfully.`
      );

      // Fetch full invoice detail for printing
      const fullInvoice = await api.getInvoiceById(res.id);
      setCompletedInvoice(fullInvoice);
      setIsPrintModalOpen(true);

      // Reset cart and reload product stock counts
      setCartItems([]);
      setDiscountAmount('0');
      setSaleNotes('');
      const updatedProds = await api.getProducts({ active: true });
      setProducts(updatedProds);
      onSaleComplete();
    } catch (err: any) {
      toast.error('Sale Failed (Transaction Rolled Back)', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ShoppingCart className="w-6 h-6 text-amber-400" />
            <span>Point of Sale & Stock Out Counter</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Barcode checkout, real-time availability check, automated FIFO batch deduction, and instant invoice generation.
          </p>
        </div>

        <button
          onClick={() => setIsScannerOpen(true)}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-amber-300 font-bold text-xs rounded-xl flex items-center gap-2 self-start transition-all shadow-sm"
        >
          <Camera className="w-4 h-4 text-amber-400" />
          <span>Launch Barcode Scanner</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Product Search & Quick Catalog (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Barcode & Search Input Container */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Barcode Scanner Input */}
              <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
                <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-400" />
                <input
                  type="text"
                  placeholder="Scan or enter barcode (press Enter)..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 font-mono outline-none focus:border-amber-400"
                />
              </form>

              {/* Product Keyword Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search product name or SKU..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Supports USB laser scanners, camera input, and manual SKU lookups.</span>
              <span className="text-amber-400/80 font-mono text-[10px]">
                {products.length} Products Active
              </span>
            </div>
          </div>

          {/* Product Items Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {productSuggestions.map((prod) => {
              const isOut = prod.current_stock <= 0;
              const cartItem = cartItems.find((ci) => ci.productId === prod.id);

              return (
                <div
                  key={prod.id}
                  onClick={() => !isOut && addToCart(prod)}
                  className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                    isOut
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-60 cursor-not-allowed'
                      : cartItem
                      ? 'bg-blue-950/20 border-blue-500/50 hover:border-blue-400 shadow-md'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-xs text-slate-100 line-clamp-1">
                        {prod.name}
                      </div>
                      <span className="font-mono font-bold text-xs text-emerald-400 shrink-0">
                        ${prod.selling_price.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center justify-between">
                      <span>SKU: {prod.sku}</span>
                      <span
                        className={`font-semibold ${
                          isOut
                            ? 'text-rose-400'
                            : prod.current_stock <= prod.minimum_stock
                            ? 'text-amber-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {isOut ? 'Out of Stock' : `${prod.current_stock} ${prod.unit} left`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {prod.barcode}
                    </span>
                    <button
                      type="button"
                      disabled={isOut}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                        isOut
                          ? 'bg-slate-800 text-slate-500'
                          : cartItem
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                      {cartItem ? `In Cart (${cartItem.quantity})` : 'Add to Sale'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Cart, Invoice Line Items & Payment (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl sticky top-20">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-400" />
              <h2 className="font-bold text-sm text-white">Current Sale Order</h2>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {cartItems.reduce((a, b) => a + b.quantity, 0)} Items
            </span>
          </div>

          {/* Customer Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" /> Customer Account
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500"
            >
              <option value="">Walk-in Retail Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Cart Line Items List */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {cartItems.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-xs">
                Scan barcode or click products to build sale order.
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item.productId}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-100 truncate">
                      {item.product_name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      ${item.unitPrice.toFixed(2)} each &bull; Stock: {item.current_stock}
                    </div>
                  </div>

                  {/* Qty Controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.productId, -1)}
                      className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-white text-xs">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, 1)}
                      className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right shrink-0 min-w-16">
                    <div className="font-mono font-bold text-slate-100">
                      ${item.total.toFixed(2)}
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Pricing Summary */}
          <div className="border-t border-slate-800 pt-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal:</span>
              <span className="font-mono font-medium text-slate-200">${subtotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400 gap-2">
              <span>Discount ($):</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="0.00"
                className="w-24 bg-slate-950 border border-slate-700/80 rounded-lg px-2 py-1 text-right text-xs text-slate-100 font-mono outline-none"
              />
            </div>

            <div className="flex items-center justify-between text-slate-400 gap-2">
              <span>Tax Rate:</span>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value))}
                className="bg-slate-950 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-200 outline-none"
              >
                <option value={0}>0% (Tax Exempt)</option>
                <option value={0.05}>5% Tax</option>
                <option value={0.08}>8% Standard VAT</option>
                <option value={0.1}>10% Tax</option>
              </select>
            </div>

            <div className="flex justify-between text-slate-400">
              <span>Tax Amount:</span>
              <span className="font-mono text-slate-300">${tax.toFixed(2)}</span>
            </div>

            <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-sm font-bold text-white">
              <span>Grand Total:</span>
              <span className="text-xl font-black font-mono text-amber-400">
                ${grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-slate-400" /> Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(['Cash', 'Mobile Money', 'Card', 'Bank Transfer', 'Credit'] as const).map(
                (method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-1 rounded-xl text-center font-semibold text-[11px] transition-all border ${
                      paymentMethod === method
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {method}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Complete Sale Button */}
          <button
            type="button"
            disabled={cartItems.length === 0 || isSubmitting}
            onClick={handleCompleteSale}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Receipt className="w-5 h-5" />
            )}
            <span>Process Sale & Print Invoice</span>
          </button>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
      />

      {/* Invoice Print & View Modal */}
      <PrintInvoiceModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        invoice={completedInvoice}
      />
    </div>
  );
};
