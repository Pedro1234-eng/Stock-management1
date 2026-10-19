/**
 * Comprehensive CSV Export Utility for ReportsPage and Inventory Intelligence
 * RFC 4180 compliant with UTF-8 BOM support for universal Excel/Sheets compatibility.
 */

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 1. Export Sales Orders Summary CSV
 */
export function exportSalesOrdersToCSV(
  sales: any[],
  options?: { startDate?: string; endDate?: string; scopeTitle?: string }
) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `Sales_Orders_Report_${timestamp}.csv`;

  const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const totalOrders = sales.length;
  const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00';

  const dateRangeLabel =
    options?.startDate && options?.endDate
      ? `${options.startDate} to ${options.endDate}`
      : options?.startDate
      ? `From ${options.startDate}`
      : options?.endDate
      ? `Until ${options.endDate}`
      : 'All Recorded Sales History';

  const metaHeader = [
    `# ==============================================================================`,
    `# PROFESSIONAL STOCK MANAGEMENT SYSTEM - SALES ORDERS SUMMARY REPORT`,
    `# Generated At: ${new Date().toLocaleString()}`,
    `# Scope: ${options?.scopeTitle || 'Sales Invoices'} (${totalOrders} orders)`,
    `# Period: ${dateRangeLabel}`,
    `# Total Realized Sales Revenue: $${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `# Average Order Value: $${avgOrderValue}`,
    `# Description: High-level financial summary of sales transactions and order fulfillment.`,
    `# ==============================================================================`,
    '',
  ].join('\n');

  const headers = [
    'Invoice #',
    'Date & Time',
    'Date (YYYY-MM-DD)',
    'Customer Name',
    'Items Count',
    'Payment Method',
    'Total Revenue ($)',
    'Order Status',
  ];

  const rows = sales.map((s) => {
    const dateObj = new Date(s.created_at);
    return [
      escapeCsv(s.invoice_number),
      escapeCsv(dateObj.toISOString()),
      escapeCsv(dateObj.toISOString().split('T')[0]),
      escapeCsv(s.customer_name || 'Walk-in Customer'),
      s.items_count || 1,
      escapeCsv(s.payment_method || 'Cash'),
      Number(s.total || 0).toFixed(2),
      escapeCsv(s.status || 'PAID'),
    ];
  });

  const csvContent = metaHeader + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCsv(filename, csvContent);
}

/**
 * 2. Export Detailed Sales Line Items CSV
 */
export function exportDetailedSalesItemsToCSV(
  items: any[],
  options?: { startDate?: string; endDate?: string; scopeTitle?: string }
) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `Detailed_Sales_Line_Items_${timestamp}.csv`;

  const totalRevenue = items.reduce((sum, item) => sum + (Number(item.item_total) || 0), 0);
  const totalUnits = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const dateRangeLabel =
    options?.startDate && options?.endDate
      ? `${options.startDate} to ${options.endDate}`
      : options?.startDate
      ? `From ${options.startDate}`
      : options?.endDate
      ? `Until ${options.endDate}`
      : 'All Recorded Sales History';

  const metaHeader = [
    `# ==============================================================================`,
    `# PROFESSIONAL STOCK MANAGEMENT SYSTEM - DETAILED SALES LINE ITEMS REPORT`,
    `# Generated At: ${new Date().toLocaleString()}`,
    `# Scope: ${options?.scopeTitle || 'Granular Item Sales'} (${items.length} line items)`,
    `# Period: ${dateRangeLabel}`,
    `# Total Quantity Sold: ${totalUnits.toLocaleString()} units`,
    `# Total Net Revenue: $${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `# Description: Transaction-level SKU sales breakdown suitable for pivot tables and analytics.`,
    `# ==============================================================================`,
    '',
  ].join('\n');

  const headers = [
    'Line ID',
    'Invoice #',
    'Sale Date & Time',
    'Sale Date (YYYY-MM-DD)',
    'Customer Name',
    'Product ID',
    'Product Name',
    'SKU',
    'Barcode',
    'Category',
    'Unit of Measure',
    'Quantity Sold',
    'Unit Price ($)',
    'Discount ($)',
    'Line Item Total ($)',
    'Payment Method',
    'Invoice Status',
    'Cashier / Operator',
  ];

  const rows = items.map((item) => {
    const dateObj = new Date(item.sale_date);
    return [
      item.item_id,
      escapeCsv(item.invoice_number),
      escapeCsv(dateObj.toISOString()),
      escapeCsv(dateObj.toISOString().split('T')[0]),
      escapeCsv(item.customer_name || 'Walk-in Customer'),
      item.product_id,
      escapeCsv(item.product_name),
      escapeCsv(item.sku),
      escapeCsv(item.barcode || ''),
      escapeCsv(item.category_name || 'General'),
      escapeCsv(item.unit || 'pcs'),
      item.quantity,
      Number(item.unit_price || 0).toFixed(2),
      Number(item.discount || 0).toFixed(2),
      Number(item.item_total || 0).toFixed(2),
      escapeCsv(item.payment_method || 'Cash'),
      escapeCsv(item.invoice_status || 'PAID'),
      escapeCsv(item.operator || 'Sales Clerk'),
    ];
  });

  const csvContent = metaHeader + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCsv(filename, csvContent);
}

