import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import mysql from "mysql2/promise";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Database setup
let pool: any = null;
let sqliteDb: any = null;
let isUsingSqlite = false;

async function initDb() {
  console.log("Initializing database...");
  try {
    // Try MySQL first if DB_HOST is not localhost or if explicitly configured
    if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') {
      pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'pos_db',
        port: parseInt(process.env.DB_PORT || '3306'),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      // Test connection
      await pool.query("SELECT 1");
      console.log("Connected to MySQL");
    } else {
      throw new Error("Local MySQL not available, falling back to SQLite");
    }
  } catch (error) {
    console.warn("MySQL connection failed or not configured. Using SQLite for preview.", error instanceof Error ? error.message : "");
    isUsingSqlite = true;
    sqliteDb = new Database("preview.db");
    
    // Initialize SQLite schema
    try {
      sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS branches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          address TEXT,
          phone TEXT,
          email TEXT,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          branch_id INTEGER,
          name TEXT NOT NULL,
          color TEXT DEFAULT '#6366f1',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          branch_id INTEGER,
          category_id INTEGER,
          name TEXT NOT NULL,
          sku TEXT,
          price REAL NOT NULL,
          cost REAL DEFAULT 0.00,
          stock_quantity INTEGER DEFAULT 0,
          image_url TEXT,
          expiry_date TEXT,
          is_paused INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          branch_id INTEGER,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          address TEXT,
          loyalty_points INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          branch_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          customer_id INTEGER,
          order_number TEXT NOT NULL UNIQUE,
          subtotal REAL NOT NULL,
          tax_amount REAL DEFAULT 0.00,
          grand_total REAL NOT NULL,
          payment_method TEXT,
          status TEXT DEFAULT 'completed',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          total_price REAL NOT NULL
        );
        CREATE TABLE IF NOT EXISTS inventory_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          branch_id INTEGER,
          name TEXT NOT NULL,
          base_unit TEXT NOT NULL,
          cost REAL DEFAULT 0.00,
          stock REAL DEFAULT 0,
          is_active INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS recipes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          inventory_item_id INTEGER NOT NULL,
          quantity REAL NOT NULL,
          is_active INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          branch_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          balance REAL DEFAULT 0.00
        );
        CREATE TABLE IF NOT EXISTS account_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          account_id INTEGER NOT NULL,
          debit REAL DEFAULT 0.00,
          credit REAL DEFAULT 0.00,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS work_periods (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          branch_id INTEGER NOT NULL,
          user_id_start INTEGER NOT NULL,
          user_id_end INTEGER,
          start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          end_time DATETIME,
          status TEXT DEFAULT 'open'
        );
        CREATE TABLE IF NOT EXISTS warehouses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          branch_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          location TEXT,
          is_active INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS stock_adjustments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_id INTEGER NOT NULL,
          item_type TEXT NOT NULL, -- 'product' or 'inventory_item'
          quantity REAL NOT NULL,
          reason TEXT,
          user_id INTEGER NOT NULL,
          branch_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS stock_transfers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_id INTEGER NOT NULL,
          item_type TEXT NOT NULL,
          from_branch_id INTEGER NOT NULL,
          to_branch_id INTEGER NOT NULL,
          quantity REAL NOT NULL,
          status TEXT DEFAULT 'completed',
          user_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("SQLite schema initialized");

      // Migration for products table
      try {
        const columns = sqliteDb.prepare("PRAGMA table_info(products)").all();
        const columnNames = columns.map((c: any) => c.name);
        if (!columnNames.includes('expiry_date')) {
          sqliteDb.prepare("ALTER TABLE products ADD COLUMN expiry_date TEXT").run();
          console.log("Added expiry_date column to products");
        }
        if (!columnNames.includes('is_paused')) {
          sqliteDb.prepare("ALTER TABLE products ADD COLUMN is_paused INTEGER DEFAULT 0").run();
          console.log("Added is_paused column to products");
        }

        // Migration for inventory_items
        const iiColumns = sqliteDb.prepare("PRAGMA table_info(inventory_items)").all();
        const iiColumnNames = iiColumns.map((c: any) => c.name);
        if (!iiColumnNames.includes('is_active')) {
          sqliteDb.prepare("ALTER TABLE inventory_items ADD COLUMN is_active INTEGER DEFAULT 1").run();
        }

        // Migration for recipes
        const rColumns = sqliteDb.prepare("PRAGMA table_info(recipes)").all();
        const rColumnNames = rColumns.map((c: any) => c.name);
        if (!rColumnNames.includes('is_active')) {
          sqliteDb.prepare("ALTER TABLE recipes ADD COLUMN is_active INTEGER DEFAULT 1").run();
        }

        // Migration for warehouses
        const wColumns = sqliteDb.prepare("PRAGMA table_info(warehouses)").all();
        const wColumnNames = wColumns.map((c: any) => c.name);
        if (!wColumnNames.includes('is_active')) {
          sqliteDb.prepare("ALTER TABLE warehouses ADD COLUMN is_active INTEGER DEFAULT 1").run();
        }
        if (!wColumnNames.includes('location')) {
          sqliteDb.prepare("ALTER TABLE warehouses ADD COLUMN location TEXT").run();
        }
      } catch (e) {
        console.error("Migration failed:", e);
      }
    } catch (e) {
      console.error("Failed to initialize SQLite schema:", e);
    }

    // Seed initial data if empty
    const branchCount = sqliteDb.prepare("SELECT COUNT(*) as count FROM branches").get().count;
    if (branchCount === 0) {
      sqliteDb.prepare("INSERT INTO branches (name, is_active) VALUES (?, ?)").run("Main Branch", 1);
      sqliteDb.prepare("INSERT INTO categories (name, branch_id) VALUES (?, ?)").run("Beverages", 1);
      sqliteDb.prepare("INSERT INTO categories (name, branch_id) VALUES (?, ?)").run("Food", 1);
      sqliteDb.prepare("INSERT INTO products (name, price, category_id, branch_id, stock_quantity, image_url) VALUES (?, ?, ?, ?, ?, ?)").run("Coffee", 3.50, 1, 1, 100, "https://picsum.photos/seed/coffee/200/200");
      sqliteDb.prepare("INSERT INTO products (name, price, category_id, branch_id, stock_quantity, image_url) VALUES (?, ?, ?, ?, ?, ?)").run("Sandwich", 6.50, 2, 1, 50, "https://picsum.photos/seed/sandwich/200/200");
      sqliteDb.prepare("INSERT INTO accounts (name, type, branch_id, balance) VALUES (?, ?, ?, ?)").run("Cash Account", "payment", 1, 1000.00);
    }
  }
}

