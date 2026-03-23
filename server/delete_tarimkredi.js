import { getDb, saveDb } from './db.js';

const db = await getDb();

// Delete prices for tarimkredi market
const pricesBefore = db.exec("SELECT COUNT(*) FROM prices WHERE market_id = 'tarimkredi'");
const priceCount = pricesBefore[0]?.values[0][0] || 0;

db.run("DELETE FROM prices WHERE market_id = 'tarimkredi'");

// Delete orphan products (products that only had tarimkredi prices)
db.run(`
  DELETE FROM products 
  WHERE id NOT IN (SELECT DISTINCT product_id FROM prices)
`);

// Delete the market itself
db.run("DELETE FROM markets WHERE id = 'tarimkredi'");

saveDb();

const marketsLeft = db.exec("SELECT id, name FROM markets ORDER BY id");
console.log('✅ Tarım Kredi silindi!');
console.log(`   Fiyat silindi: ${priceCount}`);
console.log('📋 Kalan marketler:', marketsLeft[0]?.values.map(r => r[1]).join(', '));
