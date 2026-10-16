import { pool } from '../db/index.ts';
import { InventoryService, type FifoConsumptionResult } from './inventoryService.ts';

export interface InvoiceItemInput {
  productId: number;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface CreateInvoiceInput {
  customerId?: number | null;
  items: InvoiceItemInput[];
  paymentMethod: 'Cash' | 'Mobile Money' | 'Card' | 'Bank Transfer' | 'Credit';
  discount?: number;
  taxRate?: number; // e.g. 0.08 for 8%
  notes?: string;
  createdBy: string;
}

export class InvoiceService {
  /**
   * Generates a new unique invoice number like INV-2026-0003
   */
  static async generateInvoiceNumber(client: any): Promise<string> {
    const year = new Date().getFullYear();
    const countRes = await client.query(
      `SELECT COUNT(*)::INTEGER as count FROM invoices WHERE invoice_number LIKE $1`,
      [`INV-${year}-%`]
    );
    const nextNum = (countRes.rows[0].count + 1).toString().padStart(4, '0');
    return `INV-${year}-${nextNum}`;
  }

  /**
   * Creates an invoice atomically with FIFO stock deduction.
   * If any product has insufficient stock, the entire transaction rolls back cleanly.
   */
  static async createInvoice(data: CreateInvoiceInput) {
    if (!data.items || data.items.length === 0) {
      throw new Error('An invoice must contain at least one product item.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const invoiceNumber = await this.generateInvoiceNumber(client);

      // Calculate totals
      let subtotal = 0;
      for (const item of data.items) {
        if (item.quantity <= 0) {
          throw new Error('Item quantity must be greater than zero.');
        }
        if (item.unitPrice < 0) {
          throw new Error('Unit price cannot be negative.');
        }
        const itemDiscount = item.discount || 0;
        const itemTotal = (item.quantity * item.unitPrice) - itemDiscount;
        subtotal += Math.max(0, itemTotal);
      }

      const globalDiscount = data.discount || 0;
      const taxRate = data.taxRate !== undefined ? data.taxRate : 0.08; // default 8% VAT/sales tax
      const taxableAmount = Math.max(0, subtotal - globalDiscount);
      const taxAmount = parseFloat((taxableAmount * taxRate).toFixed(2));
      const grandTotal = parseFloat((taxableAmount + taxAmount).toFixed(2));

      // 1. Insert Invoice
      const invoiceRes = await client.query(
        `INSERT INTO invoices 
         (invoice_number, customer_id, subtotal, tax, discount, total, payment_method, status, created_by, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'PAID', $8, $9, NOW())
         RETURNING id, invoice_number, created_at`,
        [
          invoiceNumber,
          data.customerId || null,
          subtotal.toFixed(2),
          taxAmount.toFixed(2),
          globalDiscount.toFixed(2),
          grandTotal.toFixed(2),
          data.paymentMethod || 'Cash',
          data.createdBy,
          data.notes || '',
        ]
      );

      const invoiceId = invoiceRes.rows[0].id;
      const fifoResults: FifoConsumptionResult[] = [];

      // 2. Consume stock via FIFO for each item and insert invoice_items
      for (const item of data.items) {
        const itemDiscount = item.discount || 0;
        const itemTotal = (item.quantity * item.unitPrice) - itemDiscount;

        // FIFO consumption (locks batches, updates quantity_remaining, creates OUT movements)
        const fifoResult = await InventoryService.consumeFifo(
          client,
          item.productId,
          item.quantity,
          invoiceNumber,
          data.createdBy,
          item.unitPrice
        );
        fifoResults.push(fifoResult);

        // Insert invoice item
        await client.query(
          `INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount, total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            invoiceId,
            item.productId,
            item.quantity,
            item.unitPrice.toFixed(2),
            itemDiscount.toFixed(2),
            itemTotal.toFixed(2),
          ]
        );
      }

      // 3. Log audit event
      await client.query(
        `INSERT INTO audit_logs (user_id, action, table_name, record_id, description, created_at)
         VALUES ($1, 'INVOICE_CREATE', 'invoices', $2, $3, NOW())`,
        [
          data.createdBy,
          String(invoiceId),
          `Created invoice ${invoiceNumber} for total $${grandTotal.toFixed(2)} (${data.items.length} items)`,
        ]
      );

      await client.query('COMMIT');

      // Fetch customer name if present
      let customerName = 'Walk-in Customer';
      if (data.customerId) {
        const custRes = await client.query('SELECT name FROM customers WHERE id = $1', [
          data.customerId,
        ]);
        if (custRes.rows.length > 0) {
          customerName = custRes.rows[0].name;
        }
      }

      return {
        id: invoiceId,
        invoiceNumber,
        customerId: data.customerId,
        customerName,
        subtotal,
        tax: taxAmount,
        discount: globalDiscount,
        total: grandTotal,
        paymentMethod: data.paymentMethod,
        status: 'PAID',
        createdAt: invoiceRes.rows[0].created_at,
        fifoAllocations: fifoResults,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves a full invoice with items and customer details for viewing & printing
   */
  static async getInvoiceById(id: number) {
    const client = await pool.connect();
    try {
      const invRes = await client.query(
        `SELECT i.*, 
                c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address
         FROM invoices i
         LEFT JOIN customers c ON i.customer_id = c.id
         WHERE i.id = $1`,
        [id]
      );

      if (invRes.rows.length === 0) {
        return null;
      }

      const invoice = invRes.rows[0];

      const itemsRes = await client.query(
        `SELECT ii.*, p.name as product_name, p.sku, p.barcode, p.unit
         FROM invoice_items ii
         JOIN products p ON ii.product_id = p.id
         WHERE ii.invoice_id = $1
         ORDER BY ii.id ASC`,
        [id]
      );

      return {
        ...invoice,
        items: itemsRes.rows,
      };
    } finally {
      client.release();
    }
  }
}