/**
 * 3. Export Inventory Valuation & Stock Summary CSV
 */
export function exportInventoryValuationToCSV(
  inventory: any[],
  options?: { scopeTitle?: string }
) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `Inventory_Valuation_Report_${timestamp}.csv`;

  const totalCostValuation = inventory.reduce((sum, item) => sum + (Number(item.cost_valuation) || 0), 0);
  const totalRetailValuation = inventory.reduce((sum, item) => sum + (Number(item.retail_valuation) || 0), 0);
  const totalUnits = inventory.reduce((sum, item) => sum + (Number(item.current_stock) || 0), 0);
  const totalSpread = totalRetailValuation - totalCostValuation;
  const overallMargin = totalRetailValuation > 0 ? ((totalSpread / totalRetailValuation) * 100).toFixed(1) : '0.0';

  const lowStockCount = inventory.filter(
    (i) => (i.current_stock ?? 0) > 0 && (i.current_stock ?? 0) <= (i.minimum_stock ?? 10)
  ).length;
  const outOfStockCount = inventory.filter((i) => (i.current_stock ?? 0) === 0).length;

  const metaHeader = [
    `# ==============================================================================`,
    `# PROFESSIONAL STOCK MANAGEMENT SYSTEM - INVENTORY VALUATION & STOCK REPORT`,
    `# Generated At: ${new Date().toLocaleString()}`,
    `# Scope: ${options?.scopeTitle || 'Full Warehouse Inventory'} (${inventory.length} items)`,
    `# Total In-Stock Units: ${totalUnits.toLocaleString()}`,
    `# Total Stock Cost Valuation (FIFO): $${totalCostValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `# Total Potential Retail Valuation: $${totalRetailValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `# Potential Unrealized Gross Profit: $${totalSpread.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${overallMargin}%)`,
    `# Low Stock Alerts: ${lowStockCount} | Out of Stock Alerts: ${outOfStockCount}`,
    `# ==============================================================================`,
    '',
  ].join('\n');

  const headers = [
    'Line #',
    'Product ID',
    'Product Name',
    'SKU',
    'Barcode',
    'Category',
    'Unit of Measure',
    'Current In-Stock Units',
    'Unit Selling Price ($)',
    'Total Cost Valuation ($)',
    'Total Retail Valuation ($)',
    'Unrealized Gross Spread ($)',
    'Potential Margin (%)',
    'Min Stock Threshold',
    'Stock Status',
    'Active Batches Count',
    'Reorder Recommended',
  ];

  const rows = inventory.map((item, idx) => {
    const cost = Number(item.cost_valuation) || 0;
    const retail = Number(item.retail_valuation) || 0;
    const spread = retail - cost;
    const marginPct = retail > 0 ? ((spread / retail) * 100).toFixed(1) : '0.0';
    const isReorder = (item.current_stock ?? 0) <= (item.minimum_stock ?? 10);

    return [
      idx + 1,
      item.id,
      escapeCsv(item.name),
      escapeCsv(item.sku),
      escapeCsv(item.barcode || ''),
      escapeCsv(item.category_name || 'General'),
      escapeCsv(item.unit || 'pcs'),
      item.current_stock ?? 0,
      Number(item.selling_price || 0).toFixed(2),
      cost.toFixed(2),
      retail.toFixed(2),
      spread.toFixed(2),
      `${marginPct}%`,
      item.minimum_stock ?? 10,
      escapeCsv(item.status || (item.current_stock === 0 ? 'OUT_OF_STOCK' : isReorder ? 'LOW_STOCK' : 'IN_STOCK')),
      item.active_batches_count ?? 0,
      isReorder ? 'YES - Reorder Required' : 'NO - Sufficient',
    ];
  });

  const csvContent = metaHeader + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCsv(filename, csvContent);
}

/**
 * 4. Export Physical Stock Batches CSV
 */
