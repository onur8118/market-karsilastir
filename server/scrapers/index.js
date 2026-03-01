import { getDb, saveDb } from '../db.js';
import { scrapeSok } from './sok.js';
import { scrapeA101 } from './a101.js';
import { scrapeMigros } from './migros.js';
import { scrapeCarrefoursa } from './carrefoursa.js';
import { scrapeMarketKarsilastir } from './marketkarsilastir.js';

const scrapers = {
    sok: { name: 'ŞOK', fn: scrapeSok },
    a101: { name: 'A101', fn: scrapeA101 },
    migros: { name: 'Migros', fn: scrapeMigros },
    carrefoursa: { name: 'CarrefourSA', fn: scrapeCarrefoursa },
    marketkarsilastir: { name: 'MarketKarsilastir', fn: scrapeMarketKarsilastir },
};

export async function runAllScrapers() {
    console.log('═══════════════════════════════════════════');
    console.log('  📡 FiyatRadar — Tüm Scraper\'lar Başlatılıyor');
    console.log('  ⏰ ' + new Date().toLocaleString('tr-TR'));
    console.log('═══════════════════════════════════════════');

    const db = await getDb();
    const results = {};

    for (const [id, scraper] of Object.entries(scrapers)) {
        const startedAt = new Date().toISOString();

        try {
            // Log start
            db.run(
                'INSERT INTO scrape_logs (market_id, status, started_at) VALUES (?, ?, ?)',
                [id, 'running', startedAt]
            );
            saveDb();

            const result = await scraper.fn(db);
            results[id] = { success: true, ...result };

            // Log success
            db.run(
                `UPDATE scrape_logs SET status = 'success', products_found = ?, prices_updated = ?, finished_at = datetime('now') 
         WHERE market_id = ? AND started_at = ?`,
                [result.productsFound, result.pricesUpdated, id, startedAt]
            );

        } catch (err) {
            console.error(`❌ ${scraper.name} hata:`, err.message);
            results[id] = { success: false, error: err.message };

            db.run(
                `UPDATE scrape_logs SET status = 'error', error = ?, finished_at = datetime('now')
         WHERE market_id = ? AND started_at = ?`,
                [err.message, id, startedAt]
            );
        }

        saveDb();
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('  📊 SONUÇLAR');
    console.log('═══════════════════════════════════════════');

    for (const [id, result] of Object.entries(results)) {
        const icon = result.success ? '✅' : '❌';
        const info = result.success
            ? `${result.productsFound} ürün, ${result.pricesUpdated} fiyat`
            : `HATA: ${result.error}`;
        console.log(`  ${icon} ${scrapers[id].name}: ${info}`);
    }

    // Total stats
    const totalProducts = db.exec('SELECT COUNT(*) FROM products');
    const totalPrices = db.exec('SELECT COUNT(*) FROM prices WHERE date = date("now")');

    console.log('\n  📦 Toplam ürün sayısı: ' + (totalProducts[0]?.values[0]?.[0] || 0));
    console.log('  💰 Bugünkü fiyat kaydı: ' + (totalPrices[0]?.values[0]?.[0] || 0));
    console.log('═══════════════════════════════════════════\n');

    return results;
}

export async function runSingleScraper(marketId) {
    if (!scrapers[marketId]) {
        throw new Error(`Bilinmeyen market: ${marketId}`);
    }

    const db = await getDb();
    const result = await scrapers[marketId].fn(db);
    saveDb();
    return result;
}