async function query(sql: string, params: any[] = []) {
  if (isUsingSqlite) {
    const stmt = sqliteDb.prepare(sql);
    if (sql.trim().toUpperCase().startsWith("SELECT")) {
      return [stmt.all(...params)];
    } else {
      const result = stmt.run(...params);
      return [{ insertId: result.lastInsertRowid, affectedRows: result.changes }];
    }
  } else {
    return await pool.query(sql, params);
  }
}

// API Routes (PHP-style routing for preview)
app.all("/api/index.php", async (req, res) => {
  const action = req.query.action;
  const method = req.method;
  console.log(`API Request: ${method} ${action}`);

  try {
    switch (action) {
      case 'products':
        if (method === 'GET') {
          const [rows] = await query("SELECT * FROM products WHERE is_active = 1 ORDER BY name");
          res.json(rows);
        } else if (method === 'POST') {
          const { branch_id, category_id, name, sku, price, cost, stock_quantity, image_url, expiry_date } = req.body;
          const [result] = await query(
            "INSERT INTO products (branch_id, category_id, name, sku, price, cost, stock_quantity, image_url, expiry_date, is_paused, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)",
            [branch_id, category_id, name, sku, price, cost, stock_quantity, image_url, expiry_date]
          );
          res.json({ id: result.insertId });
        }
        break;

      case 'update_product':
        if (method === 'PUT' || method === 'POST') {
          const id = req.query.id;
          const { name, price, category_id, stock_quantity, sku, image_url, expiry_date, is_paused } = req.body;
          await query(
            "UPDATE products SET name = ?, price = ?, category_id = ?, stock_quantity = ?, sku = ?, image_url = ?, expiry_date = ?, is_paused = ? WHERE id = ?",
            [name, price, category_id, stock_quantity, sku, image_url, expiry_date, is_paused ? 1 : 0, id]
          );
          res.json({ success: true });
        }
        break;

      case 'delete_product':
        if (method === 'DELETE' || method === 'POST') {
          const id = req.query.id;
          await query("UPDATE products SET is_active = 0 WHERE id = ?", [id]);
          res.json({ success: true });
        }
        break;

      case 'categories':
        if (method === 'GET') {
          const [rows] = await query("SELECT * FROM categories ORDER BY name");
          res.json(rows);
        }
        break;

      case 'branches':
        if (method === 'GET') {
          const [rows] = await query("SELECT * FROM branches ORDER BY name");
          res.json(rows);
        } else if (method === 'POST') {
          const { name, address, phone, email } = req.body;
          const [result] = await query(
            "INSERT INTO branches (name, address, phone, email, is_active) VALUES (?, ?, ?, ?, 1)",
            [name, address, phone, email]
          );
          res.json({ id: result.insertId });
        }
        break;

      case 'update_branch':
        if (method === 'PUT' || method === 'POST') {
          const id = req.query.id;
          const { name, address, phone, email, isActive } = req.body;
          await query(
            "UPDATE branches SET name = ?, address = ?, phone = ?, email = ?, is_active = ? WHERE id = ?",
            [name, address, phone, email, isActive ? 1 : 0, id]
          );
          res.json({ success: true });
        }
        break;

      case 'delete_branch':
        if (method === 'DELETE') {
          const id = req.query.id;
          await query("UPDATE branches SET is_active = 0 WHERE id = ?", [id]);
          res.json({ success: true });
        }
        break;

      case 'customers':
        if (method === 'GET') {
          const [rows] = await query("SELECT * FROM customers ORDER BY name");
          res.json(rows);
        } else if (method === 'POST') {
          const { branch_id, name, email, phone, address } = req.body;
          const [result] = await query(
            "INSERT INTO customers (branch_id, name, email, phone, address) VALUES (?, ?, ?, ?, ?)",
            [branch_id, name, email, phone, address]
          );
          res.json({ id: result.insertId });
        }
        break;

      case 'checkout':
        if (method === 'POST') {
          const { branch_id, user_id, items, total, payment_method } = req.body;
          const orderNumber = `ORD-${Date.now()}`;
          
          if (isUsingSqlite) {
            const transaction = sqliteDb.transaction(() => {
              const orderResult = sqliteDb.prepare(
                "INSERT INTO orders (branch_id, user_id, order_number, subtotal, grand_total, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, 'completed')"
              ).run(branch_id, user_id, orderNumber, total / 1.08, total, payment_method);
              
              const orderId = orderResult.lastInsertRowid;
              for (const item of items) {
                sqliteDb.prepare(
                  "INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)"
                ).run(orderId, item.productId, item.quantity, item.price, item.price * item.quantity);
                
                sqliteDb.prepare(
                  "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?"
                ).run(item.quantity, item.productId);
              }
              return orderId;
            });
            const orderId = transaction();
            res.json({ success: true, orderId });
          } else {
            const connection = await pool.getConnection();
            try {
              await connection.beginTransaction();
              const [orderResult] = await connection.query(
                "INSERT INTO orders (branch_id, user_id, order_number, subtotal, grand_total, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, 'completed')",
                [branch_id, user_id, orderNumber, total / 1.08, total, payment_method]
              );
              const orderId = orderResult.insertId;
              for (const item of items) {
                await connection.query(
                  "INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)",
                  [orderId, item.productId, item.quantity, item.price, item.price * item.quantity]
                );
                await connection.query(
                  "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?",
                  [item.quantity, item.productId]
                );
              }
              await connection.commit();
              res.json({ success: true, orderId });
            } catch (error) {
              await connection.rollback();
              throw error;
            } finally {
              connection.release();
            }
          }
        }
        break;

      case 'inventory_items':
        if (method === 'GET') {
          const [rows] = await query("SELECT * FROM inventory_items WHERE is_active = 1 ORDER BY name");
          res.json(rows);
        } else if (method === 'POST') {
          const { branch_id, name, base_unit, cost, stock } = req.body;
          const [result] = await query(
            "INSERT INTO inventory_items (branch_id, name, base_unit, cost, stock, is_active) VALUES (?, ?, ?, ?, ?, 1)",
            [branch_id, name, base_unit, cost, stock]
          );
          res.json({ id: result.insertId });
        }
        break;

      case 'update_inventory_item':
        if (method === 'PUT' || method === 'POST') {
          const id = req.query.id;
          const { name, base_unit, cost, stock } = req.body;
          await query(
            "UPDATE inventory_items SET name = ?, base_unit = ?, cost = ?, stock = ? WHERE id = ?",
            [name, base_unit, cost, stock, id]
          );
          res.json({ success: true });
        }
        break;

      case 'delete_inventory_item':
        if (method === 'DELETE' || method === 'POST') {
          const id = req.query.id;
          await query("UPDATE inventory_items SET is_active = 0 WHERE id = ?", [id]);
          res.json({ success: true });
        }
        break;

      case 'recipes':
        if (method === 'GET') {
          const [rows] = await query("SELECT * FROM recipes WHERE is_active = 1");
          res.json(rows);
        } else if (method === 'POST') {
          const { product_id, inventory_item_id, quantity } = req.body;
          const [result] = await query(
            "INSERT INTO recipes (product_id, inventory_item_id, quantity, is_active) VALUES (?, ?, ?, 1)",
            [product_id, inventory_item_id, quantity]
          );
          res.json({ id: result.insertId });
        }
        break;

      case 'update_recipe':
        if (method === 'PUT' || method === 'POST') {
          const id = req.query.id;
          const { product_id, inventory_item_id, quantity } = req.body;
          await query(
            "UPDATE recipes SET product_id = ?, inventory_item_id = ?, quantity = ? WHERE id = ?",
            [product_id, inventory_item_id, quantity, id]
          );
          res.json({ success: true });
        }
        break;

      case 'delete_recipe':
        if (method === 'DELETE' || method === 'POST') {
          const id = req.query.id;
          await query("UPDATE recipes SET is_active = 0 WHERE id = ?", [id]);
          res.json({ success: true });
        }
        break;

      case 'accounts':
        if (method === 'GET') {
          const [rows] = await query("SELECT * FROM accounts ORDER BY name");
          res.json(rows);
        } else if (method === 'POST') {
          const { branch_id, name, type, balance } = req.body;
          const [result] = await query(
            "INSERT INTO accounts (branch_id, name, type, balance) VALUES (?, ?, ?, ?)",
            [branch_id, name, type, balance]
          );
          res.json({ id: result.insertId });
        }
        break;

      case 'transactions':
        if (method === 'GET') {
          const [rows] = await query(
            "SELECT * FROM account_transactions WHERE account_id = ? ORDER BY created_at DESC",
            [req.query.accountId]
          );
          res.json(rows);
        } else if (method === 'POST') {
          const { account_id, debit, credit, description } = req.body;
          const [result] = await query(
            "INSERT INTO account_transactions (account_id, debit, credit, description) VALUES (?, ?, ?, ?)",
            [account_id, debit, credit, description]
          );
          res.json({ id: result.insertId });
        }
        break;

      case 'work_periods':
        if (method === 'POST') {
          const { action: wpAction, branch_id, user_id, id } = req.body;
          if (wpAction === 'start') {
            const [result] = await query(
              "INSERT INTO work_periods (branch_id, user_id_start, status) VALUES (?, ?, 'open')",
              [branch_id, user_id]
            );
            res.json({ id: result.insertId });
          } else if (wpAction === 'end') {
            await query(
              "UPDATE work_periods SET user_id_end = ?, end_time = CURRENT_TIMESTAMP, status = 'closed' WHERE id = ?",
              [user_id, id]
            );
            res.json({ success: true });
          }
        }
        break;

      case 'sales':
        if (method === 'GET') {
          const [rows] = await query("SELECT * FROM orders ORDER BY created_at DESC");
          res.json(rows);
        }
        break;

      case 'warehouses':
        if (method === 'GET') {
          const [rows] = await query("SELECT * FROM warehouses WHERE is_active = 1 ORDER BY name");
          res.json(rows);
        } else if (method === 'POST') {
          const { branch_id, name, location } = req.body;
          const [result] = await query(
            "INSERT INTO warehouses (branch_id, name, location, is_active) VALUES (?, ?, ?, 1)",
            [branch_id, name, location]
          );
          res.json({ id: result.insertId });
        }
        break;

      case 'update_warehouse':
        if (method === 'PUT' || method === 'POST') {
          const id = req.query.id;
          const { name, location } = req.body;
          await query(
            "UPDATE warehouses SET name = ?, location = ? WHERE id = ?",
            [name, location, id]
          );
          res.json({ success: true });
        }
        break;

      case 'delete_warehouse':
        if (method === 'DELETE' || method === 'POST') {
          const id = req.query.id;
          await query("UPDATE warehouses SET is_active = 0 WHERE id = ?", [id]);
          res.json({ success: true });
        }
        break;

      case 'stock_adjustments':
        if (method === 'GET') {
          const [rows] = await query("SELECT * FROM stock_adjustments ORDER BY created_at DESC");
          res.json(rows);
        } else if (method === 'POST') {
          const { item_id, item_type, quantity, reason, user_id, branch_id } = req.body;
          const [result] = await query(
            "INSERT INTO stock_adjustments (item_id, item_type, quantity, reason, user_id, branch_id) VALUES (?, ?, ?, ?, ?, ?)",
            [item_id, item_type, quantity, reason, user_id, branch_id]
          );
          
          // Update the actual stock
          const table = item_type === 'product' ? 'products' : 'inventory_items';
          const column = item_type === 'product' ? 'stock_quantity' : 'stock';
          await query(`UPDATE ${table} SET ${column} = ${column} + ? WHERE id = ?`, [quantity, item_id]);
          
          res.json({ id: result.insertId });
        }
        break;

      case 'stock_transfers':
        if (method === 'GET') {
          const [rows] = await query("SELECT * FROM stock_transfers ORDER BY created_at DESC");
          res.json(rows);
        } else if (method === 'POST') {
          const { item_id, item_type, from_branch_id, to_branch_id, quantity, user_id } = req.body;
          const [result] = await query(
            "INSERT INTO stock_transfers (item_id, item_type, from_branch_id, to_branch_id, quantity, user_id) VALUES (?, ?, ?, ?, ?, ?)",
            [item_id, item_type, from_branch_id, to_branch_id, quantity, user_id]
          );
          
          const table = item_type === 'product' ? 'products' : 'inventory_items';
          const column = item_type === 'product' ? 'stock_quantity' : 'stock';
          
          // Deduct from source
          await query(`UPDATE ${table} SET ${column} = ${column} - ? WHERE id = ? AND branch_id = ?`, [quantity, item_id, from_branch_id]);
          // Add to destination (this assumes the item exists in both branches, which might not be true in a real system, but for this POS it's a simplification)
          // In a more complex system, we'd check if it exists or use a branch_inventory table.
          await query(`UPDATE ${table} SET ${column} = ${column} + ? WHERE id = ? AND branch_id = ?`, [quantity, item_id, to_branch_id]);
          
          res.json({ id: result.insertId });
        }
        break;

      default:
        res.status(404).json({ error: "Action not found" });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Vite Middleware
async function startServer() {
  await initDb();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
