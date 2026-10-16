-- =============================================================================
-- Professional Stock Management System - Seed Data
-- =============================================================================

-- Seed Users
INSERT INTO users (username, email, full_name, role) VALUES
('admin', 'admin@stocksystem.local', 'System Administrator', 'admin'),
('manager', 'manager@stocksystem.local', 'Operations Manager', 'manager'),
('sarah_sales', 'sarah@stocksystem.local', 'Sarah Jenkins (Sales)', 'sales'),
('john_clerk', 'john@stocksystem.local', 'John Doe (Warehouse)', 'stock_clerk')
ON CONFLICT (username) DO NOTHING;

-- Seed Categories
INSERT INTO categories (name, description) VALUES
('Building & Masonry', 'Cements, aggregates, blocks, and structural materials'),
('Electrical & Wiring', 'Cables, circuit breakers, conduit, and light fixtures'),
('Plumbing & Fixtures', 'Pipes, fittings, valves, water heaters, and connectors'),
('Tools & Equipment', 'Hand tools, power tools, safety gear, and measuring devices'),
('Paints & Sealants', 'Interior/exterior paints, primers, adhesives, and sealants');

-- Seed Suppliers
INSERT INTO suppliers (name, phone, email, address) VALUES
('Apex Building Solutions', '+1 (555) 234-5678', 'orders@apexbuilding.com', '104 Industrial Parkway, Chicago, IL'),
('VoltTech Electrical Wholesalers', '+1 (555) 345-6789', 'sales@volttechwholesale.com', '88 Commercial Ave, Dallas, TX'),
('AquaFlow Plumbing Supply', '+1 (555) 456-7890', 'contact@aquaflowsupplies.com', '210 Harbour Way, Seattle, WA'),
('Titan Industrial Tools', '+1 (555) 567-8901', 'support@titantools.com', '75 Logistics Blvd, Atlanta, GA');

-- Seed Customers
INSERT INTO customers (name, phone, email, address) VALUES
('Metro Construction Group', '+1 (555) 890-1234', 'procurement@metrobuild.org', '450 Skyline Drive, Suite 200'),
('Elite Renovations LLC', '+1 (555) 901-2345', 'accounts@eliterenovations.com', '12 Craftsman Lane'),
('Apex Commercial Builders', '+1 (555) 012-3456', 'materials@apexcommercial.com', '789 Grand Avenue'),
('Walk-in Retail Customer', '+1 (555) 111-2222', 'retail@store.local', 'Cash Counter 1');

-- Seed Products
INSERT INTO products (barcode, sku, name, description, category_id, unit, selling_price, minimum_stock, active) VALUES
('890123456001', 'CEM-50KG-01', 'Portland Cement 50kg', 'Premium grade Portland composite cement bag 50kg for structural concrete', 1, 'bags', 14.50, 25, true),
('890123456002', 'STL-REBAR-12', 'Steel Rebar 12mm x 6m', 'High yield deformed reinforcing bar grade 60 steel', 1, 'pcs', 18.25, 30, true),
('890123456003', 'WIR-COP-25', 'Copper Wire 2.5mm THHN (100m)', 'Single core copper building wire 100-meter coil', 2, 'box', 68.00, 15, true),
('890123456004', 'BRK-MCB-20', 'Miniature Circuit Breaker 20A', 'Single pole thermal magnetic MCB 20 amp DIN rail mount', 2, 'pcs', 7.50, 20, true),
('890123456005', 'PVC-PIP-50', 'PVC Pressure Pipe 50mm x 4m', 'Class 9 heavy duty uPVC cold water supply pipe', 3, 'pcs', 12.00, 20, true),
('890123456006', 'VLV-BAL-50', 'Brass Ball Valve 50mm', 'Full bore nickel-plated brass ball valve PN25 with lever handle', 3, 'pcs', 24.50, 10, true),
('890123456007', 'DRL-COR-18', 'Brushless Cordless Drill 18V', 'Compact 18V Li-ion drill kit with 2 batteries and rapid charger', 4, 'pcs', 149.00, 8, true),
('890123456008', 'MES-TAP-08', 'Heavy Duty Tape Measure 8m', 'Impact-resistant rubberized steel measuring tape 8 meters / 26 feet', 4, 'pcs', 11.50, 15, true),
('890123456009', 'PNT-WHT-20', 'Ultra White Acrylic Paint 20L', 'Premium matte washable interior/exterior acrylic emulsion paint', 5, 'pcs', 72.00, 10, true),
('890123456010', 'SLT-SIL-30', 'Structural Silicone Sealant 300ml', 'Neutral cure weatherproofing architectural silicone cartridge', 5, 'pcs', 8.25, 25, true),
('890123456011', 'BLK-CON-15', 'Hollow Concrete Blocks 6-inch', 'High load-bearing vibration compacted masonry blocks', 1, 'pcs', 2.20, 50, true);

