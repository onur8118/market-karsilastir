import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { getDb, insertPrice, saveDb } from './db.js';
import { fetchPriceByBarcode as fetchMigros } from './scrapers/migros.js';
import { fetchPriceByBarcode as fetchA101 } from './scrapers/a101.js';
import { fetchPriceByBarcode as fetchSok } from './scrapers/sok.js';
import { fetchPriceByBarcode as fetchCarrefoursa } from './scrapers/carrefoursa.js';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function updatePricesByBarcode() {
    console.log('\n🔄 Barkod Bazlı Fiyat Güncelleme (Faz 2) Başlıyor...');

    let browser;
    try {
        const db = await getDb();

        // Progress (Kuyruk) Takibi
        const progressFile = path.join(process.cwd(), 'server', 'progress_updater.json');
        let lastId = 0;
        if (fs.existsSync(progressFile)) {
            try { lastId = JSON.parse(fs.readFileSync(progressFile, 'utf8')).lastId || 0; } catch (e) { }
        }

        // Barkodu olan ürünleri lastId'den başlayarak çek (Her turda 250 adet)
        let result = db.exec(`SELECT id, name, barcode FROM products WHERE barcode IS NOT NULL AND barcode != '' AND length(barcode) >= 8 AND id > ${lastId} ORDER BY id ASC LIMIT 250`);

        // Sona ulaşıldıysa başa dön
        if (!result.length || !result[0].values.length) {
            console.log('🔄 Sona ulaşıldı, baştan başlanıyor...');
            lastId = 0;
            result = db.exec(`SELECT id, name, barcode FROM products WHERE barcode IS NOT NULL AND barcode != '' AND length(barcode) >= 8 AND id > 0 ORDER BY id ASC LIMIT 250`);

            if (!result.length || !result[0].values.length) {
                console.log('❌ Güncellenecek ürün yok.');
                return;
            }
        }

        const productsWithBarcode = result[0].values.map(row => ({
            id: row[0],
            name: row[1],
            barcode: row[2]
        }));

        console.log(`📌 Döngü sırası (LastID: ${lastId}). Bu turda ${productsWithBarcode.length} ürün güncellenecek.`);

        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        // Test amaçlı seçilen ürünleri kullanalım
        const testProducts = productsWithBarcode;

        for (const product of testProducts) {
            console.log(`\n🔎 Ürün inceleniyor: ${product.name} (Barkod: ${product.barcode})`);

            // Market Updaters Map
            const marketCheckers = [
                { id: 'migros', name: 'Migros', fetcher: fetchMigros },
                { id: 'a101', name: 'A101', fetcher: fetchA101 },
                { id: 'sok', name: 'ŞOK', fetcher: fetchSok },
                { id: 'carrefoursa', name: 'CarrefourSA', fetcher: fetchCarrefoursa }
            ];

            for (const market of marketCheckers) {
                console.log(`  ➔ ${market.name}'da aranıyor...`);
                const result = await market.fetcher(browser, product.barcode);
                if (result && result.price) {
                    console.log(`    ✅ ${market.name} Fiyatı: ${result.price} TL (Stokta: ${result.inStock})`);
                    insertPrice(db, {
                        productId: product.id,
                        marketId: market.id,
                        price: result.price
                    });
                } else {
                    console.log(`    ⚠️ ${market.name}'da bulunamadı veya tükendi.`);
                }
            }

            // En son başarılı işlenen ID'yi kaydet
            fs.writeFileSync(progressFile, JSON.stringify({ lastId: product.id }), 'utf8');

            await sleep(2000);
        }

        saveDb();
        console.log('\n✅ Barkod güncelleme testi tamamlandı, veritabanı kaydedildi.');

    } catch (err) {
        console.error('❌ Hata oluştu:', err);
    } finally {
        if (browser) await browser.close();
    }
}

// Direk çalıştırılırsa:
if (process.argv[1] && process.argv[1].includes('update_prices_by_barcode')) {
    updatePricesByBarcode().catch(console.error);
}
