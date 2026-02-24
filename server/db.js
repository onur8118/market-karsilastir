import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'fiyatradar.db');

let db = null;

export async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
    initTables(db);
  }

  return db;
}

export function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function initTables(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS markets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      bg_color TEXT,
      base_url TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT,
      category TEXT,
      barcode TEXT,
      image_url TEXT,
      source_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(name, brand)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      market_id TEXT NOT NULL,
      price REAL NOT NULL,
      original_price REAL,
      date TEXT DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (market_id) REFERENCES markets(id)
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_prices_product ON prices(product_id)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_prices_date ON prices(date)
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS scrape_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      market_id TEXT NOT NULL,
      status TEXT NOT NULL,
      products_found INTEGER DEFAULT 0,
      prices_updated INTEGER DEFAULT 0,
      error TEXT,
      started_at TEXT DEFAULT (datetime('now')),
      finished_at TEXT
    )
  `);

  // Seed markets
  const markets = [
    ['a101', 'A101', '#0057A8', '#E8F1FA', 'https://www.a101.com.tr'],
    ['bim', 'BİM', '#E30613', '#FCE8EA', 'https://www.bim.com.tr'],
    ['sok', 'ŞOK', '#FFD100', '#FFF9E0', 'https://www.sokmarket.com.tr'],
    ['migros', 'Migros', '#F26F21', '#FEF0E6', 'https://www.migros.com.tr'],
    ['carrefoursa', 'CarrefourSA', '#004E9A', '#E6EEF6', 'https://www.carrefoursa.com'],
  ];

  const insertMarket = db.prepare('INSERT OR IGNORE INTO markets (id, name, color, bg_color, base_url) VALUES (?, ?, ?, ?, ?)');
  markets.forEach(m => {
    insertMarket.bind(m);
    insertMarket.step();
    insertMarket.reset();
  });
  insertMarket.free();

  // Seed categories
  const categories = [
    ['icecek', 'İçecekler', '🥤'],
    ['sut-urunleri', 'Süt Ürünleri', '🧀'],
    ['atistirmalik', 'Atıştırmalık', '🍫'],
    ['temizlik', 'Temizlik', '🧹'],
    ['kisisel-bakim', 'Kişisel Bakım', '🧴'],
    ['temel-gida', 'Temel Gıda', '🌾'],
    ['meyve-sebze', 'Meyve & Sebze', '🍎'],
    ['et-tavuk', 'Et & Tavuk', '🥩'],
    ['dondurulmus', 'Dondurulmuş', '🧊'],
    ['bebek', 'Bebek Ürünleri', '👶'],
  ];

  const insertCat = db.prepare('INSERT OR IGNORE INTO categories (id, name, icon) VALUES (?, ?, ?)');
  categories.forEach(c => {
    insertCat.bind(c);
    insertCat.step();
    insertCat.reset();
  });
  insertCat.free();

  saveDb();
  console.log('✅ Veritabanı oluşturuldu ve tablolar hazırlandı.');
}

// Normalize product name for cross-market matching
export function normalizeName(name) {
  let n = name
    .toLowerCase()
    .replace(/[''""\u2018\u2019\u201C\u201D]/g, '')  // remove quotes
    .replace(/\s+/g, ' ')            // collapse whitespace
    .replace(/&amp;/g, '&')
    .trim();

  // Standardize units
  n = n
    .replace(/(\d)\s*(lt|litre|liter)\b/gi, '$1 l')
    .replace(/(\d)\s*ml\b/gi, '$1 ml')
    .replace(/(\d)\s*(gr|gram)\b/gi, '$1 g')
    .replace(/(\d)\s*kg\b/gi, '$1 kg')
    .replace(/(\d)\s*cc\b/gi, '$1 ml')
    .replace(/(\d)\s*adet\b/gi, '$1 adet');

  // Standardize separators
  n = n
    .replace(/\s*x\s*/g, '*')        // 3x1 → 3*1
    .replace(/\s*\*\s*/g, '*')
    .replace(/'lı\b/g, 'li')
    .replace(/'lu\b/g, 'lu')
    .replace(/'li\b/g, 'li')
    .replace(/'lü\b/g, 'lü');

  // Remove extra spaces
  n = n.replace(/\s+/g, ' ').trim();

  return n;
}

// Helper: insert or update product and return product ID
export function upsertProduct(db, { name, brand, category, barcode, imageUrl, sourceUrl }) {
  const normalized = normalizeName(name);

  // Try exact match first
  let existing = db.exec('SELECT id FROM products WHERE name = ? AND brand = ?', [name, brand || '']);

  // Try normalized match if no exact match
  if (!existing.length || !existing[0].values.length) {
    existing = db.exec(
      "SELECT id FROM products WHERE LOWER(REPLACE(REPLACE(REPLACE(name, ' ', ''), '-', ''), '.', '')) = ?",
      [normalized.replace(/[\s\-\.]/g, '')]
    );
  }

  // Try fuzzy match: same first 20 chars of normalized name
  if (!existing.length || !existing[0].values.length) {
    const shortNorm = normalized.replace(/[\s\-\.]/g, '').substring(0, 20);
    if (shortNorm.length >= 10) {
      existing = db.exec(
        "SELECT id FROM products WHERE SUBSTR(LOWER(REPLACE(REPLACE(REPLACE(name, ' ', ''), '-', ''), '.', '')), 1, 20) = ?",
        [shortNorm]
      );
    }
  }

  if (existing.length > 0 && existing[0].values.length > 0) {
    const id = existing[0].values[0][0];
    // Update with better data if available
    db.run('UPDATE products SET category = COALESCE(?, category), barcode = COALESCE(?, barcode), image_url = COALESCE(?, image_url), source_url = COALESCE(?, source_url), updated_at = datetime("now") WHERE id = ?',
      [category || null, barcode || null, imageUrl || null, sourceUrl || null, id]);
    return id;
  }

  db.run('INSERT INTO products (name, brand, category, barcode, image_url, source_url) VALUES (?, ?, ?, ?, ?, ?)',
    [name, brand || '', category || null, barcode || null, imageUrl || null, sourceUrl || null]);

  const result = db.exec('SELECT last_insert_rowid()');
  return result[0].values[0][0];
}

// Helper: insert price (avoid duplicate for same product+market+date)
export function insertPrice(db, { productId, marketId, price, originalPrice }) {
  const today = new Date().toISOString().split('T')[0];

  // Check if already has price for today
  const existing = db.exec(
    'SELECT id FROM prices WHERE product_id = ? AND market_id = ? AND date = ?',
    [productId, marketId, today]
  );

  if (existing.length > 0 && existing[0].values.length > 0) {
    // Update existing
    db.run('UPDATE prices SET price = ?, original_price = ? WHERE id = ?',
      [price, originalPrice || null, existing[0].values[0][0]]);
  } else {
    db.run('INSERT INTO prices (product_id, market_id, price, original_price, date) VALUES (?, ?, ?, ?, ?)',
      [productId, marketId, price, originalPrice || null, today]);
  }
}

