import { pool } from '../db/index.ts';

export interface BatchAllocation {
  batchId: number;
  batchNumber: string;
  purchaseDate: string;
  purchasePrice: number;
  quantityConsumed: number;
  quantityRemainingAfter: number;
}

export interface FifoConsumptionResult {
  productId: number;
  productName: string;
  quantityRequested: number;
  allocations: BatchAllocation[];
  totalCost: number;
}

export class InventoryService {
  /**
   * Performs FIFO stock consumption for an item within an active PG transaction client.
   * Locks the matching batch rows with SELECT ... FOR UPDATE to avoid concurrency overselling.
   */
  static async consumeFifo(
    client: any,
    productId: number,
    quantityNeeded: number,
    reference: string,
    createdBy: string,
    sellingUnitPrice: number
  ): Promise<FifoConsumptionResult> {
    if (quantityNeeded <= 0) {
      throw new Error(`Quantity to consume must be greater than zero. Received: ${quantityNeeded}`);
    }

    // 1. Fetch product details
    const prodRes = await client.query(
      `SELECT id, name, sku, active FROM products WHERE id = $1`,
      [productId]
    );

    if (prodRes.rows.length === 0) {
      throw new Error(`Product with ID ${productId} not found.`);
    }

    const product = prodRes.rows[0];
    if (!product.active) {
      throw new Error(`Product "${product.name}" (${product.sku}) is deactivated and cannot be sold.`);
    }

    // 2. Fetch available batches ordered by purchase_date ASC, id ASC with row-level locking
    const batchRes = await client.query(
      `SELECT id, batch_number, purchase_date, purchase_price, quantity_remaining 
       FROM stock_batches 
       WHERE product_id = $1 AND quantity_remaining > 0 
       ORDER BY purchase_date ASC, id ASC 
       FOR UPDATE`,
      [productId]
    );

    const availableBatches = batchRes.rows;
    const totalAvailable = availableBatches.reduce(
      (sum: number, b: any) => sum + parseInt(b.quantity_remaining, 10),
      0
    );

    if (totalAvailable < quantityNeeded) {
      throw new Error(
        `Insufficient stock for "${product.name}" (${product.sku}). Requested: ${quantityNeeded}, Available: ${totalAvailable}.`
      );
    }

    let remainingToConsume = quantityNeeded;
    const allocations: BatchAllocation[] = [];
    let totalCost = 0;

    for (const batch of availableBatches) {
      if (remainingToConsume <= 0) break;

      const batchRemaining = parseInt(batch.quantity_remaining, 10);
      const consumeFromThisBatch = Math.min(batchRemaining, remainingToConsume);
      const newRemaining = batchRemaining - consumeFromThisBatch;
      const unitPurchasePrice = parseFloat(batch.purchase_price);

      // Update the batch quantity_remaining
      await client.query(
        `UPDATE stock_batches 
         SET quantity_remaining = $1 
         WHERE id = $2`,
        [newRemaining, batch.id]
      );

      // Create stock movement record (type OUT)
      await client.query(
        `INSERT INTO stock_movements (product_id, batch_id, movement_type, quantity, unit_price, reference, notes, created_by, created_at)
         VALUES ($1, $2, 'OUT', $3, $4, $5, $6, $7, NOW())`,
        [
          productId,
          batch.id,
          consumeFromThisBatch,
          sellingUnitPrice,
          reference,
          `FIFO sale allocation from batch ${batch.batch_number}`,
          createdBy,
        ]
      );

      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batch_number,
        purchaseDate: batch.purchase_date,
        purchasePrice: unitPurchasePrice,
        quantityConsumed: consumeFromThisBatch,
        quantityRemainingAfter: newRemaining,
      });

