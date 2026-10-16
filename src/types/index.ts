export interface Product {
  id: number;
  barcode: string;
  sku: string;
  name: string;
  description?: string;
  category_id?: number | null;
  category_name?: string;
  unit: string;
  selling_price: number;
  minimum_stock: number;
  active: boolean;
  image_url?: string;
  current_stock: number;
  stock_status?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  created_at?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  product_count?: number;
}

export interface Supplier {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  batches_supplied?: number;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  total_orders?: number;
  lifetime_spent?: number;
}

export interface StockBatch {
  id: number;
  product_id: number;
  supplier_id?: number | null;
  supplier_name?: string;
  batch_number: string;
  purchase_date: string;
  expiry_date?: string | null;
  quantity_received: number;
  quantity_remaining: number;
  purchase_price: number;
  days_until_expiry?: number;
}

export interface StockMovement {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  unit: string;
  batch_id?: number;
  batch_number?: string;
  movement_type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN';
  quantity: number;
  unit_price: number;
  reference?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface InvoiceItem {
  id?: number;
  productId: number;
  product_id?: number;
  product_name?: string;
  sku?: string;
  barcode?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  unit_price?: number;
  discount: number;
  total: number;
  current_stock?: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  customer_id?: number | null;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: 'Cash' | 'Mobile Money' | 'Card' | 'Bank Transfer' | 'Credit';
  status: 'PAID' | 'PENDING' | 'CANCELLED';
  created_by?: string;
  notes?: string;
  created_at: string;
  items?: InvoiceItem[];
}

export interface DashboardData {
  metrics: {
    totalProducts: number;
    activeProducts: number;
    totalStockQuantity: number;
    inventoryValue: number;
    todaySales: number;
    todayInvoices: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  categoryBreakdown: {
    category_name: string;
    product_count: number;
    total_units: number;
    category_value: number;
  }[];
  topSelling: {
    id: number;
    name: string;
    sku: string;
    total_sold: number;
    revenue: number;
  }[];
  recentMovements: StockMovement[];
  salesTrend: {
    date: string;
    day_label: string;
    sales: number;
    invoice_count: number;
  }[];
}

export interface UserRoleProfile {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'sales' | 'stock_clerk';
  description: string;
  avatar: string;
}

export interface BatchProfitabilityItem {
  batch_id: number;
  batch_number: string;
  purchase_date: string;
  expiry_date: string | null;
  quantity_received: number;
  quantity_remaining: number;
  unit_purchase_price: number;
  total_purchase_cost: number;
  product_id: number;
  product_name: string;
  sku: string;
  unit: string;
  category_name: string;
  supplier_name: string;
  units_sold: number;
  realized_sales_revenue: number;
  realized_unit_price: number;
  realized_cogs: number;
  realized_profit: number;
  profit_margin_pct: number;
  markup_pct: number;
  is_completed: boolean;
}

export interface BatchProfitabilityReport {
  batches: BatchProfitabilityItem[];
  summary: {
    totalCompletedBatches: number;
    totalAnalyzedBatches: number;
    totalUnitsSold: number;
    totalPurchaseCost: number;
    totalRealizedRevenue: number;
    totalRealizedProfit: number;
    overallMarginPct: number;
  };
}

