
import * as cheerio from 'cheerio';
import { upsertProduct, insertPrice, saveDb, getDb } from '../db.js';

const CATEGORIES = [
    'atistirmalik', 'bebek-anne', 'deterjan-temizlik', 'dondurma', 'elektronik',
    'et-tavuk-balik', 'ev-yasam', 'kitap-kirtasiye-oyuncak', 'kisisel-bakim-kozmetik',
    'meyve-sebze', 'meze-hazir-yemek-donuk', 'pet-shop', 'sut-kahvaltilik',
    'temel-gida', 'unlu-mamul-pasta', 'cicek-bahce'
];

const BASE_URL = 'https://marketkarsilastir.com';

const CATEGORY_MAP = {
    'atistirmalik': 'atistirmalik',
    'bebek-anne': 'bebek',
    'deterjan-temizlik': 'temizlik',
    'dondurma': 'atistirmalik',
    'elektronik': 'temel-gida', // Fallback
    'et-tavuk-balik': 'et-tavuk',
    'ev-yasam': 'temel-gida', // Fallback
    'kitap-kirtasiye-oyuncak': 'temel-gida', // Fallback
    'kisisel-bakim-kozmetik': 'kisisel-bakim',
    'meyve-sebze': 'meyve-sebze',
    'meze-hazir-yemek-donuk': 'dondurulmus',
    'pet-shop': 'temel-gida', // Fallback
    'sut-kahvaltilik': 'sut-urunleri',
    'temel-gida': 'temel-gida',
    'unlu-mamul-pasta': 'temel-gida',
    'cicek-bahce': 'temel-gida'
};