      totalCost += consumeFromThisBatch * unitPurchasePrice;
      remainingToConsume -= consumeFromThisBatch;
    }

    if (remainingToConsume > 0) {
      throw new Error(
        `Could not fully allocate ${quantityNeeded} units for product ${product.name} under FIFO.`
      );
    }

    return {
      productId,
      productName: product.name,
      quantityRequested: quantityNeeded,
      allocations,
      totalCost,
    };
  }

  /**
   * Adds new stock batch and corresponding 'IN' stock movement
   */
  static async addStockEntry(data: {
    productId: number;
    supplierId?: number | null;
    batchNumber: string;
    purchaseDate: string;
    expiryDate?: string | null;
    quantity: number;
    purchasePrice: number;
    reference?: string;
    notes?: string;
    createdBy: string;
  }) {
    if (data.quantity <= 0) {
      throw new Error('Stock quantity must be greater than zero.');
    }
    if (data.purchasePrice < 0) {
      throw new Error('Purchase price cannot be negative.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check product exists
      const prodRes = await client.query('SELECT name, sku FROM products WHERE id = $1', [
        data.productId,
      ]);
      if (prodRes.rows.length === 0) {
        throw new Error(`Product with ID ${data.productId} does not exist.`);
      }
      const prod = prodRes.rows[0];

      // Check if batch number already exists for this product
      const existingBatch = await client.query(
        'SELECT id FROM stock_batches WHERE product_id = $1 AND batch_number = $2',
        [data.productId, data.batchNumber]
      );

      let batchId: number;
      if (existingBatch.rows.length > 0) {
        // Increment quantity of existing batch
        batchId = existingBatch.rows[0].id;
        await client.query(
          `UPDATE stock_batches 
           SET quantity_received = quantity_received + $1, 
               quantity_remaining = quantity_remaining + $1,
               purchase_price = $2
           WHERE id = $3`,
          [data.quantity, data.purchasePrice, batchId]
        );
      } else {
        // Insert new batch
        const insertBatchRes = await client.query(
          `INSERT INTO stock_batches 
           (product_id, supplier_id, batch_number, purchase_date, expiry_date, quantity_received, quantity_remaining, purchase_price, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
           RETURNING id`,
          [
            data.productId,
            data.supplierId || null,
            data.batchNumber,
            data.purchaseDate,
            data.expiryDate || null,
            data.quantity,
            data.quantity, // quantity_remaining starts equal to received
            data.purchasePrice,
          ]
        );
        batchId = insertBatchRes.rows[0].id;
      }

      // Record 'IN' movement
      await client.query(
        `INSERT INTO stock_movements 
         (product_id, batch_id, movement_type, quantity, unit_price, reference, notes, created_by, created_at)
         VALUES ($1, $2, 'IN', $3, $4, $5, $6, $7, NOW())`,
        [
          data.productId,
          batchId,
          data.quantity,
          data.purchasePrice,
          data.reference || `BATCH-${data.batchNumber}`,
          data.notes || `Stock intake for batch ${data.batchNumber}`,
          data.createdBy,
        ]
      );

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, table_name, record_id, description, created_at)
         VALUES ($1, 'STOCK_ENTRY', 'stock_batches', $2, $3, NOW())`,
        [
          data.createdBy,
          String(batchId),
          `Received ${data.quantity} units of ${prod.name} (${prod.sku}) under batch ${data.batchNumber}`,
        ]
      );

      await client.query('COMMIT');

      return {
        batchId,
        productId: data.productId,
        productName: prod.name,
        quantity: data.quantity,
        batchNumber: data.batchNumber,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Manual stock adjustment (damaged, lost, audit reconciliation)
   */
  static async adjustStock(data: {
    productId: number;
    batchId: number;
    adjustmentType: 'ADD' | 'SUBTRACT';
    quantity: number;
    reason: string;
    createdBy: string;
  }) {
    if (data.quantity <= 0) {
      throw new Error('Adjustment quantity must be greater than zero.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const batchRes = await client.query(
        `SELECT b.id, b.batch_number, b.quantity_remaining, b.purchase_price, p.name, p.sku
         FROM stock_batches b
         JOIN products p ON b.product_id = p.id
         WHERE b.id = $1 AND b.product_id = $2
         FOR UPDATE`,
        [data.batchId, data.productId]
      );

      if (batchRes.rows.length === 0) {
        throw new Error('Batch not found for product.');
      }

      const batch = batchRes.rows[0];
      const currentRemaining = parseInt(batch.quantity_remaining, 10);
      let newRemaining = currentRemaining;

      if (data.adjustmentType === 'SUBTRACT') {
        if (currentRemaining < data.quantity) {
          throw new Error(
            `Cannot subtract ${data.quantity} units. Batch ${batch.batch_number} only has ${currentRemaining} remaining.`
          );
        }
        newRemaining = currentRemaining - data.quantity;
      } else {
        newRemaining = currentRemaining + data.quantity;
      }

      await client.query(
        `UPDATE stock_batches SET quantity_remaining = $1 WHERE id = $2`,
        [newRemaining, data.batchId]
      );

      await client.query(
        `INSERT INTO stock_movements (product_id, batch_id, movement_type, quantity, unit_price, reference, notes, created_by, created_at)
         VALUES ($1, $2, 'ADJUSTMENT', $3, $4, 'ADJUSTMENT', $5, $6, NOW())`,
        [
          data.productId,
          data.batchId,
          data.quantity,
          batch.purchase_price,
          `${data.adjustmentType === 'SUBTRACT' ? '-' : '+'}${data.quantity} units: ${data.reason}`,
          data.createdBy,
        ]
      );

      await client.query('COMMIT');
      return { success: true, newRemaining };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
