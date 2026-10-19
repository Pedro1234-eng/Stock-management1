import { Router, type Request, type Response } from 'express';
import { pool, db } from '../db/index.ts';
import { products, categories, suppliers, customers, auditLogs } from '../db/schema.ts';
import { eq, desc, ilike, or } from 'drizzle-orm';
import { InventoryService } from '../services/inventoryService.ts';
import { InvoiceService } from '../services/invoiceService.ts';
import { ReportService } from '../services/reportService.ts';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth.ts';

const router = Router();

// Apply auth/session identity to all /api routes
router.use(authenticate);

// ==========================================
// 1. HEALTH ENDPOINT
// ==========================================
router.get('/health', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW() as now, current_database() as db');
    res.json({
      status: 'healthy',
      timestamp: result.rows[0].now,
      database: result.rows[0].db,
      uptime: process.uptime(),
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message || 'Database connection error',
    });
  }
});

// ==========================================
// 2. PRODUCTS ENDPOINTS
// ==========================================
router.get('/products', async (req: Request, res: Response) => {
  try {
    const { category_id, search, active } = req.query;
    let query = `
      SELECT p.*, c.name as category_name,
             COALESCE(SUM(b.quantity_remaining), 0)::INTEGER as current_stock,
             CASE 
               WHEN COALESCE(SUM(b.quantity_remaining), 0) = 0 THEN 'OUT_OF_STOCK'
               WHEN COALESCE(SUM(b.quantity_remaining), 0) <= p.minimum_stock THEN 'LOW_STOCK'
               ELSE 'IN_STOCK'
             END as stock_status
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock_batches b ON p.id = b.product_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (category_id) {
      params.push(Number(category_id));
      query += ` AND p.category_id = $${params.length}`;
    }

    if (active !== undefined) {
      params.push(active === 'true');
      query += ` AND p.active = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.barcode ILIKE $${params.length})`;
    }

    query += ` GROUP BY p.id, c.name ORDER BY p.name ASC`;

    const result = await pool.query(query, params);
    res.json(
      result.rows.map((r: any) => ({
        ...r,
        selling_price: parseFloat(r.selling_price),
      }))
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch products' });
  }
});

router.get('/products/barcode/:barcode', async (req: Request, res: Response) => {
  try {
    const { barcode } = req.params;
    const query = `
      SELECT p.*, c.name as category_name,
             COALESCE(SUM(b.quantity_remaining), 0)::INTEGER as current_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock_batches b ON p.id = b.product_id
      WHERE p.barcode = $1
      GROUP BY p.id, c.name
    `;
    const result = await pool.query(query, [barcode]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Product with barcode ${barcode} not found` });
    }
    const prod = result.rows[0];
    res.json({
      ...prod,
      selling_price: parseFloat(prod.selling_price),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to lookup barcode' });
  }
});

