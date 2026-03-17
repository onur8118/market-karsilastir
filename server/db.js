import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'fiyatradar.db');

let db = null;
let dbLastModified = 0;

export async function getDb(forceReload = false) {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const stat = fs.statSync(DB_PATH);
    const mtime = stat.mtimeMs;

    if (!db || forceReload || mtime > dbLastModified) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
      db.run(`
        CREATE TABLE IF NOT EXISTS product_equivalents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          original_product_id INTEGER NOT NULL,
          equivalent_product_id INTEGER NOT NULL,
          match_type TEXT DEFAULT 'manual',
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (original_product_id) REFERENCES products(id),
          FOREIGN KEY (equivalent_product_id) REFERENCES products(id),
          UNIQUE(original_product_id, equivalent_product_id)
        )
      `);
      dbLastModified = mtime;
    }
  } else if (!db) {
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

  // === PERFORMANCE INDEXES ===
  db.run(`CREATE INDEX IF NOT EXISTS idx_prices_product ON prices(product_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_prices_date ON prices(date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_prices_market ON prices(market_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_prices_product_market ON prices(product_id, market_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_prices_product_market_date ON prices(product_id, market_id, date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand)`);

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

  db.run(`
    CREATE TABLE IF NOT EXISTS product_equivalents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_product_id INTEGER NOT NULL,
      equivalent_product_id INTEGER NOT NULL,
      match_type TEXT DEFAULT 'manual',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (original_product_id) REFERENCES products(id),
      FOREIGN KEY (equivalent_product_id) REFERENCES products(id),
      UNIQUE(original_product_id, equivalent_product_id)
    )
  `);

  // Seed markets
  const markets = [
    ['a101', 'A101', '#0057A8', '#E8F1FA', 'https://www.a101.com.tr'],
    ['bim', 'BİM', '#E30613', '#FCE8EA', 'https://www.bim.com.tr'],
    ['sok', 'ŞOK', '#FFD100', '#FFF9E0', 'https://www.sokmarket.com.tr'],
    ['migros', 'Migros', '#F26F21', '#FEF0E6', 'https://www.migros.com.tr'],
    ['carrefoursa', 'CarrefourSA', '#004E9A', '#E6EEF6', 'https://www.carrefoursa.com'],
    ['happycenter', 'Happy Center', '#009639', '#e6f4eb', 'https://www.happy.com.tr'],
    ['onur', 'Onur Market', '#f26522', '#feece5', 'https://www.onurmarket.com'],
    ['bizim', 'Bizim Toptan', '#004a99', '#e6edf5', 'https://www.bizimtoptan.com.tr'],
    ['file', 'File Market', '#009b4c', '#e6f5ed', 'https://www.file.com.tr'],
    ['metro', 'Metro', '#00366b', '#e6ebf0', 'https://www.metro-tr.com'],
    ['tarimkredi', 'Tarım Kredi', '#008542', '#e6f3eb', 'https://www.tarimkredi-kooperatif.market'],
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
    .replace(/['"“”‘’]/g, '')  // remove quotes
    .replace(/\s+/g, ' ')            // collapse whitespace
    .replace(/&amp;/g, '&')
    .trim();

  // Normalize common brands or words that differ across markets
  n = n
    .replace(/coca-cola|coca cola/g, 'cocacola')
    .replace(/didi şeftali/g, 'didi seftali')
    .replace(/fuse tea|fusetea/g, 'fusetea')
    .replace(/nescafé/g, 'nescafe');

  // Standardize units
  n = n
    .replace(/(\d)\s*(lt|litre|liter|l)\b/gi, '$1 l')
    .replace(/(\d)\s*(ml)\b/gi, '$1 ml')
    .replace(/(\d)\s*(gr|gram)\b/gi, '$1 g')
    .replace(/(\d)\s*(kg|kilo)\b/gi, '$1 kg')
    .replace(/(\d)\s*cc\b/gi, '$1 ml')
    .replace(/(\d)\s*adet\b/gi, '$1 adet');

  // Standardize separators & packaging
  n = n
    .replace(/\s*x\s*/g, '*')        // 3x1 → 3*1
    .replace(/\s*\*\s*/g, '*')
    .replace(/'lı\b/g, 'li')
    .replace(/'lu\b/g, 'lu')
    .replace(/'li\b/g, 'li')
    .replace(/'lü\b/g, 'lü')
    .replace(/-\s*/g, '');           // remove dashes for better match

  // Remove extra spaces & non-alphanumeric chars
  n = n.replace(/[^a-z0-9çğıöşü\* ]/gi, ' ').replace(/\s+/g, ' ').trim();

  // Strip fluff words AFTER non-alphanumerics are removed
  n = n
    .replace(/\bi çecek|içecek|icecek\b/g, '')
    .replace(/\bekonomik|avantaj|fırsat|firsat|hediyeli|bedava|yeni|özel|ekstra|extra\b/g, '')
    .replace(/\bplastik|poşet|poset|kutu|pet|şişe|sise|teneke|paket\b/g, '')
    .replace(/\bdoğal|dogal|taze|yöresel\b/g, '')
    .replace(/or[i]*j[i]*nal(\s*tat)?/g, '')
    .replace(/klasik|kola/g, '')
    .replace(/\s+/g, ' ').trim();

  return n;
}

// Generate base match string: Alphanumeric only, no spaces
export function getBaseMatchStr(normalized) {
  return normalized.replace(/[\s\*\-\.]/g, '');
}

// Helper: insert or update product and return product ID
export function upsertProduct(db, { name, brand, category, barcode, imageUrl, sourceUrl }) {
  const normalized = normalizeName(name);
  const matchStr = getBaseMatchStr(normalized);

  // 1. Try exact exact match first (Case sensitive)
  let existing = db.exec('SELECT id FROM products WHERE name = ?', [name]);

  // 2. Try Barcode match (STRONGEST match if provided)
  if ((!existing.length || !existing[0].values.length) && barcode) {
    existing = db.exec('SELECT id FROM products WHERE barcode = ?', [barcode]);
  }

  // 3. Try to find products that normalize to the EXACT same string
  if (!existing.length || !existing[0].values.length) {
    // We compute the base matched string dynamically for all db entries
    // Since REPLACE logic in SQLite can be messy for all cases, we extract 
    // it in memory if the DB isn't massive, but assuming we must use sql:
    const sqlLikeMatch = `%${matchStr.substring(0, Math.min(25, matchStr.length))}%`;
    const potentialMatches = db.exec(
      `SELECT id, name FROM products WHERE LOWER(REPLACE(REPLACE(name, ' ', ''), '-', '')) LIKE ?`,
      [sqlLikeMatch]
    );

    if (potentialMatches.length > 0 && potentialMatches[0].values.length > 0) {
      // Iterate through potentials in JS for safe matching
      for (const [id, dbName] of potentialMatches[0].values) {
        const dbNormMatchStr = getBaseMatchStr(normalizeName(dbName));

        // Check if they are basically identical stripped strings
        if (dbNormMatchStr === matchStr) {
          existing = [{ values: [[id]] }];
          break;
        }

        // Or if they overlap significantly (Length > 15) and start the exact same way 
        // covers (Coca Cola 1 L) vs (Coca Cola 1 Litre Kutu vs Pet matters, but let's assume they group if volume matches)
        if (matchStr.length > 15 && dbNormMatchStr.length > 15) {
          if (dbNormMatchStr.startsWith(matchStr) || matchStr.startsWith(dbNormMatchStr)) {
            existing = [{ values: [[id]] }];
            break;
          }
        }
      }
    }
  }

  if (existing && existing.length > 0 && existing[0].values.length > 0) {
    const id = existing[0].values[0][0];

    // Protection: Don't let suspicious data override good data
    const isInvalidCategory = category && category.startsWith('%');
    const isInvalidBarcode = barcode && barcode.startsWith('%');
    const isInvalidImageUrl = imageUrl && imageUrl.startsWith('%');

    db.run(`
      UPDATE products 
      SET 
        category = CASE WHEN category IS NULL OR ? = 0 THEN COALESCE(?, category) ELSE category END,
        barcode = CASE WHEN barcode IS NULL OR ? = 0 THEN COALESCE(barcode, ?) ELSE barcode END,
        image_url = CASE WHEN image_url IS NULL OR ? = 0 THEN COALESCE(?, image_url) ELSE image_url END,
        updated_at = datetime("now") 
      WHERE id = ?`,
      [
        isInvalidCategory ? 1 : 0, category || null,
        isInvalidBarcode ? 1 : 0, barcode || null,
        isInvalidImageUrl ? 1 : 0, imageUrl || null,
        id
      ]
    );
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