const MARKET_ID_MAP = {
    'A101': 'a101',
    'Bim': 'bim',
    'Şok': 'sok',
    'Migros': 'migros',
    'CarrefourSA': 'carrefoursa',
    'Happy Center': 'happycenter',
    'Onur Market': 'onur',
    'Bizim': 'bizim',
    'File': 'file',
    'Metro': 'metro',
    'Tarım Kredi': 'tarimkredi'
};

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeProductDetails(db, productUrl, productData, stats) {
    try {
        const res = await fetch(productUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        if (!res.ok) return;
        const html = await res.text();
        const $ = cheerio.load(html);

        // Extract name, brand, and image if not provided
        if (!productData.name) {
            productData.name = $('h2').first().text().trim() || $('h1').first().text().trim();
            if (!productData.name) return; // Skip if still no name
        }

        if (!productData.brand) {
            productData.brand = '';
        }

        if (!productData.imageUrl) {
            let img = $('img').first().attr('src');
            productData.imageUrl = img && (img.startsWith('http') ? img : `${BASE_URL}${img}`);
        }

        const productId = upsertProduct(db, productData);
        if (productId && stats) stats.productsFound++;

        // 1. Try div-based structure (Current Prices)
        const priceItems = $('.price-item');
        if (priceItems.length > 0) {
            priceItems.each((_, el) => {
                const $el = $(el);

                // Get the market name from the first span or image alt text
                let marketName = $el.find('.market-name span').first().text().trim();
                if (!marketName) {
                    marketName = $el.find('.market-name img').attr('alt') || '';
                }

                const priceStr = $el.find('.price-amount').text().trim() || $el.find('.price').text().trim();

                const cleanMarketName = marketName.split(/\s+/)[0];
                const marketId = MARKET_ID_MAP[cleanMarketName] || MARKET_ID_MAP[marketName];

                if (marketId && priceStr) {
                    const priceMatch = priceStr.match(/(\d{1,5}[,\.]\d{2})/);
                    if (priceMatch) {
                        const price = parseFloat(priceMatch[1].replace(',', '.'));
                        console.log(`      💰 Fiyat (Güncel): ${marketId} -> ${price} TL`);
                        insertPrice(db, {
                            productId,
                            marketId,
                            price,
                            originalPrice: null
                        });
                        if (stats) stats.pricesUpdated++;
                    }
                } else {
                    if (priceStr) console.log(`      ⚠️ Bilinmeyen market veya okunamadı: ${marketName}`);
                }
            });
        } else {
            // 2. Fallback to table structure ONLY IF no current prices section exists
            // Since the table is history, we only want the LATEST price per market.
            const seenMarkets = new Set();
            $('table.table tr').each((_, row) => {
                const marketName = $(row).find('td').eq(1).text().trim() || $(row).find('td').first().text().trim();
                const priceStr = $(row).find('td.text-end').text().trim();

                const cleanMarketName = marketName.split(/\s+/)[0];
                const marketId = MARKET_ID_MAP[cleanMarketName] || MARKET_ID_MAP[marketName];

                if (marketId && priceStr && !seenMarkets.has(marketId)) {
                    seenMarkets.add(marketId);
                    const priceMatch = priceStr.match(/(\d{1,5}[,\.]\d{2})/);
                    if (priceMatch) {
                        const price = parseFloat(priceMatch[1].replace(',', '.'));
                        console.log(`      💰 Fiyat (Tablo/Tarihçe): ${marketId} -> ${price} TL`);
                        insertPrice(db, {
                            productId,
                            marketId,
                            price,
                            originalPrice: null
                        });
                        if (stats) stats.pricesUpdated++;
                    }
                }
            });
        }
    } catch (err) {
        console.warn(`    ❌ Ürün detayı hatası: ${productUrl}`, err.message);
    }
}

export async function scrapeMarketKarsilastir() {
    console.log('\n🚀 MarketKarsilastir.com scraping başlıyor...');
    const db = await getDb();
    const stats = { productsFound: 0, pricesUpdated: 0 };

    for (const catSlug of CATEGORIES) {
        console.log(`\n📂 Kategori: ${catSlug}`);
        const category = CATEGORY_MAP[catSlug] || 'temel-gida';

        let page = 1;
        while (page <= 500) { // Crawl up to 500 pages per category to avoid skipping any products
            const url = `${BASE_URL}/kategori/${catSlug}?page=${page}`;
            console.log(`  📄 Sayfa ${page}: ${url}`);

            try {
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                });

                if (!response.ok) break;

                const html = await response.text();

                // Extract /fiyat/ links using regex since they are in a JSON blob
                const allFiyatLinksRaw = html.match(/\/fiyat\/([\w-]+)/g);
                if (!allFiyatLinksRaw || allFiyatLinksRaw.length === 0) break;

                const uniqueLinks = [...new Set(allFiyatLinksRaw)];

                // Process in batches of 5 to avoid overwhelming the server locally
                const BATCH_SIZE = 5;
                for (let i = 0; i < uniqueLinks.length; i += BATCH_SIZE) {
                    const batch = uniqueLinks.slice(i, i + BATCH_SIZE);

                    for (const link of batch) {
                        const fullProductUrl = `${BASE_URL}${link}`;
                        const eanMatch = link.match(/\/fiyat\/(\d{8,14})-/);
                        const barcode = eanMatch ? eanMatch[1] : null;

                        console.log(`    🔍 Ürün URL: ${fullProductUrl}`);
                        await scrapeProductDetails(db, fullProductUrl, {
                            // We will extract these from the product page now
                            name: '',
                            brand: '',
                            category,
                            barcode,
                            imageUrl: '',
                            sourceUrl: fullProductUrl
                        }, stats);
                    }
                    await sleep(500); // Batch rate limit
                }

                page++;
                if (page % 5 === 0) saveDb();
                await sleep(1000); // Page rate limit
            } catch (err) {
                console.warn(`    ❌ Sayfa hatası: ${url}`, err.message);
                break;
            }
        }

        saveDb(); // Save after each category
    }

    console.log('\n✅ MarketKarsilastir.com tamamlandı.');
    return stats;
}

// If run directly
if (process.argv[1].includes('marketkarsilastir.js')) {
    scrapeMarketKarsilastir().catch(console.error);
}