export function exportPhysicalBatchInventoryToCSV(
  batches: any[],
  options?: { activeOnly?: boolean; scopeTitle?: string }
) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `Physical_Batches_Audit_${timestamp}.csv`;

  const totalRemainingUnits = batches.reduce((sum, b) => sum + (Number(b.quantity_remaining) || 0), 0);
  const totalValuation = batches.reduce((sum, b) => sum + ((Number(b.quantity_remaining) || 0) * (Number(b.purchase_price) || 0)), 0);

  const metaHeader = [
    `# ==============================================================================`,
    `# PROFESSIONAL STOCK MANAGEMENT SYSTEM - PHYSICAL BATCH INVENTORY AUDIT`,
    `# Generated At: ${new Date().toLocaleString()}`,
    `# Scope: ${options?.scopeTitle || 'Physical Batches'} (${batches.length} batches)`,
    `# Total Physical Units Remaining: ${totalRemainingUnits.toLocaleString()}`,
    `# Extended Batch Inventory Value: $${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `# Description: Individual lot/batch traceability, expiry timelines, and remaining unit inventory.`,
    `# ==============================================================================`,
    '',
  ].join('\n');

  const headers = [
    'Batch ID',
    'Batch Number',
    'Product Name',
    'SKU',
    'Barcode',
    'Category',
    'Supplier',
    'Purchase Date',
    'Expiry Date',
    'Days Until Expiry',
    'Units Received',
    'Units Remaining',
    'Units Depleted',
    'Depletion (%)',
    'Unit Purchase Cost ($)',
    'Extended Remaining Value ($)',
    'Batch Status',
  ];

  const rows = batches.map((b) => {
    const received = Number(b.quantity_received) || 0;
    const remaining = Number(b.quantity_remaining) || 0;
    const depleted = Math.max(0, received - remaining);
    const depletionPct = received > 0 ? ((depleted / received) * 100).toFixed(1) : '100.0';
    const unitPrice = Number(b.purchase_price) || 0;
    const extendedValue = remaining * unitPrice;

    let status = 'Active';
    if (remaining === 0) status = 'Fully Depleted';
    else if (b.days_until_expiry !== null && b.days_until_expiry !== undefined && b.days_until_expiry <= 0) status = 'Expired';
    else if (b.days_until_expiry !== null && b.days_until_expiry !== undefined && b.days_until_expiry <= 30) status = 'Expiring Soon';

    return [
      b.id,
      escapeCsv(b.batch_number),
      escapeCsv(b.product_name),
      escapeCsv(b.sku),
      escapeCsv(b.barcode || ''),
      escapeCsv(b.category_name || 'General'),
      escapeCsv(b.supplier_name || 'N/A'),
      b.purchase_date ? new Date(b.purchase_date).toISOString().split('T')[0] : '',
      b.expiry_date ? new Date(b.expiry_date).toISOString().split('T')[0] : 'N/A',
      b.days_until_expiry !== null && b.days_until_expiry !== undefined ? b.days_until_expiry : 'No Expiry',
      received,
      remaining,
      depleted,
      `${depletionPct}%`,
      unitPrice.toFixed(2),
      extendedValue.toFixed(2),
      escapeCsv(status),
    ];
  });

  const csvContent = metaHeader + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCsv(filename, csvContent);
}

/**
 * 5. Export Supplier Purchases CSV
 */
export function exportSupplierPurchasesToCSV(purchases: any[], options?: { scopeTitle?: string }) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `Supplier_Purchases_Report_${timestamp}.csv`;

  const totalValue = purchases.reduce((sum, p) => sum + (Number(p.total_purchased_value) || 0), 0);
  const totalUnits = purchases.reduce((sum, p) => sum + (Number(p.total_units_received) || 0), 0);
  const totalBatches = purchases.reduce((sum, p) => sum + (Number(p.batches_count) || 0), 0);

  const metaHeader = [
    `# ==============================================================================`,
    `# PROFESSIONAL STOCK MANAGEMENT SYSTEM - SUPPLIER PURCHASING VOLUME REPORT`,
    `# Generated At: ${new Date().toLocaleString()}`,
    `# Scope: ${options?.scopeTitle || 'Supplier Procurement'} (${purchases.length} vendors)`,
    `# Total Batches Received: ${totalBatches}`,
    `# Total Units Received: ${totalUnits.toLocaleString()}`,
    `# Total Procurement Spend: $${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `# ==============================================================================`,
    '',
  ].join('\n');

  const headers = [
    'Supplier ID',
    'Supplier Name',
    'Batches Received',
    'Total Units Received',
    'Total Purchased Value ($)',
    'Average Cost per Unit ($)',
  ];

  const rows = purchases.map((p) => {
    const units = Number(p.total_units_received) || 0;
    const value = Number(p.total_purchased_value) || 0;
    const avgCost = units > 0 ? (value / units).toFixed(2) : '0.00';
    return [
      p.supplier_id || '',
      escapeCsv(p.supplier_name),
      p.batches_count || 0,
      units,
      value.toFixed(2),
      avgCost,
    ];
  });

  const csvContent = metaHeader + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCsv(filename, csvContent);
}

