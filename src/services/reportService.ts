import { pool } from '../db/index.ts';

export class ReportService {
  /**
   * Complete Dashboard Overview Metrics & Charts
   */
  static async getDashboardData() {
    const client = await pool.connect();
    try {
      // 1. Total products
      const prodRes = await client.query(
        `SELECT COUNT(*)::INTEGER as total_products,
                COUNT(CASE WHEN active = true THEN 1 END)::INTEGER as active_products
         FROM products`
      );

      // 2. Stock inventory totals
      const stockRes = await client.query(
        `SELECT 
           COALESCE(SUM(quantity_remaining), 0)::INTEGER as total_stock_quantity,
           COALESCE(SUM(quantity_remaining * purchase_price), 0)::NUMERIC(12,2) as total_cost_value
         FROM stock_batches`
      );

      // 3. Sales today
      const todaySalesRes = await client.query(
        `SELECT 
           COALESCE(COUNT(*), 0)::INTEGER as today_invoices,
           COALESCE(SUM(total), 0)::NUMERIC(12,2) as today_sales_amount
         FROM invoices
         WHERE created_at::DATE = CURRENT_DATE`
      );

      // 4. Low stock and Out of stock counts
      const stockStatusRes = await client.query(
        `WITH prod_stock AS (
           SELECT p.id, p.minimum_stock, COALESCE(SUM(b.quantity_remaining), 0)::INTEGER as current_stock
           FROM products p
           LEFT JOIN stock_batches b ON p.id = b.product_id
           WHERE p.active = true
           GROUP BY p.id, p.minimum_stock
         )
         SELECT 
           COUNT(CASE WHEN current_stock = 0 THEN 1 END)::INTEGER as out_of_stock_count,
           COUNT(CASE WHEN current_stock > 0 AND current_stock <= minimum_stock THEN 1 END)::INTEGER as low_stock_count
         FROM prod_stock`
      );

      // 5. Category breakdown
      const categoryRes = await client.query(
        `SELECT 
           c.name as category_name,
           COUNT(DISTINCT p.id)::INTEGER as product_count,
           COALESCE(SUM(b.quantity_remaining), 0)::INTEGER as total_units,
           COALESCE(SUM(b.quantity_remaining * b.purchase_price), 0)::NUMERIC(12,2) as category_value
         FROM categories c
         LEFT JOIN products p ON c.id = p.category_id
         LEFT JOIN stock_batches b ON p.id = b.product_id
         GROUP BY c.id, c.name
         ORDER BY category_value DESC`
      );

      // 6. Top 5 selling products
      const topSellingRes = await client.query(
        `SELECT 
           p.id, p.name, p.sku,
           SUM(ii.quantity)::INTEGER as total_sold,
           SUM(ii.total)::NUMERIC(12,2) as revenue
         FROM invoice_items ii
         JOIN products p ON ii.product_id = p.id
         GROUP BY p.id, p.name, p.sku
         ORDER BY total_sold DESC
         LIMIT 5`
      );

      // 7. Recent 8 stock movements
      const recentMovementsRes = await client.query(
        `SELECT sm.*, p.name as product_name, p.sku, p.unit
         FROM stock_movements sm
         JOIN products p ON sm.product_id = p.id
         ORDER BY sm.created_at DESC
         LIMIT 8`
      );

      // 8. 7-day sales trend
      const salesTrendRes = await client.query(
        `SELECT 
           TO_CHAR(d.day, 'YYYY-MM-DD') as date,
           TO_CHAR(d.day, 'Dy') as day_label,
           COALESCE(SUM(i.total), 0)::NUMERIC(12,2) as sales,
           COUNT(i.id)::INTEGER as invoice_count
         FROM (
           SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval)::DATE as day
         ) d
         LEFT JOIN invoices i ON i.created_at::DATE = d.day
         GROUP BY d.day
         ORDER BY d.day ASC`
      );

      return {
        metrics: {
          totalProducts: prodRes.rows[0].total_products,
          activeProducts: prodRes.rows[0].active_products,
          totalStockQuantity: stockRes.rows[0].total_stock_quantity,
          inventoryValue: parseFloat(stockRes.rows[0].total_cost_value),
          todaySales: parseFloat(todaySalesRes.rows[0].today_sales_amount),
          todayInvoices: todaySalesRes.rows[0].today_invoices,
          lowStockCount: stockStatusRes.rows[0].low_stock_count,
          outOfStockCount: stockStatusRes.rows[0].out_of_stock_count,
        },
        categoryBreakdown: categoryRes.rows.map((r: any) => ({
          ...r,
          category_value: parseFloat(r.category_value),
        })),
        topSelling: topSellingRes.rows.map((r: any) => ({
          ...r,
          revenue: parseFloat(r.revenue),
        })),
        recentMovements: recentMovementsRes.rows,
        salesTrend: salesTrendRes.rows.map((r: any) => ({
          ...r,
          sales: parseFloat(r.sales),
        })),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Detailed Stock Inventory List with Batches & Status
   */
  static async getStockInventory(filters?: {
    categoryId?: number;
    status?: 'ALL' | 'LOW' | 'OUT' | 'NORMAL';
    search?: string;
  }) {
    const client = await pool.connect();
    try {
      let query = `
        SELECT 
          p.id, p.barcode, p.sku, p.name, p.unit, p.selling_price, p.minimum_stock, p.active,
          c.name as category_name,
          COALESCE(SUM(b.quantity_remaining), 0)::INTEGER as current_stock,
          COALESCE(SUM(b.quantity_remaining * b.purchase_price), 0)::NUMERIC(12,2) as cost_valuation,
          COALESCE(SUM(b.quantity_remaining * p.selling_price), 0)::NUMERIC(12,2) as retail_valuation,
          COUNT(CASE WHEN b.quantity_remaining > 0 THEN 1 END)::INTEGER as active_batches_count
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN stock_batches b ON p.id = b.product_id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.categoryId) {
        params.push(filters.categoryId);
        query += ` AND p.category_id = $${params.length}`;
      }

      if (filters?.search) {
        params.push(`%${filters.search}%`);
        query += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.barcode ILIKE $${params.length})`;
      }

      query += ` GROUP BY p.id, p.barcode, p.sku, p.name, p.unit, p.selling_price, p.minimum_stock, p.active, c.name`;

      if (filters?.status === 'OUT') {
        query += ` HAVING COALESCE(SUM(b.quantity_remaining), 0) = 0`;
      } else if (filters?.status === 'LOW') {
        query += ` HAVING COALESCE(SUM(b.quantity_remaining), 0) > 0 AND COALESCE(SUM(b.quantity_remaining), 0) <= p.minimum_stock`;
      } else if (filters?.status === 'NORMAL') {
        query += ` HAVING COALESCE(SUM(b.quantity_remaining), 0) > p.minimum_stock`;
      }

      query += ` ORDER BY p.name ASC`;

      const res = await client.query(query, params);
      return res.rows.map((row: any) => ({
        ...row,
        selling_price: parseFloat(row.selling_price),
        cost_valuation: parseFloat(row.cost_valuation),
        retail_valuation: parseFloat(row.retail_valuation),
        status:
          row.current_stock === 0
            ? 'OUT_OF_STOCK'
            : row.current_stock <= row.minimum_stock
            ? 'LOW_STOCK'
            : 'IN_STOCK',
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Batches for a specific product for FIFO inspection
   */
  static async getProductBatches(productId: number) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT b.*, s.name as supplier_name
         FROM stock_batches b
         LEFT JOIN suppliers s ON b.supplier_id = s.id
         WHERE b.product_id = $1
         ORDER BY b.purchase_date ASC, b.id ASC`,
        [productId]
      );
      return res.rows.map((b: any) => ({
        ...b,
        purchase_price: parseFloat(b.purchase_price),
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Expiry warning report (batches expiring in next 90 days or already expired)
   */
  static async getExpiryReport(days = 90, productId?: number) {
    const client = await pool.connect();
    try {
      let query = `
        SELECT b.*, p.name as product_name, p.sku, p.unit, s.name as supplier_name,
               (b.expiry_date - CURRENT_DATE)::INTEGER as days_until_expiry
        FROM stock_batches b
        JOIN products p ON b.product_id = p.id
        LEFT JOIN suppliers s ON b.supplier_id = s.id
        WHERE b.quantity_remaining > 0 
          AND b.expiry_date IS NOT NULL 
          AND b.expiry_date <= (CURRENT_DATE + ($1 || ' days')::INTERVAL)
      `;
      const params: any[] = [days];
      if (productId) {
        params.push(productId);
        query += ` AND b.product_id = $${params.length}`;
      }
      query += ` ORDER BY b.expiry_date ASC`;

      const res = await client.query(query, params);
      return res.rows.map((b: any) => ({
        ...b,
        purchase_price: parseFloat(b.purchase_price),
        days_until_expiry: Number(b.days_until_expiry),
      }));
    } finally {
      client.release();
    }
  }

  /**
   * All inventory batches across products for physical audit & reporting
   */
  static async getAllBatches(params?: { productId?: number; activeOnly?: boolean }) {
    const client = await pool.connect();
    try {
      let query = `
        SELECT b.*, 
               p.name as product_name, 
               p.sku, 
               p.barcode, 
               p.unit,
               c.name as category_name,
               s.name as supplier_name,
               (b.expiry_date - CURRENT_DATE)::INTEGER as days_until_expiry,
               (b.quantity_remaining * b.purchase_price)::NUMERIC(12,2) as total_cost_value
        FROM stock_batches b
        JOIN products p ON b.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON b.supplier_id = s.id
        WHERE 1=1
      `;
      const queryParams: any[] = [];
      if (params?.productId) {
        queryParams.push(params.productId);
        query += ` AND b.product_id = $${queryParams.length}`;
      }
      if (params?.activeOnly) {
        query += ` AND b.quantity_remaining > 0`;
      }
      query += ` ORDER BY p.name ASC, b.purchase_date ASC, b.id ASC`;

      const res = await client.query(query, queryParams);
      return res.rows.map((b: any) => ({
        ...b,
        purchase_price: parseFloat(b.purchase_price),
        total_cost_value: parseFloat(b.total_cost_value),
        days_until_expiry: b.days_until_expiry !== null ? Number(b.days_until_expiry) : null,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Profit estimation report: Revenue vs COGS
   */
  static async getProfitReport(startDate?: string, endDate?: string) {
    const client = await pool.connect();
    try {
      let dateFilter = '';
      const params: any[] = [];
      if (startDate && endDate) {
        params.push(startDate, endDate);
        dateFilter = `WHERE i.created_at::DATE >= $1 AND i.created_at::DATE <= $2`;
      }

      const res = await client.query(
        `WITH item_sales AS (
           SELECT 
             i.id as invoice_id,
             i.created_at::DATE as sale_date,
             ii.product_id,
             ii.quantity,
             ii.unit_price,
             ii.discount,
             ii.total as item_revenue
           FROM invoices i
           JOIN invoice_items ii ON i.id = ii.invoice_id
           ${dateFilter}
         ),
         product_cogs AS (
           SELECT 
             sm.reference as invoice_number,
             sm.product_id,
             SUM(sm.quantity * b.purchase_price) as cogs
           FROM stock_movements sm
           JOIN stock_batches b ON sm.batch_id = b.id
           WHERE sm.movement_type = 'OUT'
           GROUP BY sm.reference, sm.product_id
         )
         SELECT 
           p.id as product_id,
           p.name as product_name,
           p.sku,
           SUM(s.quantity)::INTEGER as units_sold,
           SUM(s.item_revenue)::NUMERIC(12,2) as total_revenue,
           COALESCE(SUM(c.cogs), 0)::NUMERIC(12,2) as total_cogs,
           (SUM(s.item_revenue) - COALESCE(SUM(c.cogs), 0))::NUMERIC(12,2) as gross_profit,
           CASE 
             WHEN SUM(s.item_revenue) > 0 THEN 
               ROUND(((SUM(s.item_revenue) - COALESCE(SUM(c.cogs), 0)) / SUM(s.item_revenue) * 100)::NUMERIC, 1)
             ELSE 0
           END as profit_margin_pct
         FROM item_sales s
         JOIN products p ON s.product_id = p.id
         LEFT JOIN product_cogs c ON p.id = c.product_id
         GROUP BY p.id, p.name, p.sku
         ORDER BY gross_profit DESC`,
        params
      );

      const items = res.rows.map((r: any) => ({
        ...r,
        total_revenue: parseFloat(r.total_revenue),
        total_cogs: parseFloat(r.total_cogs),
        gross_profit: parseFloat(r.gross_profit),
        profit_margin_pct: parseFloat(r.profit_margin_pct),
      }));

      const totalRevenue = items.reduce((sum, item) => sum + item.total_revenue, 0);
      const totalCogs = items.reduce((sum, item) => sum + item.total_cogs, 0);
      const grossProfit = totalRevenue - totalCogs;
      const marginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

      return {
        items,
        summary: {
          totalRevenue,
          totalCogs,
          grossProfit,
          profitMarginPct: parseFloat(marginPct.toFixed(1)),
        },
      };
    } finally {
      client.release();
    }
  }

  /**
   * Batch Profit Margin & Cost vs Realized Sales Comparison Report
   */
  static async getBatchProfitabilityReport(filters?: {
    status?: 'completed' | 'all';
    categoryId?: number;
    productId?: number;
    startDate?: string;
    endDate?: string;
    sortBy?: 'margin_desc' | 'margin_asc' | 'profit_desc' | 'revenue_desc' | 'cost_desc' | 'date_desc';
  }) {
    const client = await pool.connect();
    try {
      const statusFilter = filters?.status || 'completed';
      const params: any[] = [];
      let whereClauses: string[] = [];

      if (statusFilter === 'completed') {
        whereClauses.push('b.quantity_remaining = 0 AND b.quantity_received > 0');
      }

      if (filters?.categoryId) {
        params.push(filters.categoryId);
        whereClauses.push(`p.category_id = $${params.length}`);
      }

      if (filters?.productId) {
        params.push(filters.productId);
        whereClauses.push(`b.product_id = $${params.length}`);
      }

      if (filters?.startDate) {
        params.push(filters.startDate);
        whereClauses.push(`b.purchase_date >= $${params.length}`);
      }

      if (filters?.endDate) {
        params.push(filters.endDate);
        whereClauses.push(`b.purchase_date <= $${params.length}`);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      let orderBy = 'realized_profit DESC';
      if (filters?.sortBy === 'margin_desc') {
        orderBy = 'profit_margin_pct DESC, realized_profit DESC';
      } else if (filters?.sortBy === 'margin_asc') {
        orderBy = 'profit_margin_pct ASC, realized_profit ASC';
      } else if (filters?.sortBy === 'revenue_desc') {
        orderBy = 'realized_sales_revenue DESC';
      } else if (filters?.sortBy === 'cost_desc') {
        orderBy = 'total_purchase_cost DESC';
      } else if (filters?.sortBy === 'date_desc') {
        orderBy = 'b.purchase_date DESC';
      }

      const query = `
        SELECT 
          b.id as batch_id,
          b.batch_number,
          b.purchase_date,
          b.expiry_date,
          b.quantity_received,
          b.quantity_remaining,
          b.purchase_price::NUMERIC(12,2) as unit_purchase_price,
          (b.quantity_received * b.purchase_price)::NUMERIC(12,2) as total_purchase_cost,
          p.id as product_id,
          p.name as product_name,
          p.sku,
          p.unit,
          c.name as category_name,
          s.name as supplier_name,
          COALESCE(SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity ELSE 0 END), 0)::INTEGER as units_sold,
          COALESCE(SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity * sm.unit_price ELSE 0 END), 0)::NUMERIC(12,2) as realized_sales_revenue,
          CASE 
            WHEN SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity ELSE 0 END) > 0 THEN
              ROUND((SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity * sm.unit_price ELSE 0 END) / 
                     SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity ELSE 0 END))::NUMERIC, 2)
            ELSE p.selling_price
          END as realized_unit_price,
          (COALESCE(SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity ELSE 0 END), 0) * b.purchase_price)::NUMERIC(12,2) as realized_cogs,
          (
            COALESCE(SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity * sm.unit_price ELSE 0 END), 0) -
            (COALESCE(SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity ELSE 0 END), 0) * b.purchase_price)
          )::NUMERIC(12,2) as realized_profit,
          CASE 
            WHEN SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity * sm.unit_price ELSE 0 END) > 0 THEN
              ROUND((
                (
                  SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity * sm.unit_price ELSE 0 END) -
                  (SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity ELSE 0 END) * b.purchase_price)
                ) / 
                SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity * sm.unit_price ELSE 0 END) * 100
              )::NUMERIC, 1)
            ELSE 0
          END as profit_margin_pct,
          CASE 
            WHEN b.purchase_price > 0 THEN
              ROUND((
                ((CASE 
                    WHEN SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity ELSE 0 END) > 0 THEN
                      (SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity * sm.unit_price ELSE 0 END) / 
                       SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity ELSE 0 END))
                    ELSE p.selling_price
                  END) - b.purchase_price) / b.purchase_price * 100
              )::NUMERIC, 1)
            ELSE 0
          END as markup_pct,
          CASE WHEN b.quantity_remaining = 0 THEN true ELSE false END as is_completed
        FROM stock_batches b
        JOIN products p ON b.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN suppliers s ON b.supplier_id = s.id
        LEFT JOIN stock_movements sm ON b.id = sm.batch_id AND sm.movement_type = 'OUT'
        ${whereSql}
        GROUP BY b.id, b.batch_number, b.purchase_date, b.expiry_date, b.quantity_received, b.quantity_remaining, b.purchase_price, p.id, p.name, p.sku, p.unit, p.selling_price, c.name, s.name
        ${statusFilter === 'all' ? "HAVING COALESCE(SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity ELSE 0 END), 0) > 0 OR b.quantity_remaining = 0" : ''}
        ORDER BY ${orderBy}
      `;

      const res = await client.query(query, params);

      const batches = res.rows.map((r: any) => ({
        ...r,
        unit_purchase_price: parseFloat(r.unit_purchase_price),
        total_purchase_cost: parseFloat(r.total_purchase_cost),
        units_sold: parseInt(r.units_sold, 10),
        realized_sales_revenue: parseFloat(r.realized_sales_revenue),
        realized_unit_price: parseFloat(r.realized_unit_price),
        realized_cogs: parseFloat(r.realized_cogs),
        realized_profit: parseFloat(r.realized_profit),
        profit_margin_pct: parseFloat(r.profit_margin_pct),
        markup_pct: parseFloat(r.markup_pct),
        is_completed: Boolean(r.is_completed),
      }));

      const completedBatchesCount = batches.filter((b: any) => b.is_completed).length;
      const totalUnitsSold = batches.reduce((acc: number, b: any) => acc + b.units_sold, 0);
      const totalRealizedRevenue = batches.reduce((acc: number, b: any) => acc + b.realized_sales_revenue, 0);
      const totalRealizedCogs = batches.reduce((acc: number, b: any) => acc + b.realized_cogs, 0);
      const totalRealizedProfit = totalRealizedRevenue - totalRealizedCogs;
      const overallMarginPct = totalRealizedRevenue > 0
        ? parseFloat(((totalRealizedProfit / totalRealizedRevenue) * 100).toFixed(1))
        : 0;

      return {
        batches,
        summary: {
          totalCompletedBatches: completedBatchesCount,
          totalAnalyzedBatches: batches.length,
          totalUnitsSold,
          totalPurchaseCost: totalRealizedCogs,
          totalRealizedRevenue,
          totalRealizedProfit,
          overallMarginPct,
        },
      };
    } finally {
      client.release();
    }
  }
}

