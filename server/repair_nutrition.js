import puppeteer from 'puppeteer';
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'fiyatradar.db');

async function repairNutrition() {
    console.log('🧪 Besin Değeri Onarımı (Gelişmiş Bellek Modu) Başlıyor...');

    // 1. Load DB into Memory
    const SQL = await initSqlJs();
    if (!fs.existsSync(DB_PATH)) {
        console.error('❌ Veritabanı bulunamadı!');
        return;
    }
    const buffer = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(buffer);

    // 2. Get work list
    const query = `
        SELECT p.id, p.name, p.source_url 
        FROM products p
        JOIN prices pr ON p.id = pr.product_id
        WHERE (pr.market_id = 'migros' OR pr.market_id = 'sok')
          AND p.nutrition_carbs IS NULL
          AND p.source_url IS NOT NULL
        GROUP BY p.id
        LIMIT 10
    `;

    const result = db.exec(query);
    if (!result.length || !result[0].values.length) {
        console.log('✅ Onarılacak ürün kalmadı.');
        return;
    }

    const products = result[0].values.map(row => ({
        id: row[0],
        name: row[1],
        url: row[2]
    }));

    console.log(`📦 ${products.length} ürün işlenecek...`);

    // 3. Scrape Loop
    const browser = await puppeteer.launch({ headless: true });

    for (const p of products) {
        console.log(`🔍 ${p.name} inceleniyor...`);
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        try {
            await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 20000 });

            let data = { energy: null, carbs: null, protein: null, fat: null, ingredients: null };

            if (p.url.includes('migros.com.tr')) {
                await page.evaluate(() => {
                    const tabs = Array.from(document.querySelectorAll('.mdc-tab'));
                    const nutTab = tabs.find(t => t.textContent.includes('Besin Değerleri'));
                    if (nutTab) nutTab.click();
                });
                await new Promise(r => setTimeout(r, 1500));

                data = await page.evaluate(() => {
                    const findVal = (label) => {
                        const row = Array.from(document.querySelectorAll('tr, .nutrition-row'))
                            .find(r => r.textContent.toLowerCase().includes(label.toLowerCase()));
                        if (!row) return null;
                        const cells = row.querySelectorAll('td, span');
                        return cells.length > 1 ? cells[cells.length - 1].textContent.trim() : null;
                    };
                    const ingEl = Array.from(document.querySelectorAll('div, p'))
                        .find(el => el.textContent.includes('İçindekiler'));
                    return {
                        energy: findVal('Enerji'),
                        carbs: findVal('Karbonhidrat'),
                        protein: findVal('Protein'),
                        fat: findVal('Yağ'),
                        ingredients: ingEl?.nextElementSibling?.textContent?.trim() || null
                    };
                });
            }

            // 4. Update in-memory DB
            db.run(`
                UPDATE products 
                SET nutrition_energy = ?, nutrition_carbs = ?, nutrition_protein = ?, nutrition_fat = ?, ingredients = ?
                WHERE id = ?`,
                [data.energy, data.carbs, data.protein, data.fat, data.ingredients, p.id]
            );

            console.log(`   ✨ Güncellendi: ${data.carbs || '-'} g Karb`);

        } catch (err) {
            console.warn(`   ❌ Hata: ${err.message}`);
        } finally {
            await page.close();
        }
    }

    await browser.close();

    // 5. Final Save
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    console.log('✅ Veritabanı kaydedildi ve işlem tamamlandı.');
}

repairNutrition().catch(err => {
    console.error('💥 Kritik hata:', err);
    process.exit(1);
});