-- Seed Stock Batches with realistic FIFO batches
INSERT INTO stock_batches (product_id, supplier_id, batch_number, purchase_date, expiry_date, quantity_received, quantity_remaining, purchase_price) VALUES
(1, 1, 'BATCH-CEM-001', '2026-08-15', NULL, 50, 15, 10.50),
(1, 1, 'BATCH-CEM-002', '2026-09-02', NULL, 60, 60, 11.20),
(2, 1, 'BATCH-STL-001', '2026-08-20', NULL, 40, 5, 13.50),
(3, 2, 'BATCH-WIR-001', '2026-08-10', NULL, 25, 20, 48.00),
(4, 2, 'BATCH-BRK-001', '2026-07-15', NULL, 100, 85, 4.20),
(5, 3, 'BATCH-PVC-001', '2026-08-01', NULL, 50, 12, 8.00),
(6, 3, 'BATCH-VLV-001', '2026-08-05', NULL, 30, 0, 16.00),
(7, 4, 'BATCH-DRL-001', '2026-08-12', NULL, 15, 10, 105.00),
(8, 4, 'BATCH-MES-001', '2026-08-18', NULL, 40, 32, 6.80),
(9, 1, 'BATCH-PNT-001', '2026-07-20', '2027-01-20', 20, 14, 49.00),
(9, 1, 'BATCH-PNT-002', '2026-08-10', '2026-11-04', 25, 12, 50.00),
(9, 1, 'BATCH-PNT-003', '2026-09-01', '2026-12-15', 30, 25, 49.50),
(10, 1, 'BATCH-SLT-001', '2026-06-01', '2026-10-15', 50, 22, 5.00),
(10, 1, 'BATCH-SLT-002', '2026-07-01', '2026-10-23', 30, 18, 5.20),
(10, 1, 'BATCH-SLT-EXP', '2026-05-01', '2026-10-08', 20, 5, 4.90),
(1, 1, 'BATCH-CEM-EXP', '2026-06-15', '2026-11-12', 40, 20, 10.80),
(11, 1, 'BATCH-BLK-001', '2026-09-01', NULL, 300, 180, 1.40),
(1, 1, 'BATCH-CEM-2026-Q1', '2026-05-10', NULL, 80, 0, 9.80),
(2, 1, 'BATCH-STL-2026-Q1', '2026-05-18', NULL, 50, 0, 12.40),
(3, 2, 'BATCH-WIR-2026-Q1', '2026-06-02', NULL, 30, 0, 44.50),
(7, 4, 'BATCH-DRL-2026-Q1', '2026-06-14', NULL, 12, 0, 96.00),
(9, 1, 'BATCH-PNT-2026-Q1', '2026-05-22', NULL, 25, 0, 45.00),
(5, 3, 'BATCH-PVC-2026-Q1', '2026-06-05', NULL, 60, 0, 7.40),
(4, 2, 'BATCH-BRK-2026-Q1', '2026-06-10', NULL, 80, 0, 3.90),
(10, 1, 'BATCH-SLT-2026-Q1', '2026-05-15', NULL, 40, 0, 4.60);

-- Initial Stock Movements (Audit of IN and OUT)
INSERT INTO stock_movements (product_id, batch_id, movement_type, quantity, unit_price, reference, notes, created_by) VALUES
(1, 1, 'IN', 50, 10.50, 'PO-2026-001', 'Initial stock purchase', 'john_clerk'),
(1, 2, 'IN', 60, 11.20, 'PO-2026-008', 'Replenishment order', 'john_clerk'),
(2, 3, 'IN', 40, 13.50, 'PO-2026-002', 'Bulk steel order', 'john_clerk'),
(3, 4, 'IN', 25, 48.00, 'PO-2026-003', 'Electrical cable consignment', 'john_clerk'),
(4, 5, 'IN', 100, 4.20, 'PO-2026-004', 'MCB batch', 'john_clerk'),
(5, 6, 'IN', 50, 8.00, 'PO-2026-005', 'Pressure pipe delivery', 'john_clerk'),
(6, 7, 'IN', 30, 16.00, 'PO-2026-006', 'Ball valve supply', 'john_clerk'),
(7, 8, 'IN', 15, 105.00, 'PO-2026-007', 'Cordless drill kits', 'john_clerk'),
(8, 9, 'IN', 40, 6.80, 'PO-2026-009', 'Measuring tapes', 'john_clerk'),
(9, 10, 'IN', 20, 49.00, 'PO-2026-010', 'Acrylic paint stock', 'john_clerk'),
(10, 11, 'IN', 50, 5.00, 'PO-2026-011', 'Structural silicone crates', 'john_clerk'),
(11, 12, 'IN', 300, 1.40, 'PO-2026-012', 'Concrete block pallet delivery', 'john_clerk');

