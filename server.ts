import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import mysql from "mysql2/promise";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import fs from "fs";
import multer from "multer";

dotenv.config();

const app = express();
const PORT = 3000;

// Configure multer for QR code uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'qr-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.use(cors());
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
        queueLimit: 0,
        multipleStatements: true
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
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          role TEXT NOT NULL,
          phone TEXT,
          address TEXT,
          emp_no TEXT UNIQUE,
          id_number TEXT,
          username TEXT UNIQUE,
          password TEXT,
          joined_date TEXT,
          branch_ids TEXT, -- JSON array of branch IDs
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
        CREATE TABLE IF NOT EXISTS crypto_wallets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          network TEXT NOT NULL,
          address TEXT NOT NULL,
          qr_code_url TEXT,
          is_active INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          company_name TEXT,
          company_trn TEXT,
          address TEXT,
          phone TEXT,
          email TEXT,
          whatsapp TEXT,
          facebook TEXT,
          instagram TEXT,
          currency_name TEXT,
          currency_sign TEXT,
          currency_prefix INTEGER DEFAULT 1,
          tax_percentage REAL DEFAULT 0,
          service_charge REAL DEFAULT 0
        );
      `);

      // Insert default settings if not exists
      const settingsCount = sqliteDb.prepare("SELECT COUNT(*) as count FROM settings").get();
      if (settingsCount.count === 0) {
        sqliteDb.prepare(`
          INSERT INTO settings (id, company_name, currency_name, currency_sign, tax_percentage)
          VALUES (1, 'Ace Point Of Sale', 'US Dollar', '$', 10)
        `).run();
      }
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

        // Migration for users
        const uColumns = sqliteDb.prepare("PRAGMA table_info(users)").all();
        const uColumnNames = uColumns.map((c: any) => c.name);
        if (!uColumnNames.includes('address')) {
          sqliteDb.prepare("ALTER TABLE users ADD COLUMN address TEXT").run();
        }
        if (!uColumnNames.includes('emp_no')) {
          sqliteDb.prepare("ALTER TABLE users ADD COLUMN emp_no TEXT").run();
        }
        if (!uColumnNames.includes('id_number')) {
          sqliteDb.prepare("ALTER TABLE users ADD COLUMN id_number TEXT").run();
        }
        if (!uColumnNames.includes('username')) {
          sqliteDb.prepare("ALTER TABLE users ADD COLUMN username TEXT").run();
        }
        if (!uColumnNames.includes('password')) {
          sqliteDb.prepare("ALTER TABLE users ADD COLUMN password TEXT").run();
        }
        if (!uColumnNames.includes('joined_date')) {
          sqliteDb.prepare("ALTER TABLE users ADD COLUMN joined_date TEXT").run();
        }
        if (!uColumnNames.includes('branch_ids')) {
          sqliteDb.prepare("ALTER TABLE users ADD COLUMN branch_ids TEXT").run();
        }
        if (!uColumnNames.includes('role')) {
          sqliteDb.prepare("ALTER TABLE users ADD COLUMN role TEXT").run();
        }

        // Migration for branches
        const bColumns = sqliteDb.prepare("PRAGMA table_info(branches)").all();
        const bColumnNames = bColumns.map((c: any) => c.name);
        if (!bColumnNames.includes('receipt_template')) {
          sqliteDb.prepare("ALTER TABLE branches ADD COLUMN receipt_template TEXT").run();
        }

        // Migration for orders
        const oColumns = sqliteDb.prepare("PRAGMA table_info(orders)").all();
        const oColumnNames = oColumns.map((c: any) => c.name);
        if (!oColumnNames.includes('tax_amount')) {
          sqliteDb.prepare("ALTER TABLE orders ADD COLUMN tax_amount REAL DEFAULT 0.00").run();
        }
        if (!oColumnNames.includes('service_charge_amount')) {
          sqliteDb.prepare("ALTER TABLE orders ADD COLUMN service_charge_amount REAL DEFAULT 0.00").run();
        }

        // Migration for order_items
        const oiColumns = sqliteDb.prepare("PRAGMA table_info(order_items)").all();
        const oiColumnNames = oiColumns.map((c: any) => c.name);
        if (!oiColumnNames.includes('product_name')) {
          sqliteDb.prepare("ALTER TABLE order_items ADD COLUMN product_name TEXT").run();
        }
        if (!oiColumnNames.includes('tags')) {
          sqliteDb.prepare("ALTER TABLE order_items ADD COLUMN tags TEXT").run();
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
app.all("/api/index.php", upload.single('qr_code'), async (req, res) => {
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

      case 'settings':
        if (method === 'GET') {
          const [rows] = await query("SELECT * FROM settings WHERE id = 1");
          res.json(rows[0] || {});
        } else if (method === 'POST' || method === 'PUT') {
          const { 
            company_name, company_trn, address, phone, email, whatsapp, 
            facebook, instagram, currency_name, currency_sign, 
            currency_prefix, tax_percentage, service_charge 
          } = req.body;
          
          await query(`
            UPDATE settings SET 
              company_name = ?, company_trn = ?, address = ?, phone = ?, 
              email = ?, whatsapp = ?, facebook = ?, instagram = ?, 
              currency_name = ?, currency_sign = ?, currency_prefix = ?, 
              tax_percentage = ?, service_charge = ?
            WHERE id = 1
          `, [
            company_name, company_trn, address, phone, 
            email, whatsapp, facebook, instagram, 
            currency_name, currency_sign, currency_prefix ? 1 : 0, 
            tax_percentage, service_charge
          ]);
          res.json({ success: true });
        }
        break;

      case 'categories':
        if (method === 'GET') {
          const [rows] = await query("SELECT * FROM categories ORDER BY name");
          res.json(rows);
        } else if (method === 'POST') {
          const { branch_id, name, color } = req.body;
          const [result] = await query(
            "INSERT INTO categories (branch_id, name, color) VALUES (?, ?, ?)",
            [branch_id, name, color]
          );
          res.json({ id: result.insertId });
        }
        break;

      case 'update_category':
        if (method === 'PUT' || method === 'POST') {
          const id = req.query.id;
          const { name, color } = req.body;
          await query(
            "UPDATE categories SET name = ?, color = ? WHERE id = ?",
            [name, color, id]
          );
          res.json({ success: true });
        }
        break;

      case 'delete_category':
        if (method === 'DELETE' || method === 'POST') {
          const id = req.query.id;
          await query("DELETE FROM categories WHERE id = ?", [id]);
          res.json({ success: true });
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

      case 'crypto_wallets':
        if (method === 'GET') {
          const [rows] = await query("SELECT * FROM crypto_wallets WHERE is_active = 1 ORDER BY name");
          res.json(rows);
        } else if (method === 'POST') {
          const { name, network, address, qr_code_url } = req.body;
          const [result] = await query(
            "INSERT INTO crypto_wallets (name, network, address, qr_code_url) VALUES (?, ?, ?, ?)",
            [name, network, address, qr_code_url]
          );
          res.json({ id: result.insertId });
        }
        break;

      case 'update_crypto_wallet':
        if (method === 'PUT' || method === 'POST') {
          const id = req.query.id;
          const { name, network, address, qr_code_url } = req.body;
          await query(
            "UPDATE crypto_wallets SET name = ?, network = ?, address = ?, qr_code_url = ? WHERE id = ?",
            [name, network, address, qr_code_url, id]
          );
          res.json({ success: true });
        }
        break;

      case 'delete_crypto_wallet':
        if (method === 'DELETE' || method === 'POST') {
          const id = req.query.id;
          await query("UPDATE crypto_wallets SET is_active = 0 WHERE id = ?", [id]);
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

      case 'update_customer':
        if (method === 'PUT' || method === 'POST') {
          const id = req.query.id;
          const { name, email, phone, address } = req.body;
          await query(
            "UPDATE customers SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?",
            [name, email, phone, address, id]
          );
          res.json({ success: true });
        }
        break;

      case 'delete_customer':
        if (method === 'DELETE' || method === 'POST') {
          const id = req.query.id;
          await query("DELETE FROM customers WHERE id = ?", [id]);
          res.json({ success: true });
        }
        break;

      case 'checkout':
        if (method === 'POST') {
          const { branch_id, user_id, items, total, payment_method } = req.body;
          const orderNumber = `ORD-${Date.now()}`;
          
          // Get tax rate and service charge from settings
          const [settingsRows] = await query("SELECT tax_percentage, service_charge FROM settings WHERE id = 1");
          const taxRate = settingsRows[0]?.tax_percentage || 0;
          const serviceChargeRate = settingsRows[0]?.service_charge || 0;
          
          const subtotal = total / (1 + (taxRate + serviceChargeRate) / 100);
          const taxAmount = subtotal * (taxRate / 100);
          const serviceChargeAmount = subtotal * (serviceChargeRate / 100);

          if (isUsingSqlite) {
            const transaction = sqliteDb.transaction(() => {
              const orderResult = sqliteDb.prepare(
                "INSERT INTO orders (branch_id, user_id, order_number, subtotal, tax_amount, service_charge_amount, grand_total, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')"
              ).run(branch_id, user_id, orderNumber, subtotal, taxAmount, serviceChargeAmount, total, payment_method);
              
              const orderId = orderResult.lastInsertRowid;
              for (const item of items) {
                sqliteDb.prepare(
                  "INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price, tags) VALUES (?, ?, ?, ?, ?, ?, ?)"
                ).run(orderId, item.productId, item.name, item.quantity, item.price, item.price * item.quantity, JSON.stringify(item.tags || []));
                
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
                "INSERT INTO orders (branch_id, user_id, order_number, subtotal, tax_amount, service_charge_amount, grand_total, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')",
                [branch_id, user_id, orderNumber, subtotal, taxAmount, serviceChargeAmount, total, payment_method]
              );
              const orderId = orderResult.insertId;
              for (const item of items) {
                await connection.query(
                  "INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price, tags) VALUES (?, ?, ?, ?, ?, ?, ?)",
                  [orderId, item.productId, item.name, item.quantity, item.price, item.price * item.quantity, JSON.stringify(item.tags || [])]
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

      case 'update_account':
        if (method === 'PUT' || method === 'POST') {
          const id = req.query.id;
          const { name, type, balance } = req.body;
          await query(
            "UPDATE accounts SET name = ?, type = ?, balance = ? WHERE id = ?",
            [name, type, balance, id]
          );
          res.json({ success: true });
        }
        break;

      case 'delete_account':
        if (method === 'DELETE' || method === 'POST') {
          const id = req.query.id;
          await query("DELETE FROM accounts WHERE id = ?", [id]);
          res.json({ success: true });
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
          const [orders] = await query("SELECT * FROM orders ORDER BY created_at DESC");
          const salesWithItems = [];
          for (const order of orders) {
            const [items] = await query(`
              SELECT oi.*, COALESCE(p.name, oi.product_name) as name 
              FROM order_items oi 
              LEFT JOIN products p ON oi.product_id = p.id 
              WHERE oi.order_id = ?
            `, [order.id]);
            salesWithItems.push({
              ...order,
              items: items.map((item: any) => ({
                ...item,
                tags: item.tags ? JSON.parse(item.tags) : []
              }))
            });
          }
          res.json(salesWithItems);
        }
        break;

      case 'upload_qr':
        if (method === 'POST') {
          if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
          }
          const url = `/uploads/${req.file.filename}`;
          res.json({ url });
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
          
          const table = item_type === 'product' ? 'products' : 'inventory_items';
          const column = item_type === 'product' ? 'stock_quantity' : 'stock';
          
          // 1. Get source item details
          const [sourceItems] = await query(`SELECT * FROM ${table} WHERE id = ? AND branch_id = ?`, [item_id, from_branch_id]);
          if (sourceItems.length === 0) {
            return res.status(400).json({ error: "Source item not found in specified branch" });
          }
          const sourceItem = sourceItems[0];

          // 2. Find or create destination item
          let destItemId;
          let destItems;
          if (item_type === 'product') {
            [destItems] = await query(`SELECT id FROM products WHERE branch_id = ? AND (sku = ? OR name = ?)`, [to_branch_id, sourceItem.sku, sourceItem.name]);
          } else {
            [destItems] = await query(`SELECT id FROM inventory_items WHERE branch_id = ? AND name = ?`, [to_branch_id, sourceItem.name]);
          }

          if (destItems.length > 0) {
            destItemId = destItems[0].id;
            // Update existing
            await query(`UPDATE ${table} SET ${column} = ${column} + ? WHERE id = ?`, [quantity, destItemId]);
          } else {
            // Create new in destination branch
            if (item_type === 'product') {
              const [insertResult] = await query(
                "INSERT INTO products (branch_id, name, price, category_id, stock_quantity, sku, image_url, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [to_branch_id, sourceItem.name, sourceItem.price, sourceItem.category_id, quantity, sourceItem.sku, sourceItem.image_url, sourceItem.expiry_date]
              );
              destItemId = insertResult.insertId;
            } else {
              const [insertResult] = await query(
                "INSERT INTO inventory_items (branch_id, name, base_unit, cost, stock) VALUES (?, ?, ?, ?, ?)",
                [to_branch_id, sourceItem.name, sourceItem.base_unit, sourceItem.cost, quantity]
              );
              destItemId = insertResult.insertId;
            }
          }

          // 3. Deduct from source
          await query(`UPDATE ${table} SET ${column} = ${column} - ? WHERE id = ?`, [quantity, item_id]);

          // 4. Record transfer
          const [result] = await query(
            "INSERT INTO stock_transfers (item_id, item_type, from_branch_id, to_branch_id, quantity, user_id) VALUES (?, ?, ?, ?, ?, ?)",
            [item_id, item_type, from_branch_id, to_branch_id, quantity, user_id]
          );
          
          res.json({ id: result.insertId });
        }
        break;

      case 'users':
        if (method === 'GET') {
          const [rows] = await query("SELECT * FROM users ORDER BY name");
          res.json(rows);
        } else if (method === 'POST') {
          const { name, email, role, phone, address, emp_no, id_number, username, password, joined_date, branch_ids, is_active } = req.body;
          
          // Check for duplicate emp_no
          if (emp_no) {
            const [existing] = await query("SELECT id FROM users WHERE emp_no = ?", [emp_no]);
            if (existing.length > 0) {
              return res.status(400).json({ error: "Employee number already exists" });
            }
          }

          // Check for duplicate username
          if (username) {
            const [existing] = await query("SELECT id FROM users WHERE username = ?", [username]);
            if (existing.length > 0) {
              return res.status(400).json({ error: "Username already exists" });
            }
          }

          const isActiveValue = is_active === undefined ? 1 : (is_active ? 1 : 0);
          const [result] = await query(
            "INSERT INTO users (name, email, role, phone, address, emp_no, id_number, username, password, joined_date, branch_ids, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [name, email, role, phone, address, emp_no, id_number, username, password, joined_date, branch_ids, isActiveValue]
          );
          res.json({ id: result.insertId });
        }
        break;

      case 'update_user':
        if (method === 'PUT' || method === 'POST') {
          const id = req.query.id;
          const { name, email, role, phone, address, emp_no, id_number, username, password, joined_date, branch_ids, is_active } = req.body;
          
          // Check for duplicate emp_no
          if (emp_no) {
            const [existing] = await query("SELECT id FROM users WHERE emp_no = ? AND id != ?", [emp_no, id]);
            if (existing.length > 0) {
              return res.status(400).json({ error: "Employee number already exists" });
            }
          }

          // Check for duplicate username
          if (username) {
            const [existing] = await query("SELECT id FROM users WHERE username = ? AND id != ?", [username, id]);
            if (existing.length > 0) {
              return res.status(400).json({ error: "Username already exists" });
            }
          }

          // Get current user to handle partial updates
          const [currentUsers] = await query("SELECT * FROM users WHERE id = ?", [id]);
          if (currentUsers.length === 0) return res.status(404).json({ error: "User not found" });
          const currentUser = currentUsers[0];

          const isActiveValue = is_active === undefined ? currentUser.is_active : (is_active ? 1 : 0);

          await query(
            "UPDATE users SET name = ?, email = ?, role = ?, phone = ?, address = ?, emp_no = ?, id_number = ?, username = ?, password = ?, joined_date = ?, branch_ids = ?, is_active = ? WHERE id = ?",
            [
              name !== undefined ? name : currentUser.name,
              email !== undefined ? email : currentUser.email,
              role !== undefined ? role : currentUser.role,
              phone !== undefined ? phone : currentUser.phone,
              address !== undefined ? address : currentUser.address,
              emp_no !== undefined ? emp_no : currentUser.emp_no,
              id_number !== undefined ? id_number : currentUser.id_number,
              username !== undefined ? username : currentUser.username,
              password !== undefined ? password : currentUser.password,
              joined_date !== undefined ? joined_date : currentUser.joined_date,
              branch_ids !== undefined ? branch_ids : currentUser.branch_ids,
              isActiveValue,
              id
            ]
          );
          res.json({ success: true });
        }
        break;

      case 'delete_user':
        if (method === 'DELETE' || method === 'POST') {
          const id = req.query.id;
          await query("UPDATE users SET is_active = 0 WHERE id = ?", [id]);
          res.json({ success: true });
        }
        break;

      case 'login':
        if (method === 'POST') {
          const { email, password } = req.body;
          const [rows] = await query("SELECT * FROM users WHERE email = ? AND password = ? AND is_active = 1", [email, password]);
          if (rows.length > 0) {
            const u = rows[0];
            res.json({
              id: u.id.toString(),
              name: u.name,
              email: u.email,
              role: u.role,
              branchIds: u.branch_ids ? JSON.parse(u.branch_ids) : [],
              isActive: u.is_active === 1,
              empNo: u.emp_no,
              joinedDate: u.joined_date
            });
          } else {
            res.status(401).json({ error: "Invalid credentials" });
          }
        }
        break;

      case 'export_sql':
        if (method === 'GET') {
          try {
            let tables: string[] = [];
            if (isUsingSqlite) {
              const rows = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'sqlite_sequence'").all();
              tables = rows.map((r: any) => r.name);
            } else {
              const [rows] = await pool.query("SHOW TABLES");
              const dbName = process.env.MYSQL_DATABASE || 'pos_db';
              tables = rows.map((r: any) => r[`Tables_in_${dbName}`] || Object.values(r)[0]);
            }

            let sqlDump = isUsingSqlite ? "PRAGMA foreign_keys = OFF;\n" : "SET FOREIGN_KEY_CHECKS = 0;\n";
            
            for (const table of tables) {
              sqlDump += `\n-- Table: ${table}\n`;
              sqlDump += `DELETE FROM \`${table}\`;\n`;
              
              let rows: any[] = [];
              if (isUsingSqlite) {
                rows = sqliteDb.prepare(`SELECT * FROM \`${table}\``).all();
              } else {
                const [result] = await pool.query(`SELECT * FROM \`${table}\``);
                rows = result;
              }

              if (rows.length > 0) {
                const keys = Object.keys(rows[0]);
                const columns = keys.map(k => `\`${k}\``).join(', ');
                
                for (const row of rows) {
                  const values = keys.map(k => {
                    const val = row[k];
                    if (val === null) return 'NULL';
                    if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                    if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                    return val;
                  }).join(', ');
                  sqlDump += `INSERT INTO \`${table}\` (${columns}) VALUES (${values});\n`;
                }
              }
            }

            sqlDump += isUsingSqlite ? "\nPRAGMA foreign_keys = ON;" : "\nSET FOREIGN_KEY_CHECKS = 1;";
            sqlDump += "\n-- END OF BACKUP --";
            res.setHeader('Content-Type', 'text/plain');
            res.send(sqlDump);
          } catch (error) {
            console.error("SQL Export failed:", error);
            res.status(500).json({ error: "SQL Export failed: " + String(error) });
          }
        }
        break;

      case 'import_sql':
        if (method === 'POST') {
          const { sql } = req.body;
          if (!sql) return res.status(400).json({ error: "No SQL provided" });
          
          if (!sql.includes("-- END OF BACKUP --")) {
            return res.status(400).json({ error: "The backup file appears to be incomplete or truncated. Please try generating a new backup." });
          }

          let connection: any = null;
          try {
            if (isUsingSqlite) {
              sqliteDb.exec(sql);
            } else {
              connection = await pool.getConnection();
              await connection.query(sql);
              connection.release();
            }
            res.json({ success: true });
          } catch (error) {
            console.error("SQL Import failed:", error);
            if (connection) connection.release();
            res.status(500).json({ error: "SQL Import failed: " + String(error) });
          }
        }
        break;

      case 'export_data':
        if (method === 'GET') {
          try {
            let tables: string[] = [];
            if (isUsingSqlite) {
              const rows = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'sqlite_sequence'").all();
              tables = rows.map((r: any) => r.name);
            } else {
              const [rows] = await pool.query("SHOW TABLES");
              const dbName = process.env.MYSQL_DATABASE || 'pos_db';
              tables = rows.map((r: any) => r[`Tables_in_${dbName}`] || Object.values(r)[0]);
            }

            console.log(`Exporting ${tables.length} tables: ${tables.join(', ')}`);
            const backup: any = {};
            for (const table of tables) {
              if (isUsingSqlite) {
                backup[table] = sqliteDb.prepare(`SELECT * FROM \`${table}\``).all();
              } else {
                const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
                backup[table] = rows;
              }
            }
            backup._metadata = {
              timestamp: new Date().toISOString(),
              isComplete: true
            };
            res.json(backup);
          } catch (error) {
            console.error("Export failed:", error);
            res.status(500).json({ error: "Export failed: " + String(error) });
          }
        }
        break;

      case 'import_data':
        if (method === 'POST') {
          const backup = req.body;
          if (!backup || typeof backup !== 'object') {
            return res.status(400).json({ error: "Invalid backup data" });
          }
          
          if (!backup._metadata || !backup._metadata.isComplete) {
            return res.status(400).json({ error: "The backup file appears to be incomplete or corrupted. Please try generating a new backup." });
          }

          let connection: any = null;
          try {
            // Get all current tables to clear them first
            let currentTables: string[] = [];
            if (isUsingSqlite) {
              const rows = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'sqlite_sequence'").all();
              currentTables = rows.map((r: any) => r.name);
            } else {
              const [rows] = await pool.query("SHOW TABLES");
              const dbName = process.env.MYSQL_DATABASE || 'pos_db';
              currentTables = rows.map((r: any) => r[`Tables_in_${dbName}`] || Object.values(r)[0]);
            }

            if (isUsingSqlite) {
              sqliteDb.exec("PRAGMA foreign_keys = OFF");
              sqliteDb.exec("BEGIN TRANSACTION");
            } else {
              connection = await pool.getConnection();
              await connection.query("SET FOREIGN_KEY_CHECKS = 0");
              await connection.beginTransaction();
            }

            // 1. Clear all current tables
            for (const table of currentTables) {
              console.log(`Clearing table: ${table}`);
              if (isUsingSqlite) {
                sqliteDb.prepare(`DELETE FROM \`${table}\``).run();
                // Also reset auto-increment counters
                try {
                  sqliteDb.prepare("DELETE FROM sqlite_sequence WHERE name=?").run(table);
                } catch (e) {}
              } else {
                await connection.query(`DELETE FROM \`${table}\``);
              }
            }

            // 2. Restore data from backup
            const backupTables = Object.keys(backup);
            console.log(`Restoring ${backupTables.length} tables from backup`);
            
            for (const table of backupTables) {
              const rows = backup[table];
              if (!Array.isArray(rows) || rows.length === 0) continue;

              // Check if table exists in current database
              if (!currentTables.includes(table)) {
                console.warn(`Table ${table} in backup does not exist in current database. Skipping.`);
                continue;
              }

              console.log(`Restoring table: ${table} (${rows.length} rows)`);
              
              // Get columns for this table to ensure we only insert existing ones
              let tableColumns: string[] = [];
              if (isUsingSqlite) {
                const info = sqliteDb.prepare(`PRAGMA table_info(\`${table}\`)`).all();
                tableColumns = info.map((c: any) => c.name);
              } else {
                const [info] = await connection.query(`DESCRIBE \`${table}\``);
                tableColumns = info.map((c: any) => c.Field);
              }

              const keys = Object.keys(rows[0]).filter(k => tableColumns.includes(k));
              if (keys.length === 0) {
                console.warn(`No matching columns for table ${table}. Skipping.`);
                continue;
              }

              const columns = keys.map(k => `\`${k}\``).join(', ');
              
              if (isUsingSqlite) {
                const placeholders = keys.map(() => '?').join(', ');
                const stmt = sqliteDb.prepare(`INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders})`);
                for (const row of rows) {
                  const values = keys.map(k => row[k] ?? null);
                  stmt.run(...values);
                }
              } else {
                // Bulk insert for MySQL
                const values = rows.map(row => keys.map(k => row[k] ?? null));
                await connection.query(`INSERT INTO \`${table}\` (${columns}) VALUES ?`, [values]);
              }
            }

            if (isUsingSqlite) {
              sqliteDb.exec("COMMIT");
              sqliteDb.exec("PRAGMA foreign_keys = ON");
            } else {
              await connection.commit();
              await connection.query("SET FOREIGN_KEY_CHECKS = 1");
              connection.release();
            }

            console.log("Restore completed successfully");
            res.json({ success: true });
          } catch (error) {
            console.error("Import failed:", error);
            if (isUsingSqlite) {
              try { sqliteDb.exec("ROLLBACK"); } catch(e) {}
              try { sqliteDb.exec("PRAGMA foreign_keys = ON"); } catch(e) {}
            } else if (connection) {
              try { await connection.rollback(); } catch(e) {}
              try { await connection.query("SET FOREIGN_KEY_CHECKS = 1"); } catch(e) {}
              connection.release();
            }
            res.status(500).json({ error: "Import failed: " + String(error) });
          }
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
