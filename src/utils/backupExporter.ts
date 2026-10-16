import { Product } from '../types/index.ts';

/**
 * Utility to escape values for RFC 4180 compliant CSV files.
 */
function escapeCsvValue(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Triggers browser download of a CSV text content as a file with UTF-8 BOM.
 */
function downloadCsv(filename: string, content: string) {
  // Add UTF-8 BOM so Excel and spreadsheet applications open special characters cleanly
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ProductExportOptions {
  scopeTitle?: string;
  isFiltered?: boolean;
  totalCatalogCount?: number;
}

/**
 * Exports products list to a clean, well-formatted CSV file for local backup.
 */
export function exportProductsToCSV(products: Product[], options?: ProductExportOptions) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const scopeSuffix = options?.isFiltered ? '_filtered' : '_full_catalog';
  const filename = `Products_Backup_${timestamp}${scopeSuffix}.csv`;

  const metaHeader = [
    `# ==============================================================================`,
    `# PROFESSIONAL STOCK MANAGEMENT SYSTEM - PRODUCT CATALOG LOCAL BACKUP`,
    `# Generated At: ${new Date().toLocaleString()}`,
    `# Scope: ${options?.scopeTitle || 'Product Catalog'} (${products.length} records)`,
    options?.totalCatalogCount ? `# Total Master Catalog: ${options.totalCatalogCount} products` : '',
    `# Description: Master data backup of product definitions, barcodes, SKUs, pricing and stock levels.`,
    `# ==============================================================================`,
    '',
  ].filter(Boolean).join('\n');

  const headers = [
    'Product ID',
    'Product Name',
    'SKU',
    'Barcode',
    'Category',
    'Unit of Measure',
    'Selling Price ($)',
    'Minimum Stock Threshold',
    'Current In-Stock Units',
    'Stock Status',
    'Status (Active / Inactive)',
    'Created At',
    'Description',
  ];

  const rows = products.map((p) => [
    p.id,
    escapeCsvValue(p.name),
    escapeCsvValue(p.sku),
    escapeCsvValue(p.barcode),
    escapeCsvValue(p.category_name || 'General'),
    escapeCsvValue(p.unit),
    Number(p.selling_price || 0).toFixed(2),
    p.minimum_stock ?? 10,
    p.current_stock ?? 0,
    escapeCsvValue(
      p.current_stock === 0
        ? 'OUT_OF_STOCK'
        : (p.current_stock ?? 0) <= (p.minimum_stock ?? 10)
        ? 'LOW_STOCK'
        : 'IN_STOCK'
    ),
    p.active ? 'Active' : 'Inactive',
    p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '',
    escapeCsvValue(p.description || ''),
  ]);

  const csvContent = metaHeader + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCsv(filename, csvContent);
}

export interface InventoryExportOptions {
  scopeTitle?: string;
  operatorName?: string;
}

/**
 * Exports detailed inventory and valuation reports to CSV for local audit and backup.
 */
export function exportInventoryReportToCSV(inventory: any[], options?: InventoryExportOptions) {
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `Inventory_Report_Backup_${timestamp}.csv`;

  const totalCostValuation = inventory.reduce((sum, item) => sum + (Number(item.cost_valuation) || 0), 0);
  const totalRetailValuation = inventory.reduce((sum, item) => sum + (Number(item.retail_valuation) || 0), 0);
  const totalUnits = inventory.reduce((sum, item) => sum + (Number(item.current_stock) || 0), 0);
  const totalSpread = totalRetailValuation - totalCostValuation;
  const overallMargin = totalRetailValuation > 0 ? ((totalSpread / totalRetailValuation) * 100).toFixed(1) : '0.0';

  const metaHeader = [
    `# ==============================================================================`,
    `# PROFESSIONAL STOCK MANAGEMENT SYSTEM - INVENTORY VALUATION & STOCK REPORT BACKUP`,
    `# Generated At: ${new Date().toLocaleString()}`,
    `# Scope: ${options?.scopeTitle || 'Full Warehouse Inventory Snapshot'} (${inventory.length} items)`,
    `# Total In-Stock Units: ${totalUnits.toLocaleString()}`,
    `# Total Stock Cost Valuation: $${totalCostValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `# Total Potential Retail Valuation: $${totalRetailValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `# Potential Unrealized Gross Profit: $${totalSpread.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${overallMargin}%)`,
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
    'Unit',
    'Current Stock Units',
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
      escapeCsvValue(item.name),
      escapeCsvValue(item.sku),
      escapeCsvValue(item.barcode || ''),
      escapeCsvValue(item.category_name || 'General'),
      escapeCsvValue(item.unit || 'pcs'),
      item.current_stock ?? 0,
      Number(item.selling_price || 0).toFixed(2),
      cost.toFixed(2),
      retail.toFixed(2),
      spread.toFixed(2),
      `${marginPct}%`,
      item.minimum_stock ?? 10,
      escapeCsvValue(item.status || (item.current_stock === 0 ? 'OUT_OF_STOCK' : isReorder ? 'LOW_STOCK' : 'IN_STOCK')),
      item.active_batches_count ?? 0,
      isReorder ? 'YES - Reorder Required' : 'NO - Sufficient',
    ];
  });

  const csvContent = metaHeader + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCsv(filename, csvContent);
}
