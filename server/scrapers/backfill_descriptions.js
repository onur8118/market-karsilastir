import { getDb, saveDb } from '../db.js';
import * as cheerio from 'cheerio';

const MAX_CONCURRENT = 5;

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function fetchDescription(url) {
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

        let description = '';
        const descHeader = $('div, h2, h3, h4, h5').filter((_, el) => {
            const text = $(el).text().trim().toLowerCase();
            return text.includes('ürün açiklamosi') || text.includes('ürün açıklaması');
        });

        if (descHeader.length > 0) {
            description = descHeader.first().next('p').text().trim() ||
                descHeader.first().parent().find('p').first().text().trim() ||
                descHeader.first().closest('.card').find('.card-body p').text().trim();
        }

        if (!description) {
            const ps = $('p, div').filter((_, el) => {
                const t = $(el).text().trim();
                return t.includes('İçindekiler:') || t.includes('İçindekiler');
            });
            if (ps.length > 0) {
                let best = ps.first().text().trim();
                ps.each((_, el) => {
                    const text = $(el).text().trim();
                    if (text.length < best.length && text.length > 20) best = text;
                });

                description = best
                    .replace(/\\s+/g, ' ')
                    .replace(/(İçindekiler:|Saklama Koşulları:|Menşei:|Net Miktar:|Üretici:|Alerjen Uyarısı:|Gıda İşletmecisi)/g, '\\n- $1 ')
                    .replace(/([a-zğüşöçı])(İçindekiler|Saklama Koşulları|Menşei|Net Miktar|Üretici|Alerjen Uyarısı)/g, '$1\\n- $2')
                    .trim();
            }
        }

        return description && description.length < 1500 ? description : null;
    } catch (err) {
        return null; // Ignore fetch errors for robustness
    }
}

async function backfill() {
    const db = await getDb(true);
    console.log('🔄 Eksik açıklamalar tespit ediliyor...');

    // Get all products that have source URLs but NO description
    const results = db.exec(`
        SELECT id, name, source_url 
        FROM products 
        WHERE source_url IS NOT NULL 
        AND source_url LIKE '%marketkarsilastir%' 
        AND (description IS NULL OR description = '')
    `);

    if (!results.length || !results[0].values.length) {
        console.log('✅ Tüm ürünlerin açıklaması tamam!');
        return;
    }

    const items = results[0].values;
    const total = items.length;
    console.log(`📌 Toplam ${total} ürüne açıklama çekilecek. Bu işlem biraz sürebilir...`);

    let completed = 0;
    let found = 0;

    // Process in batches
    for (let i = 0; i < total; i += MAX_CONCURRENT) {
        const batch = items.slice(i, i + MAX_CONCURRENT);
        const promises = batch.map(async (row) => {
            const id = row[0];
            const name = row[1];
            const url = row[2];

            const desc = await fetchDescription(url);
            if (desc) {
                db.run('UPDATE products SET description = ? WHERE id = ?', [desc, id]);
                found++;
            } else {
                db.run('UPDATE products SET description = ? WHERE id = ?', ['Bilgi Yok', id]);
            }
            completed++;

            if (completed % 100 === 0) {
                console.log(`⏱️ İlerleme: ${completed}/${total} (Yeni bulunan açıklama: ${found})`);
                await saveDb(); // Periodically save
            }
        });

        await Promise.all(promises);
        await sleep(200); // Politeness delay
    }

    await saveDb();
    console.log(`\n🎉 BAŞARILI! Tarama tamamlandı.`);
    console.log(`📝 Eklenebilen yeni açıklama sayısı: ${found} / ${total}`);
}

backfill().catch(console.error);
