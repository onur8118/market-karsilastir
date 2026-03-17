/**
 * run-all-markets.js
 * Tüm marketleri sırayla çeker: ŞOK, A101, Migros, CarrefourSA
 * Her market için kendi sitesini doğrudan tarar — hiçbir ürün kaçmaz.
 */

import { getDb, saveDb } from './db.js';
import { scrapeSok } from './scrapers/sok.js';
import { scrapeA101 } from './scrapers/a101.js';
import { scrapeMigros } from './scrapers/migros.js';
import { scrapeCarrefoursa } from './scrapers/carrefoursa.js';
import { scrapeHappyCenter } from './scrapers/happycenter.js';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log('='.repeat(60));
    console.log('🛒 TÜM MARKETLER KAPSAMLI KAZIMA BAŞLIYOR');
    console.log('='.repeat(60));
    console.log('Sıra: ŞOK → A101 → Migros → CarrefourSA → Happy Center');
    console.log(`Başlangıç: ${new Date().toLocaleString('tr-TR')}\n`);

    const db = await getDb();
    const results = {};

    // 1. ŞOK
    try {
        console.log('\n' + '='.repeat(60));
        console.log('🟡 1/4 — ŞOK Market');
        console.log('='.repeat(60));
        results.sok = await scrapeSok(db);
        saveDb();
        console.log(`✅ ŞOK tamamlandı: ${results.sok.productsFound} ürün`);
    } catch (err) {
        console.error('❌ ŞOK genel hata:', err.message);
        results.sok = { productsFound: 0, pricesUpdated: 0, error: err.message };
    }

    await sleep(3000);

    // 2. A101
    try {
        console.log('\n' + '='.repeat(60));
        console.log('🔵 2/4 — A101');
        console.log('='.repeat(60));
        results.a101 = await scrapeA101(db);
        saveDb();
        console.log(`✅ A101 tamamlandı: ${results.a101.productsFound} ürün`);
    } catch (err) {
        console.error('❌ A101 genel hata:', err.message);
        results.a101 = { productsFound: 0, pricesUpdated: 0, error: err.message };
    }

    await sleep(3000);

    // 3. Migros
    try {
        console.log('\n' + '='.repeat(60));
        console.log('🟠 3/4 — Migros');
        console.log('='.repeat(60));
        results.migros = await scrapeMigros(db);
        saveDb();
        console.log(`✅ Migros tamamlandı: ${results.migros.productsFound} ürün`);
    } catch (err) {
        console.error('❌ Migros genel hata:', err.message);
        results.migros = { productsFound: 0, pricesUpdated: 0, error: err.message };
    }

    await sleep(3000);

    // 4. CarrefourSA
    try {
        console.log('\n' + '='.repeat(60));
        console.log('🔷 4/4 — CarrefourSA');
        console.log('='.repeat(60));
        results.carrefoursa = await scrapeCarrefoursa(db);
        saveDb();
        console.log(`✅ CarrefourSA tamamlandı: ${results.carrefoursa.productsFound} ürün`);
    } catch (err) {
        console.error('❌ CarrefourSA genel hata:', err.message);
        results.carrefoursa = { productsFound: 0, pricesUpdated: 0, error: err.message };
    }

    // 5. Happy Center
    try {
        console.log('\n' + '='.repeat(60));
        console.log('🟢 5/5 — Happy Center');
        console.log('='.repeat(60));
        results.happycenter = await scrapeHappyCenter(db);
        saveDb();
        console.log(`✅ Happy Center tamamlandı: ${results.happycenter.productsFound} ürün`);
    } catch (err) {
        console.error('❌ Happy Center genel hata:', err.message);
        results.happycenter = { productsFound: 0, pricesUpdated: 0, error: err.message };
    }

    // Özet
    console.log('\n' + '='.repeat(60));
    console.log('📊 KAZIMA ÖZET RAPORU');
    console.log('='.repeat(60));
    const markets = [
        { id: 'sok', label: '🟡 ŞOK' },
        { id: 'a101', label: '🔵 A101' },
        { id: 'migros', label: '🟠 Migros' },
        { id: 'carrefoursa', label: '🔷 CarrefourSA' },
        { id: 'happycenter', label: '🟢 Happy Center' },
    ];
    let grandTotal = 0;
    for (const m of markets) {
        const r = results[m.id] || {};
        const count = r.productsFound || 0;
        const err = r.error ? ` ❌ HATA: ${r.error}` : '';
        console.log(`  ${m.label}: ${count} ürün${err}`);
        grandTotal += count;
    }
    console.log(`\n  TOPLAM: ${grandTotal} ürün işlendi`);
    console.log(`  Bitiş: ${new Date().toLocaleString('tr-TR')}`);
    console.log('='.repeat(60));

    saveDb();
    console.log('\n✅ Tüm marketler tamamlandı. Veritabanı kaydedildi.');
}

main().catch(console.error);
