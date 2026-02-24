import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { getDb, saveDb } from './db.js';
import { runAllScrapers, runSingleScraper } from './scrapers/index.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ============================================
// API ROUTES
// ============================================

// GET /api/products — all products with latest prices
app.get('/api/products', async (req, res) => {
    try {
        const db = await getDb();
        const { q, category, market, sort } = req.query;

        let query = `
      SELECT 
        p.id, p.name, p.brand, p.category, p.barcode, p.image_url, p.source_url,
        pr.market_id, pr.price, pr.original_price, pr.date,
        m.name as market_name, m.color as market_color
      FROM products p
      LEFT JOIN prices pr ON p.id = pr.product_id AND pr.date = (
        SELECT MAX(pr2.date) FROM prices pr2 WHERE pr2.product_id = p.id AND pr2.market_id = pr.market_id
      )
      LEFT JOIN markets m ON pr.market_id = m.id
      WHERE 1=1
    `;

        const params = [];

        if (q) {
            query += ` AND (LOWER(p.name) LIKE ? OR LOWER(p.brand) LIKE ? OR p.barcode LIKE ?)`;
            const searchTerm = `%${q.toLowerCase()}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (category && category !== 'hepsi') {
            query += ` AND p.category = ?`;
            params.push(category);
        }

        if (market) {
            query += ` AND pr.market_id = ?`;
            params.push(market);
        }

        query += ` ORDER BY p.name, pr.price ASC`;

        const result = db.exec(query, params);

        if (!result.length || !result[0].values.length) {
            return res.json([]);
        }

        // Group by product
        const productsMap = new Map();
        const columns = result[0].columns;

        for (const row of result[0].values) {
            const obj = {};
            columns.forEach((col, i) => obj[col] = row[i]);

            if (!productsMap.has(obj.id)) {
                productsMap.set(obj.id, {
                    id: obj.id,
                    name: obj.name,
                    brand: obj.brand,
                    category: obj.category,
                    barcode: obj.barcode,
                    image_url: obj.image_url,
                    source_url: obj.source_url,
                    prices: [],
                });
            }

            if (obj.market_id && obj.price) {
                productsMap.get(obj.id).prices.push({
                    marketId: obj.market_id,
                    marketName: obj.market_name,
                    marketColor: obj.market_color,
                    price: obj.price,
                    originalPrice: obj.original_price,
                    date: obj.date,
                });
            }
        }

        let products = Array.from(productsMap.values())
            .filter(p => p.prices.length > 0); // Only products with prices

        // Sort
        if (sort === 'price-asc') {
            products.sort((a, b) => Math.min(...a.prices.map(p => p.price)) - Math.min(...b.prices.map(p => p.price)));
        } else if (sort === 'price-desc') {
            products.sort((a, b) => Math.min(...b.prices.map(p => p.price)) - Math.min(...a.prices.map(p => p.price)));
        } else if (sort === 'discount') {
            products.sort((a, b) => {
                const discA = a.prices.length > 1 ? (Math.max(...a.prices.map(p => p.price)) - Math.min(...a.prices.map(p => p.price))) / Math.max(...a.prices.map(p => p.price)) : 0;
                const discB = b.prices.length > 1 ? (Math.max(...b.prices.map(p => p.price)) - Math.min(...b.prices.map(p => p.price))) / Math.max(...b.prices.map(p => p.price)) : 0;
                return discB - discA;
            });
        }

        res.json(products);
    } catch (err) {
        console.error('API hatası:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/products/:id — single product with price history
app.get('/api/products/:id', async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;

        // Product info
        const productResult = db.exec('SELECT * FROM products WHERE id = ?', [id]);
        if (!productResult.length || !productResult[0].values.length) {
            return res.status(404).json({ error: 'Ürün bulunamadı' });
        }

        const cols = productResult[0].columns;
        const row = productResult[0].values[0];
        const product = {};
        cols.forEach((col, i) => product[col] = row[i]);

        // Current prices
        const pricesResult = db.exec(`
      SELECT pr.*, m.name as market_name, m.color as market_color
      FROM prices pr
      JOIN markets m ON pr.market_id = m.id
      WHERE pr.product_id = ? AND pr.date = (
        SELECT MAX(pr2.date) FROM prices pr2 WHERE pr2.product_id = ? AND pr2.market_id = pr.market_id
      )
      ORDER BY pr.price ASC
    `, [id, id]);

        product.prices = [];
        if (pricesResult.length && pricesResult[0].values.length) {
            const pCols = pricesResult[0].columns;
            product.prices = pricesResult[0].values.map(r => {
                const obj = {};
                pCols.forEach((col, i) => obj[col] = r[i]);
                return {
                    marketId: obj.market_id,
                    marketName: obj.market_name,
                    marketColor: obj.market_color,
                    price: obj.price,
                    originalPrice: obj.original_price,
                    date: obj.date,
                };
            });
        }

        // Price history (last 30 days, grouped by date)
        const historyResult = db.exec(`
      SELECT pr.date, pr.price, m.name as market_name
      FROM prices pr
      JOIN markets m ON pr.market_id = m.id
      WHERE pr.product_id = ?
      ORDER BY pr.date ASC
    `, [id]);

        product.priceHistory = [];
        if (historyResult.length && historyResult[0].values.length) {
            const hCols = historyResult[0].columns;
            product.priceHistory = historyResult[0].values.map(r => {
                const obj = {};
                hCols.forEach((col, i) => obj[col] = r[i]);
                return { date: obj.date, price: obj.price, market: obj.market_name };
            });
        }

        res.json(product);
    } catch (err) {
        console.error('API hatası:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/markets
app.get('/api/markets', async (req, res) => {
    try {
        const db = await getDb();
        const result = db.exec('SELECT * FROM markets');
        if (!result.length) return res.json([]);

        const cols = result[0].columns;
        const markets = result[0].values.map(row => {
            const obj = {};
            cols.forEach((col, i) => obj[col] = row[i]);
            return obj;
        });
        res.json(markets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/categories
app.get('/api/categories', async (req, res) => {
    try {
        const db = await getDb();
        const result = db.exec('SELECT * FROM categories');
        if (!result.length) return res.json([]);

        const cols = result[0].columns;
        const categories = result[0].values.map(row => {
            const obj = {};
            cols.forEach((col, i) => obj[col] = row[i]);
            return obj;
        });
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/stats
app.get('/api/stats', async (req, res) => {
    try {
        const db = await getDb();
        const products = db.exec('SELECT COUNT(*) FROM products');
        const prices = db.exec('SELECT COUNT(DISTINCT product_id || market_id) FROM prices WHERE date = date("now")');
        const markets = db.exec('SELECT COUNT(*) FROM markets');

        const lastScrape = db.exec('SELECT MAX(finished_at) FROM scrape_logs WHERE status = "success"');

        res.json({
            totalProducts: products[0]?.values[0]?.[0] || 0,
            todayPrices: prices[0]?.values[0]?.[0] || 0,
            totalMarkets: markets[0]?.values[0]?.[0] || 0,
            lastScrape: lastScrape[0]?.values[0]?.[0] || null,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/scrape — trigger manual scrape
app.post('/api/scrape', async (req, res) => {
    const { market } = req.body;
    try {
        if (market) {
            const result = await runSingleScraper(market);
            res.json({ success: true, market, ...result });
        } else {
            const results = await runAllScrapers();
            res.json({ success: true, results });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/scrape/logs — get scrape history
app.get('/api/scrape/logs', async (req, res) => {
    try {
        const db = await getDb();
        const result = db.exec('SELECT * FROM scrape_logs ORDER BY started_at DESC LIMIT 50');
        if (!result.length) return res.json([]);

        const cols = result[0].columns;
        const logs = result[0].values.map(row => {
            const obj = {};
            cols.forEach((col, i) => obj[col] = row[i]);
            return obj;
        });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// CRON — auto scrape every 6 hours
// ============================================
cron.schedule('0 */6 * * *', async () => {
    console.log('\n⏰ Zamanlanmış scrape başlatılıyor...');
    try {
        await runAllScrapers();
    } catch (err) {
        console.error('Zamanlanmış scrape hatası:', err);
    }
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, async () => {
    // Initialize database
    await getDb();

    console.log('═══════════════════════════════════════════');
    console.log(`  📡 FiyatRadar API Server`);
    console.log(`  🌐 http://localhost:${PORT}`);
    console.log(`  ⏰ Otomatik güncelleme: Her 6 saatte`);
    console.log('═══════════════════════════════════════════');
    console.log('\n  Endpoints:');
    console.log('  GET  /api/products       — Tüm ürünler');
    console.log('  GET  /api/products/:id   — Ürün detay + fiyat geçmişi');
    console.log('  GET  /api/markets        — Marketler');
    console.log('  GET  /api/categories     — Kategoriler');
    console.log('  GET  /api/stats          — İstatistikler');
    console.log('  POST /api/scrape         — Manuel scrape başlat');
    console.log('  GET  /api/scrape/logs    — Scrape geçmişi');
    console.log('');
});
