import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("inventory.db");

// Extend session type
declare module 'express-session' {
  interface SessionData {
    user: { id: number; username: string; role: string; name: string };
  }
}

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT, -- manager, staff
    name TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE,
    name TEXT,
    category TEXT,
    quantity INTEGER DEFAULT 0,
    min_threshold INTEGER DEFAULT 10,
    max_threshold INTEGER DEFAULT 100,
    unit_price REAL,
    location TEXT,
    rack_number TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE,
    customer_name TEXT,
    status TEXT DEFAULT 'pending', -- pending, processing, shipped, delivered, cancelled
    total_amount REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price_at_order REAL,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    type TEXT, -- incoming, outgoing, adjustment
    quantity INTEGER,
    reference_id TEXT, -- order_number or adjustment_reason
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS order_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    status TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id)
  );
`);

// Seed initial data if empty
const productCount = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
if (productCount.count === 0) {
  const insertProduct = db.prepare("INSERT INTO products (sku, name, category, quantity, min_threshold, max_threshold, unit_price, location, rack_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
  
  // Laptops
  insertProduct.run("SKU-001", "MacBook Pro M3", "Laptops", 25, 5, 50, 199999.00, "Zone-A1", "R-01");
  insertProduct.run("SKU-005", "Dell XPS 15", "Laptops", 15, 5, 30, 154999.00, "Zone-A1", "R-02");
  
  // Smartphones
  insertProduct.run("SKU-002", "iPhone 15 Pro", "Smartphones", 85, 20, 200, 134900.00, "Zone-A2", "R-03");
  insertProduct.run("SKU-006", "Samsung Galaxy S24 Ultra", "Smartphones", 40, 10, 100, 129999.00, "Zone-A2", "R-04");
  insertProduct.run("SKU-007", "Google Pixel 8 Pro", "Smartphones", 22, 10, 50, 106999.00, "Zone-A2", "R-05");
  
  // Audio
  insertProduct.run("SKU-003", "Sony WH-1000XM5", "Audio", 12, 10, 100, 29990.00, "Zone-B1", "R-06");
  insertProduct.run("SKU-008", "Bose QuietComfort Ultra", "Audio", 18, 5, 50, 35900.00, "Zone-B1", "R-07");
  insertProduct.run("SKU-009", "AirPods Pro (2nd Gen)", "Audio", 120, 30, 300, 24900.00, "Zone-B1", "R-08");
  
  // Monitors
  insertProduct.run("SKU-004", "Samsung 49\" Odyssey G9", "Monitors", 4, 2, 10, 149999.00, "Zone-C1", "R-09");
  insertProduct.run("SKU-010", "LG UltraFine 5K", "Monitors", 8, 3, 20, 119999.00, "Zone-C1", "R-10");
  
  // Gaming
  insertProduct.run("SKU-011", "PlayStation 5 Slim", "Gaming", 35, 10, 100, 54990.00, "Zone-B2", "R-11");
  insertProduct.run("SKU-012", "Xbox Series X", "Gaming", 28, 10, 80, 49990.00, "Zone-B2", "R-12");
  insertProduct.run("SKU-013", "Nintendo Switch OLED", "Gaming", 55, 15, 150, 32990.00, "Zone-B2", "R-13");
  
  // Wearables
  insertProduct.run("SKU-014", "Apple Watch Ultra 2", "Wearables", 14, 5, 40, 89900.00, "Zone-A3", "R-14");
  insertProduct.run("SKU-015", "Garmin Fenix 7X", "Wearables", 9, 5, 25, 74990.00, "Zone-A3", "R-15");
  
  // Cameras
  insertProduct.run("SKU-016", "Sony Alpha a7 IV", "Cameras", 6, 2, 15, 219990.00, "Zone-C2", "R-16");
  insertProduct.run("SKU-017", "DJI Osmo Action 4", "Cameras", 24, 8, 60, 34990.00, "Zone-C2", "R-17");
  
  // Networking
  insertProduct.run("SKU-018", "TP-Link Archer BE800", "Networking", 12, 4, 30, 45999.00, "Zone-D1", "R-18");
  insertProduct.run("SKU-019", "Ubiquiti Dream Machine", "Networking", 7, 3, 15, 38500.00, "Zone-D1", "R-19");

  // Seed initial orders
  const orderCount = db.prepare("SELECT COUNT(*) as count FROM orders").get() as { count: number };
  if (orderCount.count === 0) {
    const insertOrder = db.prepare("INSERT INTO orders (order_number, customer_name, status, total_amount) VALUES (?, ?, ?, ?)");
    const insertOrderItem = db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price_at_order) VALUES (?, ?, ?, ?)");
    const insertTracking = db.prepare("INSERT INTO order_tracking (order_id, status, notes) VALUES (?, ?, ?)");

    // Sample Order 1
    const o1 = insertOrder.run("ORD-1001", "John Doe", "processing", 134900.00);
    insertOrderItem.run(o1.lastInsertRowid, 2, 1, 134900.00); // iPhone
    insertTracking.run(o1.lastInsertRowid, "pending", "Order created");
    insertTracking.run(o1.lastInsertRowid, "processing", "Order is being packed");

    // Sample Order 2
    const o2 = insertOrder.run("ORD-1002", "Jane Smith", "shipped", 29990.00);
    insertOrderItem.run(o2.lastInsertRowid, 3, 1, 29990.00); // Sony Headphones
    insertTracking.run(o2.lastInsertRowid, "pending", "Order created");
    insertTracking.run(o2.lastInsertRowid, "processing", "Order packed");
    insertTracking.run(o2.lastInsertRowid, "shipped", "Order handed over to courier");
  }
}

// Seed users if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare("INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)");
  insertUser.run("admin", "admin123", "manager", "System Manager");
  insertUser.run("staff", "staff123", "staff", "Warehouse Operator");
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json());

  app.use(session({
    secret: "electroflow-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false, // Set to true if using https
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    }
  }));

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const wss = new WebSocketServer({ server });

  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  // Auth Routes
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT id, username, role, name FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    
    if (user) {
      req.session.user = user;
      res.json(user);
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.get("/api/me", (req, res) => {
    if (req.session.user) {
      res.json(req.session.user);
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // API Routes
  app.get("/api/inventory", (req, res) => {
    const products = db.prepare("SELECT * FROM products ORDER BY name ASC").all();
    res.json(products);
  });

  app.post("/api/inventory", (req, res) => {
    const { sku, name, category, quantity, min_threshold, max_threshold, unit_price, location, rack_number } = req.body;
    try {
      const info = db.prepare(`
        INSERT INTO products (sku, name, category, quantity, min_threshold, max_threshold, unit_price, location, rack_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(sku, name, category, quantity, min_threshold, max_threshold, unit_price, location, rack_number);
      
      const newProduct = db.prepare("SELECT * FROM products WHERE id = ?").get(info.lastInsertRowid);
      broadcast({ type: "INVENTORY_UPDATE", product: newProduct });
      res.json(newProduct);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.patch("/api/inventory/:id", (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(", ");
    const values = [...Object.values(updates), id];
    
    try {
      db.prepare(`UPDATE products SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
      const updatedProduct = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
      broadcast({ type: "INVENTORY_UPDATE", product: updatedProduct });
      res.json(updatedProduct);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/orders", (req, res) => {
    const orders = db.prepare(`
      SELECT o.*, GROUP_CONCAT(p.name || ' (x' || oi.quantity || ')') as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `).all();
    res.json(orders);
  });

  app.post("/api/orders", (req, res) => {
    const { customer_name, items } = req.body; // items: [{product_id, quantity}]
    const order_number = `ORD-${Date.now()}`;
    
    const transaction = db.transaction(() => {
      let total = 0;
      const orderInfo = db.prepare("INSERT INTO orders (order_number, customer_name, total_amount) VALUES (?, ?, ?)").run(order_number, customer_name, 0);
      const orderId = orderInfo.lastInsertRowid;

      for (const item of items) {
        const product = db.prepare("SELECT * FROM products WHERE id = ?").get(item.product_id) as any;
        if (!product || product.quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${product?.name || 'unknown product'}`);
        }

        total += product.unit_price * item.quantity;
        db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price_at_order) VALUES (?, ?, ?, ?)").run(orderId, item.product_id, item.quantity, product.unit_price);
        db.prepare("UPDATE products SET quantity = quantity - ? WHERE id = ?").run(item.quantity, item.product_id);
        db.prepare("INSERT INTO transactions (product_id, type, quantity, reference_id) VALUES (?, 'outgoing', ?, ?)").run(item.product_id, item.quantity, order_number);
      }

      db.prepare("UPDATE orders SET total_amount = ? WHERE id = ?").run(total, orderId);
      db.prepare("INSERT INTO order_tracking (order_id, status, notes) VALUES (?, 'pending', ?)").run(orderId, "Order created and pending fulfillment");
      return orderId;
    });

    try {
      const orderId = transaction();
      const newOrder = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
      broadcast({ type: "ORDER_CREATED", order: newOrder });
      broadcast({ type: "INVENTORY_REFRESH" });
      res.json(newOrder);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.patch("/api/orders/:id/status", (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    try {
      db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
      db.prepare("INSERT INTO order_tracking (order_id, status, notes) VALUES (?, ?, ?)").run(id, status, notes || `Status updated to ${status}`);
      const updatedOrder = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
      broadcast({ type: "ORDER_UPDATED", order: updatedOrder });
      res.json(updatedOrder);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/orders/:id/tracking", (req, res) => {
    const { id } = req.params;
    try {
      const tracking = db.prepare("SELECT * FROM order_tracking WHERE order_id = ? ORDER BY created_at DESC").all(id);
      res.json(tracking);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/inventory/:id/adjust", (req, res) => {
    const { id } = req.params;
    const { quantity, type, reference_id } = req.body; // type: incoming, outgoing, adjustment
    
    const transaction = db.transaction(() => {
      const product = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as any;
      if (!product) throw new Error("Product not found");

      let newQty = product.quantity;
      if (type === 'incoming') newQty += quantity;
      else if (type === 'outgoing') {
        if (product.quantity < quantity) throw new Error("Insufficient stock");
        newQty -= quantity;
      } else if (type === 'adjustment') {
        newQty = quantity; // Absolute adjustment
      }

      db.prepare("UPDATE products SET quantity = ? WHERE id = ?").run(newQty, id);
      db.prepare("INSERT INTO transactions (product_id, type, quantity, reference_id) VALUES (?, ?, ?, ?)").run(id, type, quantity, reference_id || 'Manual Adjustment');
      
      return db.prepare("SELECT * FROM products WHERE id = ?").get(id);
    });

    try {
      const updatedProduct = transaction();
      broadcast({ type: "INVENTORY_UPDATE", product: updatedProduct });
      res.json(updatedProduct);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/stats", (req, res) => {
    const totalProducts = db.prepare("SELECT COUNT(*) as count FROM products").get() as any;
    const lowStock = db.prepare("SELECT COUNT(*) as count FROM products WHERE quantity <= min_threshold").get() as any;
    const outOfStock = db.prepare("SELECT COUNT(*) as count FROM products WHERE quantity = 0").get() as any;
    const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get() as any;
    
    const recentTransactions = db.prepare(`
      SELECT t.*, p.name as product_name 
      FROM transactions t 
      JOIN products p ON t.product_id = p.id 
      ORDER BY t.created_at DESC LIMIT 10
    `).all();

    res.json({
      totalProducts: totalProducts.count,
      lowStock: lowStock.count,
      outOfStock: outOfStock.count,
      pendingOrders: pendingOrders.count,
      recentTransactions
    });
  });

  app.get("/api/db-explorer", (req, res) => {
    try {
      const tables = ["products", "orders", "order_items", "transactions"];
      const data: any = {};
      for (const table of tables) {
        data[table] = db.prepare(`SELECT * FROM ${table}`).all();
      }
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }
}

startServer();
