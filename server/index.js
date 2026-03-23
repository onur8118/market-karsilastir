import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { getDb, saveDb } from './db.js';
import { runAllScrapers, runSingleScraper } from './scrapers/index.js';
import { extractVolumeInfo, calculateUnitPrice } from './unit_converter.js';

const app = express();
const PORT = 3005;

app.use(cors());
app.use(express.json());

// ============================================
// API ROUTES
// ============================================

// GET /api/products — all products with latest prices
app.get('/api/products', async (req, res) => {
    try {
        const db = await getDb();
        const { q, category, market, brand, sort, page = 1, limit = 60 } = req.query;
        const offset = (page - 1) * limit;

        let queryCount = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      LEFT JOIN prices pr ON p.id = pr.product_id AND pr.date = (
        SELECT MAX(pr2.date) FROM prices pr2 WHERE pr2.product_id = p.id AND pr2.market_id = pr.market_id
      )
      WHERE pr.price IS NOT NULL AND p.image_url IS NOT NULL AND p.image_url != ''
    `;

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
      WHERE pr.price IS NOT NULL AND p.image_url IS NOT NULL AND p.image_url != ''
    `;

        const params = [];

        if (q) {
            let searchTerm = q.toLowerCase();
            // Normalize common search terms
            searchTerm = searchTerm.replace(/\bkola\b/g, 'cola');

            searchTerm = `%${searchTerm}%`;
            const searchClause = ` AND (LOWER(p.name) LIKE ? OR LOWER(p.brand) LIKE ? OR p.barcode LIKE ?)`;
            query += searchClause;
            queryCount += searchClause;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (category && category !== 'hepsi') {
            const catClause = ` AND p.category = ?`;
            query += catClause;
            queryCount += catClause;
            params.push(category);
        }

        if (brand) {
            const brandClause = ` AND p.brand = ?`;
            query += brandClause;
            queryCount += brandClause;
            params.push(brand);
        }

        if (market) {
            const marketClause = ` AND pr.market_id = ?`;
            query += marketClause;
            queryCount += marketClause;
            params.push(market);
        }

        // Get total count first
        const countResult = db.exec(queryCount, params);
        const total = countResult[0]?.values[0]?.[0] || 0;

        query += ` ORDER BY p.name, pr.price ASC`;

        // We need to fetch all matching products to group them correctly if we want perfect pagination,
        // but for now, let's just limit the raw rows and handle the grouping. 
        // Note: Grouping products after raw FETCH might be tricky with LIMIT if one product has multiple market prices.
        // A better way is to paginate the products first, then join prices.

        // Refined query for better pagination:
        let paginatedProductsQuery = `
            SELECT p.id
            FROM products p
            LEFT JOIN prices pr ON p.id = pr.product_id AND pr.date = (
                SELECT MAX(pr2.date) FROM prices pr2 WHERE pr2.product_id = p.id AND pr2.market_id = pr.market_id
            )
            WHERE pr.price IS NOT NULL AND p.image_url IS NOT NULL AND p.image_url != ''
        `;

        const paginatedParams = [];
        if (q) {
            let normQ = q.toLowerCase();
            normQ = normQ.replace(/\bkola\b/g, 'cola');
            const searchTerm = `%${normQ}%`;
            paginatedProductsQuery += ` 
                AND (
                    LOWER(p.name) LIKE ? 
                    OR LOWER(p.brand) LIKE ? 
                    OR p.barcode LIKE ?
                    OR p.id IN (
                        SELECT pr3.product_id 
                        FROM prices pr3 
                        JOIN markets m3 ON pr3.market_id = m3.id 
                        WHERE LOWER(m3.name) LIKE ?
                    )
                )`;
            paginatedParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }
        if (category && category !== 'hepsi') {
            paginatedProductsQuery += ` AND p.category = ?`;
            paginatedParams.push(category);
        }
        if (market) {
            paginatedProductsQuery += ` AND pr.market_id = ?`;
            paginatedParams.push(market);
        }
        if (brand) {
            paginatedProductsQuery += ` AND p.brand = ?`;
            paginatedParams.push(brand);
        }

        paginatedProductsQuery += ` GROUP BY p.id`;

        if (sort === 'price-asc') {
            paginatedProductsQuery += ` ORDER BY MIN(pr.price) ASC`;
        } else if (sort === 'price-desc') {
            paginatedProductsQuery += ` ORDER BY MIN(pr.price) DESC`;
        } else {
            paginatedProductsQuery += ` ORDER BY p.name ASC`;
        }

        paginatedProductsQuery += ` LIMIT ? OFFSET ?`;
        paginatedParams.push(parseInt(limit), parseInt(offset));

        const productIdsResult = db.exec(paginatedProductsQuery, paginatedParams);
        if (!productIdsResult || !productIdsResult.length || !productIdsResult[0].values || !productIdsResult[0].values.length) {
            return res.json({ products: [], pagination: { total, page: parseInt(page), limit: parseInt(limit), hasMore: false } });
        }

        const productIds = productIdsResult[0].values.map(v => v[0]);
        const idsPlaceholder = productIds.map(() => '?').join(',');

        const finalQuery = `
            SELECT 
                p.id, p.name, p.brand, p.category, p.barcode, p.image_url, p.source_url,
                pr.market_id, pr.price, pr.original_price, pr.date,
                m.name as market_name, m.color as market_color
            FROM products p
            LEFT JOIN prices pr ON p.id = pr.product_id AND pr.date = (
                SELECT MAX(pr2.date) FROM prices pr2 WHERE pr2.product_id = p.id AND pr2.market_id = pr.market_id
            )
            LEFT JOIN markets m ON pr.market_id = m.id
            WHERE p.id IN (${idsPlaceholder})
        `;

        const result = db.exec(finalQuery, productIds);

        if (!result.length || !result[0].values.length) {
            return res.json([]);
        }

        // Group by product (unified by barcode if possible)
        const productsMap = new Map();
        const columns = result[0].columns;

        for (const row of result[0].values) {
            const obj = {};
            columns.forEach((col, i) => obj[col] = row[i]);

            const groupKey = obj.barcode || `id_${obj.id}`;

            if (!productsMap.has(groupKey)) {
                productsMap.set(groupKey, {
                    id: obj.id, // Primary ID for the link
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
                const volInfo = extractVolumeInfo(obj.name);
                const unitPrice = calculateUnitPrice(obj.price, volInfo);

                // For the same market, keep only the cheapest price for this barcode group
                const currentGroup = productsMap.get(groupKey);
                const existingMarketPrice = currentGroup.prices.find(p => p.marketId === obj.market_id);

                if (!existingMarketPrice || existingMarketPrice.price > obj.price) {
                    if (existingMarketPrice) {
                        // Remove the more expensive one
                        currentGroup.prices = currentGroup.prices.filter(p => p.marketId !== obj.market_id);
                    }

                    currentGroup.prices.push({
                        marketId: obj.market_id,
                        marketName: obj.market_name,
                        marketColor: obj.market_color,
                        price: obj.price,
                        originalPrice: obj.original_price,
                        date: obj.date,
                        unitPrice: unitPrice
                    });
                }
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

        res.json({
            products,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                hasMore: offset + products.length < total
            }
        });
    } catch (err) {
        console.error('API hatası:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/search/suggestions — autocomplete suggestions
app.get('/api/search/suggestions', async (req, res) => {
    try {
        const db = await getDb();
        const { q } = req.query;
        if (!q || q.length < 2) return res.json([]);

        const searchTerm = `%${q.toLowerCase()}%`;
        const result = db.exec(`
            SELECT DISTINCT name, brand 
            FROM products 
            WHERE LOWER(name) LIKE ? OR LOWER(brand) LIKE ?
            ORDER BY name ASC 
            LIMIT 8
        `, [searchTerm, searchTerm]);

        if (!result.length || !result[0].values.length) {
            return res.json([]);
        }

        const suggestions = result[0].values.map(v => ({
            name: v[0],
            brand: v[1]
        }));

        res.json(suggestions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/products/:id — single product with price history
app.get('/api/products/:id', async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;

        // 1. Get current product info
        const productResult = db.exec('SELECT * FROM products WHERE id = ?', [id]);
        if (!productResult.length || !productResult[0].values.length) {
            return res.status(404).json({ error: 'Ürün bulunamadı' });
        }

        const cols = productResult[0].columns;
        const row = productResult[0].values[0];
        const product = {};
        cols.forEach((col, i) => product[col] = row[i]);

        // 2. Find all IDs sharing the same barcode or name
        let relatedIds = [id];
        if (product.barcode) {
            const relatedResult = db.exec('SELECT id FROM products WHERE barcode = ?', [product.barcode]);
            if (relatedResult.length && relatedResult[0].values.length) {
                relatedIds = relatedResult[0].values.map(v => v[0]);
            }
        }

        const idsPlaceholder = relatedIds.map(() => '?').join(',');

        // 3. Fetch latest prices for ALL related IDs
        const pricesResult = db.exec(`
            SELECT pr.*, m.name as market_name, m.color as market_color
            FROM prices pr
            JOIN markets m ON pr.market_id = m.id
            WHERE pr.product_id IN (${idsPlaceholder}) AND pr.date = (
                SELECT MAX(pr2.date) 
                FROM prices pr2 
                WHERE pr2.product_id = pr.product_id AND pr2.market_id = pr.market_id
            )
            ORDER BY pr.price ASC
        `, relatedIds);

        product.prices = [];
        if (pricesResult.length && pricesResult[0].values.length) {
            const pCols = pricesResult[0].columns;

            // Map and filter to group by market (take cheapest entry per market if multiple IDs match)
            const marketMap = new Map();

            pricesResult[0].values.forEach(r => {
                const obj = {};
                pCols.forEach((col, i) => obj[col] = r[i]);

                const volInfo = extractVolumeInfo(product.name);
                const unitPrice = calculateUnitPrice(obj.price, volInfo);

                const priceObj = {
                    marketId: obj.market_id,
                    marketName: obj.market_name,
                    marketColor: obj.market_color,
                    price: obj.price,
                    originalPrice: obj.original_price,
                    date: obj.date,
                    unitPrice: unitPrice
                };

                if (!marketMap.has(obj.market_id) || marketMap.get(obj.market_id).price > obj.price) {
                    marketMap.set(obj.market_id, priceObj);
                }
            });

            product.prices = Array.from(marketMap.values()).sort((a, b) => a.price - b.price);
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

        // Equivalent products (Muadiller)
        const equivalentsResult = db.exec(`
          SELECT 
            p.id, p.name, p.brand, p.category, p.image_url,
            pr.market_id, pr.price, m.name as market_name, m.color as market_color
          FROM product_equivalents pe
          JOIN products p ON (pe.equivalent_product_id = p.id OR pe.original_product_id = p.id)
          LEFT JOIN prices pr ON p.id = pr.product_id AND pr.date = (
            SELECT MAX(pr2.date) FROM prices pr2 WHERE pr2.product_id = p.id AND pr2.market_id = pr.market_id
          )
          LEFT JOIN markets m ON pr.market_id = m.id
          WHERE (pe.original_product_id = ? OR pe.equivalent_product_id = ?) AND p.id != ?
        `, [id, id, id]);

        product.equivalents = [];
        if (equivalentsResult.length && equivalentsResult[0].values.length) {
            const eMap = new Map();
            const eCols = equivalentsResult[0].columns;
            for (const row of equivalentsResult[0].values) {
                const obj = {};
                eCols.forEach((col, i) => obj[col] = row[i]);

                if (!eMap.has(obj.id)) {
                    eMap.set(obj.id, {
                        id: obj.id,
                        name: obj.name,
                        brand: obj.brand,
                        category: obj.category,
                        image_url: obj.image_url,
                        prices: []
                    });
                }
                if (obj.market_id) {
                    eMap.get(obj.id).prices.push({
                        marketId: obj.market_id,
                        marketName: obj.market_name,
                        marketColor: obj.market_color,
                        price: obj.price
                    });
                }
            }
            product.equivalents = Array.from(eMap.values());
        }

        res.json(product);
    } catch (err) {
        console.error('API hatası:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/products/:id/best-time — Best Time to Buy analysis
app.get('/api/products/:id/best-time', async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;

        // Get all historical prices for this product
        const histResult = db.exec(`
            SELECT pr.price, pr.date, pr.market_id, m.name as market_name, m.color as market_color
            FROM prices pr
            JOIN markets m ON pr.market_id = m.id
            WHERE pr.product_id = ?
            ORDER BY pr.date ASC
        `, [id]);

        if (!histResult.length || !histResult[0].values.length) {
            return res.json({ hasData: false });
        }

        const cols = histResult[0].columns;
        const entries = histResult[0].values.map(r => {
            const o = {};
            cols.forEach((c, i) => o[c] = r[i]);
            return o;
        });

        // === Analysis 1: Day of week cheapest ===
        const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        const byDay = {};
        entries.forEach(e => {
            const d = new Date(e.date).getDay();
            if (!byDay[d]) byDay[d] = { prices: [], day: d, name: dayNames[d] };
            byDay[d].prices.push(e.price);
        });
        const dayStats = Object.values(byDay).map(d => ({
            day: d.day,
            name: d.name,
            avgPrice: d.prices.reduce((a, b) => a + b, 0) / d.prices.length,
            count: d.prices.length
        })).sort((a, b) => a.avgPrice - b.avgPrice);

        // === Analysis 2: Monthly trend (last 12 months) ===
        const byMonth = {};
        entries.forEach(e => {
            const month = e.date.substring(0, 7); // YYYY-MM
            if (!byMonth[month]) byMonth[month] = [];
            byMonth[month].push(e.price);
        });
        const monthlyTrend = Object.entries(byMonth)
            .map(([month, prices]) => ({
                month,
                label: new Date(month + '-01').toLocaleDateString('tr-TR', { year: 'numeric', month: 'short' }),
                avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
                minPrice: Math.min(...prices),
                count: prices.length
            }))
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-12);

        // === Analysis 3: Cheapest market stats ===
        const byMarket = {};
        entries.forEach(e => {
            if (!byMarket[e.market_id]) {
                byMarket[e.market_id] = { marketId: e.market_id, marketName: e.market_name, marketColor: e.market_color, prices: [] };
            }
            byMarket[e.market_id].prices.push(e.price);
        });
        const marketStats = Object.values(byMarket).map(m => ({
            marketId: m.marketId,
            marketName: m.marketName,
            marketColor: m.marketColor,
            avgPrice: m.prices.reduce((a, b) => a + b, 0) / m.prices.length,
            minPrice: Math.min(...m.prices),
            maxPrice: Math.max(...m.prices),
            count: m.prices.length
        })).sort((a, b) => a.avgPrice - b.avgPrice);

        // === Analysis 4: Price trend (rising/falling/stable) ===
        let trend = 'stable';
        let trendPct = 0;
        if (monthlyTrend.length >= 2) {
            const first = monthlyTrend[0].avgPrice;
            const last = monthlyTrend[monthlyTrend.length - 1].avgPrice;
            trendPct = ((last - first) / first) * 100;
            if (trendPct > 3) trend = 'rising';
            else if (trendPct < -3) trend = 'falling';
        }

        // === Best recommendation ===
        const cheapestDay = dayStats[0];
        const cheapestMarket = marketStats[0];
        const currentMinPrice = Math.min(...entries.filter(e => e.date === entries[entries.length - 1].date).map(e => e.price));
        const allTimeMin = Math.min(...entries.map(e => e.price));
        const isNearAllTimeMin = currentMinPrice <= allTimeMin * 1.05;

        res.json({
            hasData: true,
            totalDataPoints: entries.length,
            trend,                   // 'rising', 'falling', 'stable'
            trendPct: parseFloat(trendPct.toFixed(1)),
            isNearAllTimeMin,
            allTimeMin,
            currentMinPrice,
            cheapestDay,
            cheapestMarket,
            dayStats,
            monthlyTrend,
            marketStats
        });
    } catch (err) {
        console.error('Best-time API hatası:', err);
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

// GET /api/brands — get unique brands
app.get('/api/brands', async (req, res) => {
    try {
        const db = await getDb();
        const result = db.exec(`
            SELECT DISTINCT brand 
            FROM products 
            WHERE brand IS NOT NULL AND brand != '' AND SUBSTR(brand, 1, 1) != '%'
            ORDER BY brand ASC
        `);
        if (!result.length || !result[0].values.length) return res.json([]);
        const brands = result[0].values.map(v => v[0]);
        res.json(brands);
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