router.get('/products/sku/:sku', async (req: Request, res: Response) => {
  try {
    const { sku } = req.params;
    const query = `
      SELECT p.*, c.name as category_name,
             COALESCE(SUM(b.quantity_remaining), 0)::INTEGER as current_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock_batches b ON p.id = b.product_id
      WHERE p.sku = $1
      GROUP BY p.id, c.name
    `;
    const result = await pool.query(query, [sku]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Product with SKU ${sku} not found` });
    }
    const prod = result.rows[0];
    res.json({
      ...prod,
      selling_price: parseFloat(prod.selling_price),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to lookup SKU' });
  }
});

router.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const query = `
      SELECT p.*, c.name as category_name,
             COALESCE(SUM(b.quantity_remaining), 0)::INTEGER as current_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock_batches b ON p.id = b.product_id
      WHERE p.id = $1
      GROUP BY p.id, c.name
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const prod = result.rows[0];
    res.json({
      ...prod,
      selling_price: parseFloat(prod.selling_price),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch product' });
  }
});

router.post('/products', requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { barcode, sku, name, description, categoryId, unit, sellingPrice, minimumStock, imageUrl } = req.body;
    if (!barcode || !sku || !name || sellingPrice === undefined) {
      return res.status(400).json({ error: 'Barcode, SKU, name, and selling price are required.' });
    }

    const inserted = await db.insert(products).values({
      barcode: String(barcode).trim(),
      sku: String(sku).trim().toUpperCase(),
      name: String(name).trim(),
      description: description || null,
      categoryId: categoryId ? Number(categoryId) : null,
      unit: unit || 'pcs',
      sellingPrice: String(sellingPrice),
      minimumStock: minimumStock !== undefined ? Number(minimumStock) : 10,
      active: true,
      imageUrl: imageUrl || null,
    }).returning();

    // Log audit
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, description, created_at)
       VALUES ($1, 'PRODUCT_CREATE', 'products', $2, $3, NOW())`,
      [
        req.user?.name || 'User',
        String(inserted[0].id),
        `Created new product "${name}" (SKU: ${sku})`,
      ]
    );

    res.status(201).json(inserted[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'A product with this Barcode or SKU already exists.' });
    }
    res.status(500).json({ error: error.message || 'Failed to create product' });
  }
});

router.put('/products/:id', requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { barcode, sku, name, description, categoryId, unit, sellingPrice, minimumStock, active, imageUrl } = req.body;

    const updated = await db.update(products)
      .set({
        barcode: barcode !== undefined ? String(barcode).trim() : undefined,
        sku: sku !== undefined ? String(sku).trim().toUpperCase() : undefined,
        name: name !== undefined ? String(name).trim() : undefined,
        description: description !== undefined ? description : undefined,
        categoryId: categoryId !== undefined ? (categoryId ? Number(categoryId) : null) : undefined,
        unit: unit !== undefined ? unit : undefined,
        sellingPrice: sellingPrice !== undefined ? String(sellingPrice) : undefined,
        minimumStock: minimumStock !== undefined ? Number(minimumStock) : undefined,
        active: active !== undefined ? Boolean(active) : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(updated[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update product' });
  }
});

router.delete('/products/:id', requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    // As instructed by business rules: Deactivate rather than delete if history exists
    await db.update(products).set({ active: false, updatedAt: new Date() }).where(eq(products.id, id));
    res.json({ message: 'Product successfully deactivated.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete product' });
  }
});

// ==========================================
// 3. CATEGORIES, SUPPLIERS, CUSTOMERS
// ==========================================
router.get('/categories', async (_req, res) => {
  try {
    const cats = await pool.query(`
      SELECT c.*, COUNT(p.id)::INTEGER as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    res.json(cats.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/categories', requireRole(['admin', 'manager']), async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const inserted = await db.insert(categories).values({ name, description }).returning();
    res.status(201).json(inserted[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/suppliers', async (_req, res) => {
  try {
    const sups = await pool.query(`
      SELECT s.*, COUNT(b.id)::INTEGER as batches_supplied
      FROM suppliers s
      LEFT JOIN stock_batches b ON s.id = b.supplier_id
      GROUP BY s.id
      ORDER BY s.name ASC
    `);
    res.json(sups.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/suppliers', requireRole(['admin', 'manager', 'stock_clerk']), async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Supplier name is required' });
    const inserted = await db.insert(suppliers).values({ name, phone, email, address }).returning();
    res.status(201).json(inserted[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/customers', async (_req, res) => {
  try {
    const custs = await pool.query(`
      SELECT c.*, COUNT(i.id)::INTEGER as total_orders, COALESCE(SUM(i.total), 0)::NUMERIC(12,2) as lifetime_spent
      FROM customers c
      LEFT JOIN invoices i ON c.id = i.customer_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `);
    res.json(custs.rows.map((r: any) => ({ ...r, lifetime_spent: parseFloat(r.lifetime_spent) })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/customers', async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Customer name is required' });
    const inserted = await db.insert(customers).values({ name, phone, email, address }).returning();
    res.status(201).json(inserted[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. STOCK & FIFO OPERATIONS
// ==========================================
router.get('/stock', async (req: Request, res: Response) => {
  try {
    const { categoryId, status, search } = req.query;
    const inventory = await ReportService.getStockInventory({
      categoryId: categoryId ? Number(categoryId) : undefined,
      status: (status as any) || 'ALL',
      search: search ? String(search) : undefined,
    });
    res.json(inventory);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stock/product/:id', async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const batches = await ReportService.getProductBatches(productId);
    res.json(batches);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stock/batches', async (req: Request, res: Response) => {
  try {
    const productId = req.query.productId ? Number(req.query.productId) : undefined;
    const activeOnly = req.query.activeOnly !== 'false';
    const batches = await ReportService.getAllBatches({ productId, activeOnly });
    res.json(batches);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/stock/entry', requireRole(['admin', 'manager', 'stock_clerk']), async (req: AuthRequest, res: Response) => {
  try {
    const { productId, supplierId, batchNumber, purchaseDate, expiryDate, quantity, purchasePrice, reference, notes } = req.body;

    if (!productId || !batchNumber || !purchaseDate || quantity === undefined || purchasePrice === undefined) {
      return res.status(400).json({
        error: 'Product, Batch Number, Purchase Date, Quantity, and Purchase Price are required.',
      });
    }

    const result = await InventoryService.addStockEntry({
      productId: Number(productId),
      supplierId: supplierId ? Number(supplierId) : null,
      batchNumber: String(batchNumber).trim(),
      purchaseDate: String(purchaseDate),
      expiryDate: expiryDate ? String(expiryDate) : null,
      quantity: Number(quantity),
      purchasePrice: Number(purchasePrice),
      reference: reference || undefined,
      notes: notes || undefined,
      createdBy: req.user?.name || 'Stock Clerk',
    });

    res.status(201).json({
      message: 'Stock entry recorded successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to record stock entry' });
  }
});

router.post('/stock/adjust', requireRole(['admin', 'manager']), async (req: AuthRequest, res: Response) => {
  try {
    const { productId, batchId, adjustmentType, quantity, reason } = req.body;
    if (!productId || !batchId || !adjustmentType || !quantity || !reason) {
      return res.status(400).json({ error: 'All adjustment fields are required.' });
    }

    const result = await InventoryService.adjustStock({
      productId: Number(productId),
      batchId: Number(batchId),
      adjustmentType,
      quantity: Number(quantity),
      reason,
      createdBy: req.user?.name || 'Manager',
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Adjustment failed' });
  }
});

router.get('/stock/movements', async (req: Request, res: Response) => {
  try {
    const { productId, movementType, limit } = req.query;
    let query = `
      SELECT sm.*, p.name as product_name, p.sku, p.unit, b.batch_number
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN stock_batches b ON sm.batch_id = b.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (productId) {
      params.push(Number(productId));
      query += ` AND sm.product_id = $${params.length}`;
    }

    if (movementType) {
      params.push(String(movementType).toUpperCase());
      query += ` AND sm.movement_type = $${params.length}`;
    }

    query += ` ORDER BY sm.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit ? Number(limit) : 100);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stock/low', async (_req, res) => {
  try {
    const lowStock = await ReportService.getStockInventory({ status: 'LOW' });
    res.json(lowStock);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stock/out-of-stock', async (_req, res) => {
  try {
    const outOfStock = await ReportService.getStockInventory({ status: 'OUT' });
    res.json(outOfStock);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stock/expiry', async (req, res) => {
  try {
    const days = req.query.days ? Number(req.query.days) : 90;
    const productId = req.query.productId ? Number(req.query.productId) : undefined;
    const expiryBatches = await ReportService.getExpiryReport(days, productId);
    res.json(expiryBatches);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. INVOICES & SALES (ATOMIC FIFO OUT)
// ==========================================
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const { customerId, status, search, limit } = req.query;
    let query = `
      SELECT i.*, c.name as customer_name, COUNT(ii.id)::INTEGER as item_count
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (customerId) {
      params.push(Number(customerId));
      query += ` AND i.customer_id = $${params.length}`;
    }

    if (status) {
      params.push(String(status).toUpperCase());
      query += ` AND i.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (i.invoice_number ILIKE $${params.length} OR c.name ILIKE $${params.length})`;
    }

    query += ` GROUP BY i.id, c.name ORDER BY i.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit ? Number(limit) : 50);

    const result = await pool.query(query, params);
    res.json(
      result.rows.map((r: any) => ({
        ...r,
        subtotal: parseFloat(r.subtotal),
        tax: parseFloat(r.tax),
        discount: parseFloat(r.discount),
        total: parseFloat(r.total),
      }))
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const invoice = await InvoiceService.getInvoiceById(id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/invoices/:id/print', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const invoice = await InvoiceService.getInvoiceById(id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json({
      business: {
        name: 'Apex Stock & Building Supply Ltd',
        address: '100 Industrial Boulevard, Logistics District',
        phone: '+1 (800) 555-0199',
        email: 'sales@apexstocksupply.com',
        taxId: 'US-TAX-89230192',
      },
      invoice,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/invoices', requireRole(['admin', 'manager', 'sales']), async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, items, paymentMethod, discount, taxRate, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required to create an invoice.' });
    }

    const created = await InvoiceService.createInvoice({
      customerId: customerId ? Number(customerId) : null,
      items: items.map((it: any) => ({
        productId: Number(it.productId),
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        discount: it.discount ? Number(it.discount) : 0,
      })),
      paymentMethod: paymentMethod || 'Cash',
      discount: discount ? Number(discount) : 0,
      taxRate: taxRate !== undefined ? Number(taxRate) : 0.08,
      notes: notes || '',
      createdBy: req.user?.name || 'Sales Clerk',
    });

    res.status(201).json(created);
  } catch (error: any) {
    // If insufficient stock or validation error, return descriptive 400
    res.status(400).json({ error: error.message || 'Sale failed' });
  }
});

// ==========================================
// 6. REPORTS & DASHBOARD
// ==========================================
router.get('/reports/dashboard', async (_req, res) => {
  try {
    const data = await ReportService.getDashboardData();
    res.json(data);
  } catch (error: any) {
    console.error('Failed to get dashboard data, returning fallback:', error);
    res.json(ReportService.getFallbackDashboardData(error.message));
  }
});

router.get('/reports/sales', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT 
        i.id, i.invoice_number, i.created_at, i.total, i.payment_method, i.status,
        c.name as customer_name,
        COUNT(ii.id)::INTEGER as items_count
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (startDate && endDate) {
      params.push(startDate, endDate);
      query += ` AND i.created_at::DATE >= $1 AND i.created_at::DATE <= $2`;
    }
    query += ` GROUP BY i.id, c.name ORDER BY i.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(
      result.rows.map((r: any) => ({
        ...r,
        total: parseFloat(r.total),
      }))
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reports/sales/items', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT 
        ii.id as item_id,
        i.id as invoice_id,
        i.invoice_number,
        i.created_at as sale_date,
        COALESCE(c.name, 'Walk-in Customer') as customer_name,
        i.payment_method,
        i.status as invoice_status,
        i.created_by as operator,
        p.id as product_id,
        p.name as product_name,
        p.sku,
        p.barcode,
        p.unit,
        COALESCE(cat.name, 'General') as category_name,
        ii.quantity,
        ii.unit_price::NUMERIC(12,2) as unit_price,
        ii.discount::NUMERIC(12,2) as discount,
        ii.total::NUMERIC(12,2) as item_total
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      JOIN products p ON ii.product_id = p.id
      LEFT JOIN categories cat ON p.category_id = cat.id
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (startDate && endDate) {
      params.push(startDate, endDate);
      query += ` AND i.created_at::DATE >= $1 AND i.created_at::DATE <= $2`;
    }
    query += ` ORDER BY i.created_at DESC, ii.id ASC`;

    const result = await pool.query(query, params);
    res.json(
      result.rows.map((r: any) => ({
        ...r,
        unit_price: parseFloat(r.unit_price),
        discount: parseFloat(r.discount),
        item_total: parseFloat(r.item_total),
      }))
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reports/purchases', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.id as supplier_id, s.name as supplier_name,
        COUNT(b.id)::INTEGER as batches_count,
        COALESCE(SUM(b.quantity_received), 0)::INTEGER as total_units_received,
        COALESCE(SUM(b.quantity_received * b.purchase_price), 0)::NUMERIC(12,2) as total_purchased_value
      FROM suppliers s
      LEFT JOIN stock_batches b ON s.id = b.supplier_id
      GROUP BY s.id, s.name
      ORDER BY total_purchased_value DESC
    `);
    res.json(
      result.rows.map((r: any) => ({
        ...r,
        total_purchased_value: parseFloat(r.total_purchased_value),
      }))
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reports/profit', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const profit = await ReportService.getProfitReport(
      startDate ? String(startDate) : undefined,
      endDate ? String(endDate) : undefined
    );
    res.json(profit);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reports/batch-profitability', async (req, res) => {
  try {
    const { status, categoryId, productId, startDate, endDate, sortBy } = req.query;
    const report = await ReportService.getBatchProfitabilityReport({
      status: status === 'all' ? 'all' : 'completed',
      categoryId: categoryId ? Number(categoryId) : undefined,
      productId: productId ? Number(productId) : undefined,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      sortBy: sortBy as any,
    });
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reports/stock', async (_req, res) => {
  try {
    const stockReport = await ReportService.getStockInventory();
    res.json(stockReport);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 7. AUDIT LOGS & USERS
// ==========================================
router.get('/audit-logs', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users', async (_req, res) => {
  try {
    const result = await pool.query(`SELECT id, username, email, full_name, role, created_at FROM users ORDER BY id ASC`);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
