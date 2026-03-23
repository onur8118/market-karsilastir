import * as cheerio from 'cheerio';
import { getDb, saveDb, normalizeName, getBaseMatchStr } from './db.js';

const BASE_URL = 'https://marketkarsilastir.com';

const PRIVATE_LABEL_BRANDS = [
    // Bim
    'Dost', 'Bili Bili', 'Sole', 'Kaanlar', 'Emin', 'Krinkıl', 'Centro', 'Efsane', 'Siri', 'Lezita', 'Ekmekçik', 'Destan',
    // Şok
    'Mis', 'Piyale', 'Mintax', 'Amigo', 'Evin', 'Lio', 'Deren', 'Vatan', 'Kumsal', 'İnci', 'Bizim Vatan',
    // A101
    'Birşah', 'Vera', 'Baştacı', 'Ovadan', 'Çokça', 'Pervin', 'Torku', 'Milkten', 'Hadi'
];

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Custom chunking function
function chunkArray(array, size) {
    const chunked = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
}

// Function to fetch a single product's barcode with multi-attempt logic
async function processProduct(product) {
    const attemptSearch = async (query) => {
        const searchUrl = `${BASE_URL}/ara?q=${encodeURIComponent(query)}&type=name`;
        const controller = new AbortController();
        const timeout = setTimeout(() => { controller.abort() }, 15000); // 15 sec timeout

        try {
            const res = await fetch(searchUrl, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            clearTimeout(timeout);

            if (!res.ok) return null;

            const html = await res.text();
            const $ = cheerio.load(html);
            const productCards = $('.product-card-clickable');
            let foundBarcode = null;
            let foundName = null;

            if (productCards.length > 0) {
                productCards.each((_, el) => {
                    if (foundBarcode) return;
                    const $el = $(el);

                    // 1. Ürün ismini al
                    foundName = $el.find('.product-name, h6').first().text().trim();

                    // 2. Resimden veya linkten barkod çek (urunler/BARKOD.jpg veya /fiyat/BARKOD-isim)
                    const imgSrc = $el.find('img.product-image').attr('src');
                    const href = $el.find('a').attr('href');

                    if (imgSrc) {
                        const imgMatch = imgSrc.match(/\/(\d{8,14})\./);
                        if (imgMatch) foundBarcode = imgMatch[1];
                    }

                    if (!foundBarcode && href) {
                        const hrefMatch = href.match(/\/fiyat\/(\d{8,14})-/);
                        if (hrefMatch) foundBarcode = hrefMatch[1];
                    }

                    // 3. Butondaki addToCart parametresinden çek (Eğer resimden bulunamadıysa)
                    if (!foundBarcode) {
                        const onClick = $el.find('button.btn-add-to-cart').attr('onclick');
                        if (onClick) {
                            const clickMatch = onClick.match(/'(\d{8,14})'/);
                            if (clickMatch) foundBarcode = clickMatch[1];
                        }
                    }
                });
            }

            // Fallback: Tüm HTML'de ara
            if (!foundBarcode) {
                const globalMatch = html.match(/\/(\d{8,14})\.(jpg|png|webp)/) || html.match(/'(\d{8,14})'/);
                if (globalMatch) {
                    foundBarcode = globalMatch[1];
                    foundName = "(Global HTML'den)";
                }
            }

            return foundBarcode ? { foundBarcode, foundName } : null;
        } catch (err) {
            clearTimeout(timeout);
            return null;
        }
    };

    let searchQuery = product.name;
    if (product.brand && !product.name.toLowerCase().startsWith(product.brand.toLowerCase())) {
        searchQuery = `${product.brand} ${product.name}`;
    }
    searchQuery = searchQuery.trim();

    // Stage 1: Original
    let result = await attemptSearch(searchQuery);

    // Stage 2: Simplified (remove weight/volume)
    if (!result) {
        const simplified = searchQuery
            .replace(/\d+\s*(lt|ml|gr|g|kg|l|adet|lı|lu|li|lü|%)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (simplified !== searchQuery && simplified.length > 3) {
            result = await attemptSearch(simplified);
            if (result) result.isSimplified = true;
        }
    }

    // Stage 3: Aggressive (Marka + İlk 2 Kelime)
    if (!result && product.brand) {
        const words = product.name.split(' ').filter(w => w.length > 2);
        if (words.length > 0) {
            const aggressive = `${product.brand} ${words.slice(0, 2).join(' ')}`.trim();
            if (aggressive.length > 5) {
                result = await attemptSearch(aggressive);
                if (result) result.isAggressive = true;
            }
        }
    }

    // Stage 4: Ultra-Minimal (Only keywords, no numbers/units)
    if (!result) {
        const minimal = searchQuery
            .replace(/\d+/g, '')
            .replace(/[^\w\sİıŞşĞğÇçÖöÜü]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (minimal.length > 5 && minimal !== searchQuery) {
            result = await attemptSearch(minimal);
            if (result) result.isUltraMinimal = true;
        }
    }

    return result ? { ...result, product, searchQuery } : null;
}

async function fetchMissingBarcodes(limit = 0) {
    const db = await getDb();
    console.log('🔍 Eksik barkodlu ürünler aranıyor (AGRESİF MOD)...');

    let query = "SELECT id, name, brand, category FROM products WHERE (barcode IS NULL OR barcode = '') AND category != 'meyve-sebze'";
    // Öncelikli kategorileri başa al (atıştırmalık, içecek, temizlik vb.)
    query += " ORDER BY CASE WHEN category = 'atistirmalik' THEN 1 WHEN category = 'icecek' THEN 2 WHEN category = 'temizlik' THEN 3 WHEN category = 'kisisel-bakim' THEN 4 ELSE 5 END";
    if (limit > 0) query += ` LIMIT ${limit}`;

    const productsResult = db.exec(query);
    if (!productsResult.length || !productsResult[0].values) {
        console.log('✅ Barkodu eksik ürün bulunamadı.');
        return;
    }

    const products = productsResult[0].values.map(r => ({ id: r[0], name: r[1], brand: r[2], category: r[3] }));

    console.log(`Toplam Sorgulanacak: ${products.length} ürün.`);

    let updatedCount = 0;
    let notFoundCount = 0;

    const CONCURRENCY = 30;
    const SAVE_INTERVAL = 100;
    const chunks = chunkArray(products, CONCURRENCY);

    // SQLite Transaction başlat (Hız için kritik)
    db.run('BEGIN TRANSACTION');

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const progress = (i * CONCURRENCY) + chunk.length;
        process.stdout.write(`\r[${progress}/${products.length}] İşleniyor... `);

        const results = await Promise.all(chunk.map(product => processProduct(product)));

        for (const result of results) {
            if (result && result.foundBarcode) {
                db.run('UPDATE products SET barcode = ? WHERE id = ?', [result.foundBarcode, result.product.id]);
                updatedCount++;
                console.log(`\n✨ Added: ${result.product.name} -> ${result.foundBarcode} (Query: ${result.searchQuery})`);
            } else {
                notFoundCount++;
            }
        }

        // Belirli aralıklarla commit et ve kaydet
        if (progress % SAVE_INTERVAL === 0 || i === chunks.length - 1) {
            db.run('COMMIT');
            saveDb();
            db.run('BEGIN TRANSACTION'); // Yeni transaction başlat
        }
    }

    db.run('COMMIT'); // Kalanları kapat
    saveDb();
    console.log(`\n🎉 Bitti. ${updatedCount} eklendi, ${notFoundCount} bulunamadı.`);
}

const args = process.argv.slice(2);
const limitArgIndex = args.indexOf('--limit');
const limit = limitArgIndex > -1 ? parseInt(args[limitArgIndex + 1], 10) : 0;

fetchMissingBarcodes(limit).catch(console.error);