-- Seed Historical Invoices
INSERT INTO invoices (invoice_number, customer_id, subtotal, tax, discount, total, payment_method, status, created_by, notes) VALUES
('INV-2026-0001', 1, 857.50, 68.60, 20.00, 906.10, 'Bank Transfer', 'PAID', 'sarah_sales', 'Order for Downtown Project Phase 1'),
('INV-2026-0002', 2, 495.00, 39.60, 0.00, 534.60, 'Card', 'PAID', 'sarah_sales', 'Renovation supplies pick-up');

-- Seed Invoice Line Items
INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount, total) VALUES
(1, 1, 35, 14.50, 0.00, 507.50),
(1, 2, 20, 18.25, 0.00, 365.00),
(2, 7, 3, 149.00, 15.00, 432.00),
(2, 8, 8, 11.50, 0.00, 92.00);

-- Stock movements for the sales
INSERT INTO stock_movements (product_id, batch_id, movement_type, quantity, unit_price, reference, notes, created_by) VALUES
(1, 1, 'OUT', 35, 14.50, 'INV-2026-0001', 'Sale to Metro Construction Group', 'sarah_sales'),
(2, 3, 'OUT', 20, 18.25, 'INV-2026-0001', 'Sale to Metro Construction Group', 'sarah_sales'),
(7, 8, 'OUT', 3, 149.00, 'INV-2026-0002', 'Sale to Elite Renovations LLC', 'sarah_sales'),
(8, 9, 'OUT', 8, 11.50, 'INV-2026-0002', 'Sale to Elite Renovations LLC', 'sarah_sales'),
(6, 7, 'OUT', 30, 24.50, 'INV-2026-HIST-01', 'Sale to Commercial Mechanical Ltd', 'sarah_sales'),
(1, 18, 'OUT', 80, 14.50, 'INV-2026-HIST-02', 'Sale to Civic Infrastructure Consortium', 'sarah_sales'),
(2, 19, 'OUT', 50, 18.25, 'INV-2026-HIST-03', 'Sale to Skyline Towers Project', 'sarah_sales'),
(3, 20, 'OUT', 30, 68.00, 'INV-2026-HIST-04', 'Sale to VoltTech Electrical Contractors', 'sarah_sales'),
(7, 21, 'OUT', 12, 149.00, 'INV-2026-HIST-05', 'Sale to Apex Tradesmen Guild', 'sarah_sales'),
(9, 22, 'OUT', 25, 72.00, 'INV-2026-HIST-06', 'Sale to Prestige Painters & Decor', 'sarah_sales'),
(5, 23, 'OUT', 60, 12.00, 'INV-2026-HIST-07', 'Sale to Suburban Irrigation Systems', 'sarah_sales'),
(4, 24, 'OUT', 80, 7.50, 'INV-2026-HIST-08', 'Sale to Metro Electrical Wholesalers', 'sarah_sales'),
(10, 25, 'OUT', 40, 8.25, 'INV-2026-HIST-09', 'Sale to Glazing & Façade Works Ltd', 'sarah_sales');

-- Seed Audit Trail
INSERT INTO audit_logs (user_id, action, table_name, record_id, description) VALUES
('admin', 'INITIALIZE', 'system', '1', 'Initial database schema and baseline master data loaded'),
('john_clerk', 'STOCK_ENTRY', 'stock_batches', '1', 'Received 50 bags of Portland Cement 50kg under PO-2026-001'),
('sarah_sales', 'INVOICE_CREATE', 'invoices', '1', 'Generated invoice INV-2026-0001 for Metro Construction Group');
