// Frontend API Service Layer

let currentRole = 'manager';
let currentUserName = 'Operations Manager';
let currentUserEmail = 'manager@stocksystem.local';

export const setOperatorProfile = (role: string, name: string, email: string) => {
  currentRole = role;
  currentUserName = name;
  currentUserEmail = email;
};

export const getOperatorProfile = () => ({
  role: currentRole,
  name: currentUserName,
  email: currentUserEmail,
});

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('x-user-role', currentRole);
  headers.set('x-user-name', currentUserName);
  headers.set('x-user-email', currentUserEmail);

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg = data?.error || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Health
  getHealth: () => apiRequest<{ status: string; uptime: number }>('/api/health'),

  // Products
  getProducts: (params?: { category_id?: number; search?: string; active?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.category_id) query.set('category_id', String(params.category_id));
    if (params?.search) query.set('search', params.search);
    if (params?.active !== undefined) query.set('active', String(params.active));
    return apiRequest<any[]>(`/api/products?${query.toString()}`);
  },
  getProductById: (id: number) => apiRequest<any>(`/api/products/${id}`),
  lookupBarcode: (barcode: string) => apiRequest<any>(`/api/products/barcode/${encodeURIComponent(barcode)}`),
  lookupSku: (sku: string) => apiRequest<any>(`/api/products/sku/${encodeURIComponent(sku)}`),
  createProduct: (product: any) =>
    apiRequest<any>('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }),
  updateProduct: (id: number, product: any) =>
    apiRequest<any>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    }),
  deleteProduct: (id: number) =>
    apiRequest<{ message: string }>(`/api/products/${id}`, {
      method: 'DELETE',
    }),

  // Categories
  getCategories: () => apiRequest<any[]>('/api/categories'),
  createCategory: (cat: { name: string; description?: string }) =>
    apiRequest<any>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(cat),
    }),

  // Suppliers
  getSuppliers: () => apiRequest<any[]>('/api/suppliers'),
  createSupplier: (supplier: any) =>
    apiRequest<any>('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplier),
    }),

  // Customers
  getCustomers: () => apiRequest<any[]>('/api/customers'),
  createCustomer: (customer: any) =>
    apiRequest<any>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    }),

  // Stock
  getStockSummary: (params?: { categoryId?: number; status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.categoryId) query.set('categoryId', String(params.categoryId));
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    return apiRequest<any[]>(`/api/stock?${query.toString()}`);
  },
  getProductBatches: (productId: number) => apiRequest<any[]>(`/api/stock/product/${productId}`),
  getAllBatches: (params?: { productId?: number; activeOnly?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.productId) query.set('productId', String(params.productId));
    if (params?.activeOnly !== undefined) query.set('activeOnly', String(params.activeOnly));
    return apiRequest<any[]>(`/api/stock/batches?${query.toString()}`);
  },
  createStockEntry: (entry: any) =>
    apiRequest<{ message: string; data: any }>('/api/stock/entry', {
      method: 'POST',
      body: JSON.stringify(entry),
    }),
  adjustStock: (adjustment: any) =>
    apiRequest<any>('/api/stock/adjust', {
      method: 'POST',
      body: JSON.stringify(adjustment),
    }),
  getStockMovements: (params?: { productId?: number; movementType?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.productId) query.set('productId', String(params.productId));
    if (params?.movementType) query.set('movementType', params.movementType);
    if (params?.limit) query.set('limit', String(params.limit));
    return apiRequest<any[]>(`/api/stock/movements?${query.toString()}`);
  },
  getLowStock: () => apiRequest<any[]>('/api/stock/low'),
  getOutOfStock: () => apiRequest<any[]>('/api/stock/out-of-stock'),
  getExpiryBatches: (days = 90, productId?: number) => {
    const query = new URLSearchParams({ days: String(days) });
    if (productId) query.set('productId', String(productId));
    return apiRequest<any[]>(`/api/stock/expiry?${query.toString()}`);
  },

  // Invoices & Sales
  getInvoices: (params?: { customerId?: number; status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.customerId) query.set('customerId', String(params.customerId));
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    return apiRequest<any[]>(`/api/invoices?${query.toString()}`);
  },
  getInvoiceById: (id: number) => apiRequest<any>(`/api/invoices/${id}`),
  getInvoicePrint: (id: number) => apiRequest<any>(`/api/invoices/${id}/print`),
  createInvoice: (invoiceData: any) =>
    apiRequest<any>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    }),

  // Reports
  getDashboard: () => apiRequest<any>('/api/reports/dashboard'),
  getSalesReport: (startDate?: string, endDate?: string) => {
    const query = new URLSearchParams();
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);
    return apiRequest<any[]>(`/api/reports/sales?${query.toString()}`);
  },
  getPurchasesReport: () => apiRequest<any[]>('/api/reports/purchases'),
  getProfitReport: (startDate?: string, endDate?: string) => {
    const query = new URLSearchParams();
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);
    return apiRequest<any>(`/api/reports/profit?${query.toString()}`);
  },
  getBatchProfitabilityReport: (params?: {
    status?: 'completed' | 'all';
    categoryId?: number;
    productId?: number;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.categoryId) query.set('categoryId', String(params.categoryId));
    if (params?.productId) query.set('productId', String(params.productId));
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    return apiRequest<any>(`/api/reports/batch-profitability?${query.toString()}`);
  },
  getAuditLogs: () => apiRequest<any[]>('/api/audit-logs'),
};
