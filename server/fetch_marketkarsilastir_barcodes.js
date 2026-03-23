import { getDb, saveDb } from './db.js';
import * as cheerio from 'cheerio';

const MAX_CONCURRENT = 5;

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function fetchBarcode(url) {
    try {
        const res = await fetch(url.replace('http://', 'https://'), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });
        if (!res.ok) return null;

        const html = await res.text();
        const $ = cheerio.load(html);

        let barcode = '';
        const barcodeLabel = $('div').filter((_, el) => {
            return $(el).text().trim() === 'Barkod Numarası';
        }).last();

        if (barcodeLabel.length > 0) {
            barcode = barcodeLabel.next('div').text().trim();
        }

        if (!barcode) {
            const index = html.indexOf('Barkod Numarası');
            if (index > -1) {
                const snippet = html.substring(index, index + 200);
                const match = snippet.match(/<div>(\d{8,14})<\/div>/);
                if (match) barcode = match[1];
            }
        }

        // Also fallback to a generic search for 8-14 digit numbers that could be barcodes
        if (!barcode) {
            const match = html.match(/>(\d{8,14})</);
            if (match) {
                // Check if it's near to 'Barkod' word
                const snippetObj = html.substring(Math.max(0, html.indexOf(match[1]) - 100), html.indexOf(match[1]) + 100);
                if (snippetObj.toLowerCase().includes('barkod') || snippetObj.toLowerCase().includes('barcode')) {
                    barcode = match[1];
                }
                else {
                    // Last resort: if no barcode found, maybe return nothing to skip
                }
            }
        }

        return barcode && /^\d{8,14}$/.test(barcode) ? barcode : null;
    } catch (err) {
        return null; // Ignore fetch errors for robustness
    }
}

async function backfill() {
    const db = await getDb(true);
    console.log('🔄 Eksik Barkodlar tespit ediliyor...');

    // Get all products that have source URLs but NO barcode
    const results = db.exec(`
        SELECT id, name, source_url 
        FROM products 
        WHERE source_url IS NOT NULL 
        AND source_url LIKE '%marketkarsilastir.com%' 
        AND (barcode IS NULL OR barcode = '' OR barcode = 'Bilgi Yok')
    `);

    if (!results.length || !results[0].values.length) {
        console.log('✅ Tüm marketkarsilastir ürünlerinin barkodu tamam!');
        return;
    }

    const items = results[0].values;
    const total = items.length;
    console.log(`📌 Toplam ${total} ürüne barkod çekilecek. Bu işlem biraz sürebilir...`);

    let completed = 0;
    let found = 0;

    // Process in batches
    for (let i = 0; i < total; i += MAX_CONCURRENT) {
        const batch = items.slice(i, i + MAX_CONCURRENT);
        const promises = batch.map(async (row) => {
            const id = row[0];
            const name = row[1];
            const url = row[2];

            const barcode = await fetchBarcode(url);
            if (barcode) {
                db.run('UPDATE products SET barcode = ? WHERE id = ?', [barcode, id]);
                found++;
                console.log(`[+] Barkod Bulundu: ${barcode} - ${name}`);
            } else {
                db.run('UPDATE products SET barcode = ? WHERE id = ?', ['Bilgi Yok', id]);
            }
            completed++;

            if (completed % 100 === 0) {
                console.log(`⏱️ İlerleme: ${completed}/${total} (Yeni bulunan: ${found})`);
                await saveDb(); // Periodically save
            }
        });

        await Promise.all(promises);
        await sleep(200); // Politeness delay
    }

    await saveDb();
    console.log(`\n🎉 BAŞARILI! Barkod taraması tamamlandı.`);
    console.log(`📝 Eklenebilen yeni barkod sayısı: ${found} / ${total}`);
}

backfill().catch(console.error);
