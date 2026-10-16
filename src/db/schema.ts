import { relations } from 'drizzle-orm';
import { boolean, date, decimal, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').unique(), // Firebase Auth UID if authenticated
  username: text('username').notNull(),
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('manager'), // 'admin' | 'manager' | 'sales' | 'stock_clerk'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  barcode: text('barcode').notNull().unique(),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  categoryId: integer('category_id').references(() => categories.id),
  unit: text('unit').notNull().default('pcs'), // 'pcs', 'kg', 'box', 'liters', 'meters'
  sellingPrice: decimal('selling_price', { precision: 12, scale: 2 }).notNull(),
  minimumStock: integer('minimum_stock').notNull().default(10),
  active: boolean('active').notNull().default(true),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const stockBatches = pgTable('stock_batches', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id).notNull(),
  supplierId: integer('supplier_id').references(() => suppliers.id),
  batchNumber: text('batch_number').notNull(),
  purchaseDate: date('purchase_date').notNull(),
  expiryDate: date('expiry_date'),
  quantityReceived: integer('quantity_received').notNull(),
  quantityRemaining: integer('quantity_remaining').notNull(),
  purchasePrice: decimal('purchase_price', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id).notNull(),
  batchId: integer('batch_id').references(() => stockBatches.id),
  movementType: text('movement_type').notNull(), // 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN'
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  reference: text('reference'), // invoice number, PO number, or adjustment note
  notes: text('notes'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  customerId: integer('customer_id').references(() => customers.id),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  tax: decimal('tax', { precision: 12, scale: 2 }).notNull().default('0.00'),
  discount: decimal('discount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text('payment_method').notNull().default('Cash'), // 'Cash' | 'Mobile Money' | 'Card' | 'Bank Transfer' | 'Credit'
  status: text('status').notNull().default('PAID'), // 'PAID' | 'PENDING' | 'CANCELLED'
  createdBy: text('created_by'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const invoiceItems = pgTable('invoice_items', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').references(() => invoices.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  discount: decimal('discount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  action: text('action').notNull(),
  tableName: text('table_name').notNull(),
  recordId: text('record_id'),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relationships
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  batches: many(stockBatches),
  movements: many(stockMovements),
  invoiceItems: many(invoiceItems),
}));

export const stockBatchesRelations = relations(stockBatches, ({ one, many }) => ({
  product: one(products, {
    fields: [stockBatches.productId],
    references: [products.id],
  }),
  supplier: one(suppliers, {
    fields: [stockBatches.supplierId],
    references: [suppliers.id],
  }),
  movements: many(stockMovements),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  batch: one(stockBatches, {
    fields: [stockMovements.batchId],
    references: [stockBatches.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  product: one(products, {
    fields: [invoiceItems.productId],
    references: [products.id],
  }),
}));
