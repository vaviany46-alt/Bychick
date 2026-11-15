import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "bychick.db"), { timeout: 15_000 });
db.pragma("busy_timeout = 15000");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ADMIN','KASIR')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('GEPREK','BURGER','MINUMAN','SNAK')),
  price INTEGER NOT NULL CHECK(price >= 0),
  is_available INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  queue_number TEXT NOT NULL,
  kasir_id INTEGER NOT NULL REFERENCES users(id),
  customer_name TEXT,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('CASH','QRIS','DEBIT')),
  cash_received INTEGER,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK(status IN ('QUEUED','CALLED','DONE','CANCELLED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  called_at TEXT,
  done_at TEXT
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_id INTEGER REFERENCES menus(id) ON DELETE SET NULL,
  menu_name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  qty INTEGER NOT NULL CHECK(qty > 0),
  subtotal INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT,
  action TEXT NOT NULL,
  detail TEXT,
  ip TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs(created_at);
`);

function seed() {
  // Satu transaksi BEGIN IMMEDIATE: hanya satu proses yang boleh seed sekaligus
  // (build berjalan multi-worker); worker lain menunggu lalu menemukan data sudah ada.
  const seedTx = db.transaction(() => {
    const userCount = (db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number }).c;
    if (userCount === 0) {
      const hash = bcrypt.hashSync(process.env.SEED_ADMIN_PASSWORD || "Admin123!", 12);
      db.prepare("INSERT INTO users (username,name,password_hash,role) VALUES (?,?,?,?)")
        .run("admin", "Owner Bychick", hash, "ADMIN");
      db.prepare("INSERT INTO users (username,name,password_hash,role) VALUES (?,?,?,?)")
        .run("kasir", "Kasir Bychick", bcrypt.hashSync(process.env.SEED_KASIR_PASSWORD || "Kasir123!", 12), "KASIR");
    }

    const menuCount = (db.prepare("SELECT COUNT(*) AS c FROM menus").get() as { c: number }).c;
    if (menuCount === 0) {
      const ins = db.prepare("INSERT INTO menus (name,category,price) VALUES (?,?,?)");
      const items: Array<[string, string, number]> = [
      ["Geprek Original Level 1", "GEPREK", 15000],
      ["Geprek Sambal Bawang L3", "GEPREK", 17000],
      ["Geprek Mozarella L5", "GEPREK", 24000],
      ["Geprek Sambal Matah", "GEPREK", 19000],
      ["Paket Geprek Komplit", "GEPREK", 25000],
      ["Bychick Burger Beef", "BURGER", 22000],
      ["Burger Ayam Crispy", "BURGER", 18000],
      ["Double Cheese Burger", "BURGER", 32000],
      ["Burger Sambel Ijo", "BURGER", 23000],
      ["Es Teh Manis Jumbo", "MINUMAN", 6000],
      ["Es Jeruk Peras", "MINUMAN", 8000],
      ["Teh Tawar", "MINUMAN", 4000],
      ["Es Kopi Susu Bychick", "MINUMAN", 15000],
      ["Kentang Goreng", "SNAK", 12000],
      ["Tahu Krispi", "SNAK", 10000],
      ["Kulit Ayam Krispi", "SNAK", 13000],
    ];
    const tx = db.transaction(() => items.forEach(([n, c, p]) => ins.run(n, c, p)));
    tx();
  }

  // Data demo untuk menghidupkan dashboard analisis (hanya saat database baru).
  const orderCount = (db.prepare("SELECT COUNT(*) AS c FROM orders").get() as { c: number }).c;
  if (orderCount === 0 && process.env.DEMO_SEED !== "0") {
    const admin = db.prepare("SELECT id FROM users WHERE username='admin'").get() as { id: number };
    const menus = db.prepare("SELECT * FROM menus").all() as Array<{ id: number; name: string; category: string; price: number }>;
    const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
    const insOrder = db.prepare("INSERT INTO orders (queue_number,kasir_id,customer_name,payment_method,cash_received,total,status,created_at,called_at,done_at) VALUES (?,?,?,?,?,?,?,?,?,?)");
    const insItem = db.prepare("INSERT INTO order_items (order_id,menu_id,menu_name,category,price,qty,subtotal) VALUES (?,?,?,?,?,?,?)");
    const now = new Date();
    for (let d = 13; d >= 0; d--) {
      const perDay = rand(6, 14);
      for (let i = 1; i <= perDay; i++) {
        const day = new Date();
        day.setDate(day.getDate() - d);
        const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
        const createdAt = `${dateStr} ${String(rand(d === 0 ? 8 : 9, d === 0 ? Math.max(9, now.getHours() - 1) : 20)).padStart(2, "0")}:${String(rand(0, 59)).padStart(2, "0")}:00`;
        const pay = ["CASH", "QRIS", "DEBIT"][rand(0, 2)];
        let total = 0; const lines: Array<[typeof menus[number], number]> = [];
        for (let j = 0; j < rand(1, 4); j++) {
          const m = menus[rand(0, menus.length - 1)];
          const qty = rand(1, 3);
          lines.push([m, qty]);
          total += m.price * qty;
        }
        const status = d === 0 ? (i <= 2 ? "QUEUED" : i <= 4 ? "CALLED" : "DONE") : "DONE";
        const qn = `A-${String(i).padStart(3, "0")}`;
        const info = insOrder.run(qn, admin.id, null, pay, pay === "CASH" ? Math.ceil(total / 5000) * 5000 : null, total, status, createdAt, createdAt, createdAt);
        for (const [m, qty] of lines) insItem.run(info.lastInsertRowid, m.id, m.name, m.category, m.price, qty, m.price * qty);
      }
    }
  }
  });

  // Jalankan sebagai BEGIN IMMEDIATE agar worker build paralel tidak saling mengunci.
  seedTx.immediate();
}

seed();

export default db;
