import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface BatchAuditExportItem {
  id: number;
  product_id?: number;
  product_name: string;
  sku: string;
  barcode?: string;
  category_name?: string;
  unit: string;
  batch_number: string;
  supplier_name?: string;
  purchase_date: string;
  expiry_date?: string | null;
  days_until_expiry?: number | null;
  purchase_price: number;
  quantity_remaining: number;
  total_cost_value?: number;
}

export function getExpiryStatusLabel(days: number | null | undefined, expiryDate: string | null | undefined): string {
  if (!expiryDate) return 'No Expiry';
  if (days === null || days === undefined) {
    const diff = Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `EXPIRED (${Math.abs(diff)}d ago)`;
    if (diff <= 30) return `CRITICAL: <=30d (${diff}d left)`;
    if (diff <= 60) return `APPROACHING (${diff}d left)`;
    return `SAFE (${diff}d left)`;
  }
  if (days < 0) return `EXPIRED (${Math.abs(days)}d ago)`;
  if (days <= 30) return `CRITICAL: <=30d (${days}d left)`;
  if (days <= 60) return `APPROACHING (${days}d left)`;
  return `SAFE (${days}d left)`;
}

/**
 * Exports batch inventory data to a CSV file for physical audit & reconciliation.
 */
export function exportBatchesToCSV(
  batches: BatchAuditExportItem[],
  options: {
    scopeName: string;
    operatorName?: string;
  }
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `Batch_Inventory_Audit_${options.scopeName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${timestamp}.csv`;

  const headers = [
    'Line #',
    'Product Name',
    'SKU',
    'Barcode',
    'Category',
    'Batch Number',
    'Supplier',
    'Purchase Date',
    'Expiry Date',
    'Expiry Status',
    'System Qty Remaining',
    'Unit',
    'Unit Purchase Cost ($)',
    'Total Valuation ($)',
    'Physical Count (Audit)',
    'Variance (+/-)',
    'Condition / Damaged Qty',
    'Auditor Notes',
  ];

  const rows = batches.map((b, idx) => {
    const cost = Number(b.purchase_price) || 0;
    const qty = Number(b.quantity_remaining) || 0;
    const val = b.total_cost_value !== undefined ? Number(b.total_cost_value) : cost * qty;
    const expiryStatus = getExpiryStatusLabel(b.days_until_expiry, b.expiry_date);

    return [
      idx + 1,
      `"${(b.product_name || '').replace(/"/g, '""')}"`,
      `"${(b.sku || '').replace(/"/g, '""')}"`,
      `"${(b.barcode || '').replace(/"/g, '""')}"`,
      `"${(b.category_name || '').replace(/"/g, '""')}"`,
      `"${(b.batch_number || '').replace(/"/g, '""')}"`,
      `"${(b.supplier_name || 'Direct / Consignment').replace(/"/g, '""')}"`,
      b.purchase_date ? new Date(b.purchase_date).toLocaleDateString() : '',
      b.expiry_date ? new Date(b.expiry_date).toLocaleDateString() : 'N/A',
      `"${expiryStatus.replace(/"/g, '""')}"`,
      qty,
      b.unit || 'pcs',
      cost.toFixed(2),
      val.toFixed(2),
      '', // Blank for physical count
      '', // Blank for variance
      '', // Blank for condition
      '', // Blank for auditor notes
    ];
  });

  // Metadata comments at top of CSV
  const metaHeader = [
    `# Physical Inventory Batch Audit Worksheet`,
    `# Scope: ${options.scopeName}`,
    `# Generated At: ${new Date().toLocaleString()}`,
    `# Auditor / Operator: ${options.operatorName || 'Inventory Supervisor'}`,
    `# Total Batches: ${batches.length}`,
    `# Total System Units: ${batches.reduce((sum, b) => sum + (Number(b.quantity_remaining) || 0), 0)}`,
    `# Instructions: Record physical lot counts in column 'Physical Count (Audit)'. Calculate variance and log adjustments in system.`,
    '',
  ].join('\n');

  const csvContent = metaHeader + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports batch inventory data to a print-ready PDF file for physical stocktakes.
 */
export function exportBatchesToPDF(
  batches: BatchAuditExportItem[],
  options: {
    scopeName: string;
    operatorName?: string;
  }
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `Batch_Inventory_Audit_${options.scopeName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${timestamp}.pdf`;

  // Initialize jsPDF in Landscape A4 for optimal table width
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const totalQty = batches.reduce((sum, b) => sum + (Number(b.quantity_remaining) || 0), 0);
  const totalVal = batches.reduce(
    (sum, b) => sum + (Number(b.quantity_remaining) || 0) * (Number(b.purchase_price) || 0),
    0
  );
  const expiring30 = batches.filter((b) => {
    if (!b.expiry_date) return false;
    const diff = b.days_until_expiry !== null && b.days_until_expiry !== undefined
      ? b.days_until_expiry
      : Math.ceil((new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 30;
  }).length;
  const expiredCount = batches.filter((b) => {
    if (!b.expiry_date) return false;
    const diff = b.days_until_expiry !== null && b.days_until_expiry !== undefined
      ? b.days_until_expiry
      : Math.ceil((new Date(b.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diff < 0;
  }).length;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Title & Brand
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('PHYSICAL INVENTORY BATCH AUDIT WORKSHEET', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Apex Stock & Building Supply Ltd  |  Warehouse Inventory Control System', 14, 16);
  doc.text(`Scope: ${options.scopeName}  |  Generated: ${new Date().toLocaleString()}  |  Auditor: ${options.operatorName || 'Inventory Supervisor'}`, 14, 22);

  // Summary Metrics Badges in Header Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240); // slate-200
  const rightText = `Lots: ${batches.length}  |  Units: ${totalQty.toLocaleString()}  |  Valuation: $${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  doc.text(rightText, pageWidth - 14, 12, { align: 'right' });

  if (expiring30 > 0 || expiredCount > 0) {
    doc.setTextColor(251, 191, 36); // amber-400
    doc.text(`Expiry Alerts: ${expiring30} lot(s) <= 30d  |  ${expiredCount} expired lot(s)`, pageWidth - 14, 19, { align: 'right' });
  }

  // Table Body Rows
  const tableData = batches.map((b, idx) => {
    const cost = Number(b.purchase_price) || 0;
    const qty = Number(b.quantity_remaining) || 0;
    const expiryStatus = getExpiryStatusLabel(b.days_until_expiry, b.expiry_date);
    const expiryFormatted = b.expiry_date ? new Date(b.expiry_date).toLocaleDateString() : 'None';

    return [
      idx + 1,
      `${b.product_name}\nSKU: ${b.sku}${b.category_name ? ` | ${b.category_name}` : ''}`,
      b.batch_number,
      b.supplier_name || 'Direct',
      `${expiryFormatted}\n[${expiryStatus}]`,
      `$${cost.toFixed(2)}`,
      `${qty} ${b.unit || ''}`,
      '[             ]', // Physical Count blank box
      '[       ]',     // Variance blank box
      '________________', // Auditor Notes
    ];
  });

  autoTable(doc, {
    startY: 32,
    head: [[
      '#',
      'Product / SKU / Category',
      'Batch Number',
      'Supplier',
      'Expiry & Status',
      'Unit Cost',
      'System Qty',
      'Physical Count',
      'Variance (+/-)',
      'Auditor Notes / Discrepancy',
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.1,
      font: 'helvetica',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 55 },
      2: { cellWidth: 32, font: 'courier', fontStyle: 'bold' },
      3: { cellWidth: 30 },
      4: { cellWidth: 35 },
      5: { cellWidth: 18, halign: 'right', font: 'courier' },
      6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 26, halign: 'center', font: 'courier' },
      8: { cellWidth: 20, halign: 'center', font: 'courier' },
      9: { cellWidth: 38 },
    },
    didDrawPage: (data) => {
      // Footer on every page
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Physical Inventory Batch Audit Sheet  |  Page ${data.pageNumber}`,
        14,
        pageHeight - 8
      );
      doc.text(
        'Apex Stock Management System  |  Confidential Internal Audit Document',
        pageWidth - 14,
        pageHeight - 8,
        { align: 'right' }
      );
    },
  });

  // Auditor Sign-off block at bottom of document
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : pageHeight - 35;
  const remainingSpace = pageHeight - finalY;

  // Add new page if not enough space for sign-off block
  if (remainingSpace < 28) {
    doc.addPage();
    renderSignOffBlock(doc, 15, pageWidth);
  } else {
    renderSignOffBlock(doc, finalY, pageWidth);
  }

  doc.save(filename);
}

function renderSignOffBlock(doc: jsPDF, y: number, pageWidth: number) {
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, pageWidth - 28, 22, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('AUDIT CERTIFICATION & RECONCILIATION SIGN-OFF', 18, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('I hereby certify that all lot counts recorded on this worksheet represent true physical stock on hand.', 18, y + 9);

  // Signature lines
  doc.setDrawColor(148, 163, 184);
  doc.line(18, y + 18, 90, y + 18);
  doc.text('Lead Auditor Signature & Date', 18, y + 21);

  doc.line(110, y + 18, 185, y + 18);
  doc.text('Warehouse Manager Sign-off & Date', 110, y + 21);

  doc.line(205, y + 18, 275, y + 18);
  doc.text('Reconciliation Adjusted in System (Date & Ref)', 205, y + 21);
}