/**
 * 6. Export Profit Margins & COGS Report CSV
 */
export function exportProfitReportToCSV(
  profitData: any,
  options?: { startDate?: string; endDate?: string }
) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `Profit_Margin_COGS_Report_${timestamp}.csv`;

  const summary = profitData?.summary || {};
  const items = profitData?.items || [];

  const metaHeader = [
    `# ==============================================================================`,
    `# PROFESSIONAL STOCK MANAGEMENT SYSTEM - PROFIT MARGIN & FIFO COGS REPORT`,
    `# Generated At: ${new Date().toLocaleString()}`,
    options?.startDate && options?.endDate ? `# Period: ${options.startDate} to ${options.endDate}` : '',
    `# Total Realized Sales Revenue: $${Number(summary.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `# Total FIFO Cost of Goods Sold (COGS): $${Number(summary.totalCogs || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `# Total Realized Gross Profit: $${Number(summary.grossProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `# Overall Gross Profit Margin: ${Number(summary.profitMarginPct || 0).toFixed(1)}%`,
    `# ==============================================================================`,
    '',
  ].filter(Boolean).join('\n');

  const headers = [
    'Product Name',
    'SKU',
    'Units Sold',
    'Total Sales Revenue ($)',
    'FIFO COGS ($)',
    'Gross Profit ($)',
    'Profit Margin (%)',
  ];

  const rows = items.map((p: any) => [
    escapeCsv(p.product_name),
    escapeCsv(p.sku),
    p.units_sold || 0,
    Number(p.total_revenue || 0).toFixed(2),
    Number(p.total_cogs || 0).toFixed(2),
    Number(p.gross_profit || 0).toFixed(2),
    `${Number(p.profit_margin_pct || 0).toFixed(1)}%`,
  ]);

  const csvContent = metaHeader + [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
  downloadCsv(filename, csvContent);
}

/**
 * 7. Export Batch Profitability CSV
 */
export function exportBatchProfitabilityToCSV(
  batchData: any,
  options?: { statusFilter?: string }
) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `Batch_Profitability_Report_${timestamp}.csv`;

  const batches = batchData?.batches || [];
  const summary = batchData?.summary || {};

  const metaHeader = [
    `# ==============================================================================`,
    `# PROFESSIONAL STOCK MANAGEMENT SYSTEM - BATCH PROFIT MARGIN ANALYSIS`,
    `# Generated At: ${new Date().toLocaleString()}`,
    `# Batch Status Filter: ${options?.statusFilter || 'All Batches'}`,
    `# Analyzed Batches: ${summary.totalAnalyzedBatches || batches.length}`,
    `# Total Units Sold: ${(summary.totalUnitsSold || 0).toLocaleString()}`,
    `# Total Purchase Cost of Sold Stock: $${Number(summary.totalPurchaseCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `# Realized Sales Revenue: $${Number(summary.totalRealizedRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `# Total Realized Gross Profit: $${Number(summary.totalRealizedProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `# Realized Profit Margin: ${Number(summary.overallMarginPct || 0).toFixed(1)}%`,
    `# ==============================================================================`,
    '',
  ].join('\n');

  const headers = [
    'Batch Number',
    'Product Name',
    'SKU',
    'Category',
    'Supplier',
    'Purchase Date',
    'Units Received',
    'Units Sold',
    'Units Remaining',
    'Unit Purchase Cost ($)',
    'Realized Unit Sale ($)',
    'Total Batch Cost ($)',
    'Realized Revenue ($)',
    'Realized Profit ($)',
    'Margin (%)',
    'Markup (%)',
    'Batch Status',
  ];

  const rows = batches.map((b: any) => [
    escapeCsv(b.batch_number),
    escapeCsv(b.product_name),
    escapeCsv(b.sku),
    escapeCsv(b.category_name || 'General'),
    escapeCsv(b.supplier_name || 'N/A'),
    b.purchase_date ? new Date(b.purchase_date).toISOString().split('T')[0] : '',
    b.quantity_received,
    b.units_sold,
    b.quantity_remaining,
    Number(b.unit_purchase_price || 0).toFixed(2),
    Number(b.realized_unit_price || 0).toFixed(2),
    Number(b.total_purchase_cost || 0).toFixed(2),
    Number(b.realized_sales_revenue || 0).toFixed(2),
    Number(b.realized_profit || 0).toFixed(2),
    `${Number(b.profit_margin_pct || 0).toFixed(1)}%`,
    `${Number(b.markup_pct || 0).toFixed(1)}%`,
    b.is_completed ? 'Completed' : 'Active',
  ]);

  const csvContent = metaHeader + [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
  downloadCsv(filename, csvContent);
}
